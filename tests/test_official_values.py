"""Every official value shown by the UI still matches the team package (metrics.json -> tables).

Reads ../Big-Data/metrics/releases/tv2-20261124/metrics.json (the source of truth). Skips if the
team repo is not checked out next to this repo. Also checks every public/*.json stays < 300 KB.
"""
import json
import math
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT.parent / "Big-Data" / "metrics" / "releases" / "tv2-20261124" / "metrics.json"


def leaves(value, path=()):
    if isinstance(value, dict):
        for key, item in value.items():
            yield from leaves(item, path + (key,))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from leaves(item, path + (index,))
    else:
        yield path, value


def same(a, b):
    if isinstance(a, float) or isinstance(b, float):
        return a is not None and b is not None and math.isclose(a, b, rel_tol=0, abs_tol=0)
    return a == b


class OfficialValuesTest(unittest.TestCase):
    @unittest.skipUnless(PACKAGE.exists(), "team repo not checked out next to this repo")
    def test_all_table_values_match_metrics_json(self):
        package = json.loads(PACKAGE.read_text(encoding="utf8"))["tables"]
        public = json.loads((ROOT / "public" / "official-results.json").read_text(encoding="utf8"))["tables"]
        expected = list(leaves(package))
        shown = dict(leaves(public))
        mismatched = [path for path, value in expected if not same(shown.get(path, object()), value)]
        self.assertEqual(mismatched, [])
        self.assertEqual(len(expected), 262, "number of official leaf values in tables E1-E5")
        print(f"\nofficial values matched: {len(expected) - len(mismatched)}/{len(expected)}")

    def test_public_json_files_are_small(self):
        for path in sorted((ROOT / "public").glob("*.json")):
            self.assertLess(path.stat().st_size, 300_000, path.name)


if __name__ == "__main__":
    unittest.main()
