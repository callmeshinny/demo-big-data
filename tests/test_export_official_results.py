"""Run with PYTHONPATH=../Big-Data:scripts python3 -m unittest discover -s tests."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT.parent / "Big-Data/metrics/releases/tv2-20261124"
TEAM_ROOT = ROOT.parent / "Big-Data"
SCRIPT = ROOT / "scripts/export_official_results.py"


class OfficialResultsExportTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.workspace = Path(self.temp.name)

    def run_export(self, package, output):
        return subprocess.run(
            ["python3", str(SCRIPT), "--package", str(package), "--output", str(output)],
            cwd=ROOT, text=True, capture_output=True,
        )

    def test_export_copies_official_values_and_records_exception(self):
        output = self.workspace / "official.json"
        result = self.run_export(PACKAGE, output)
        self.assertEqual(result.returncode, 0, result.stderr)
        data = json.loads(output.read_text())
        self.assertEqual(data["tables"]["E1"][2]["Recall@20"], 0.12490650710545999)
        e4 = next(row for row in data["tables"]["E4"] if row["run_id"] == "e4-full-010-csv")
        self.assertEqual(e4["bytes"], 134004153)
        self.assertEqual(len(data["tables"]["E5"]), 4)
        popularity = next(row for row in data["tables"]["E1"] if row["run_id"] == "e1-popularity-010")
        self.assertIsNone(popularity["sampled_gpu_process_bytes"])
        self.assertEqual(popularity["sampled_gpu_status"], "unavailable")
        self.assertEqual(data["team_commit"], subprocess.check_output(
            ["git", "-C", str(TEAM_ROOT), "rev-parse", "--short", "HEAD"], text=True,
        ).strip())
        self.assertEqual(data["known_checksum_exceptions"], [{
            "file": "environment/README.md",
            "reason": "TV3 doc edit after packaging (team commit 88f7e02), log links only",
        }])

    def test_changed_package_byte_fails_checksum(self):
        copied_root = self.workspace / "Big-Data"
        package_copy = copied_root / "metrics/releases/tv2-20261124"
        package_copy.mkdir(parents=True)
        shutil.copy2(PACKAGE / "manifest.json", package_copy / "manifest.json")
        for group in json.loads((PACKAGE / "manifest.json").read_text())["files_sha256"].values():
            for relative in group:
                source = TEAM_ROOT / relative
                destination = copied_root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, destination)
        target = package_copy / "E1.csv"
        target.write_bytes(target.read_bytes() + b"x")
        output = self.workspace / "bad.json"
        result = self.run_export(package_copy, output)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Checksum mismatch in package group", result.stderr)


if __name__ == "__main__":
    unittest.main()
