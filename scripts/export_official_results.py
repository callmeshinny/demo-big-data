"""Export the checksum-verified TV2 official results package."""
import argparse
from collections import Counter
import hashlib
import json
import subprocess
from datetime import date
from pathlib import Path

KNOWN_CHECKSUM_EXCEPTIONS = {
    "environment/README.md": "TV3 doc edit after packaging (team commit 88f7e02), log links only",
}
VM_ENVIRONMENT_VALUES = {
    "cloud": "VM AWS Ubuntu 22.04",
    "gpu": "Tesla T4 (compute capability 7.5)",
    "vram": "15360 MiB",
    "cpu": "Intel Xeon Platinum 8259CL @ 2.50GHz",
    "vcpu": "8 vCPU",
    "ram": "30,98 GiB",
    "os": "Ubuntu 22.04.5 LTS",
    "kernel": "6.8.0-1036-aws",
    "driver": "570.172.08",
    "cuda_toolkit": "12.1.105",
    "docker": "28.4.0",
    "image": "merlin-pytorch:23.12",
}


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def verify_checksums(package_root):
    manifest = read_json(package_root / "manifest.json")
    exceptions = []
    for group, files in manifest["files_sha256"].items():
        for relative, expected in files.items():
            path = package_root.parent.parent.parent / relative
            if not path.is_file():
                raise ValueError(f"Manifest file is missing: {relative}")
            content = path.read_bytes().replace(b"\r\n", b"\n")
            actual = hashlib.sha256(content).hexdigest()
            if actual == expected:
                continue
            if group == "runtime" and relative in KNOWN_CHECKSUM_EXCEPTIONS:
                exceptions.append({"file": relative, "reason": KNOWN_CHECKSUM_EXCEPTIONS[relative]})
                continue
            raise ValueError(f"Checksum mismatch in {group} group: {relative}")
    return manifest, exceptions


def read_vm_environment(team_root):
    readme = team_root / "environment/README.md"
    content = readme.read_text(encoding="utf-8")
    environment = {}
    for field, value in VM_ENVIRONMENT_VALUES.items():
        if value not in content:
            raise ValueError(f"Required vm_environment.{field} substring not found in {readme}: {value!r}")
        environment[field] = value
    environment["source"] = "environment/README.md (team 88f7e02)"
    environment["checksum_note"] = "file edited by TV3 after packaging; links only, values unchanged"
    return environment


def export(package_root):
    manifest, exceptions = verify_checksums(package_root)
    metrics = read_json(package_root / "metrics.json")
    configs_source = read_json(package_root / "configs.json")
    registry = read_json(package_root / "run_registry.json")
    registry_status_counts = Counter(row["status"] for row in registry["runs"])
    dictionary = read_json(package_root / "data_dictionary.json")
    vm_environment = read_vm_environment(package_root.parents[2])

    configs = {}
    for run_id, config in configs_source.items():
        metadata = config.get("run_metadata", {})
        artifacts = config.get("artifacts", {})
        catalog = artifacts.get("catalog", {})
        configs[run_id] = {
            "planned": metadata.get("run"),
            "actual": config.get("effective_config"),
            "training_config": config.get("training_config"),
            "split_counts": config.get("split_counts"),
            "versions": metadata.get("versions"),
            "catalog_sha256": catalog.get("sha256"),
            "runtime": config.get("runtime"),
            "warmup": config.get("warmup"),
            "cache": config.get("cache"),
            "source_run": config.get("source_run"),
            "source_metrics": config.get("source_metrics"),
        }
    return {
        "schema": "tv4-official-results/v1",
        "package_id": manifest["package_id"],
        "confirmed_by_tv2": True,
        "data_kind": metrics["data_kind"],
        "team_commit": subprocess.run(
            ["git", "-C", str(package_root.parents[2]), "rev-parse", "--short", "HEAD"],
            check=True, capture_output=True, text=True,
        ).stdout.strip(),
        "generated_at": date.today().isoformat(),
        "known_checksum_exceptions": exceptions,
        "run_registry_summary": {
            "passed": registry_status_counts.get("passed", 0),
            "derived_from_verified_E2": registry_status_counts.get("derived_from_verified_E2", 0),
            "excluded": len(registry["excluded"]),
        },
        "limits": manifest["limits"],
        "dictionary": dictionary,
        "excluded": registry["excluded"],
        "tables": metrics["tables"],
        "configs": configs,
        "vm_environment": vm_environment,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--package", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("public/official-results.json"))
    args = parser.parse_args()
    try:
        payload = export(args.package.resolve())
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"Official results export failed: {error}\n")


if __name__ == "__main__":
    main()
