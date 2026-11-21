"""Export the TV1 dataset overview. Run from the team checkout."""
import argparse
import csv
from datetime import date
import json
from pathlib import Path

from export_run_results import team_commit

AUDIT = Path("data/raw_audit.csv")
VERIFIED = Path("data/manifests/e2_preprocessing_verified.json")
SMOKE = VERIFIED.with_name("e4_preprocessing_smoke.json")
SUBSETS = (10, 25, 50, 100)
FIELDS = (
    "n_events", "events_after_repeat_removal", "distinct", "missing", "event_types",
    "session_length_histogram", "sequence_count", "vocabulary_size",
)
TIMINGS = (
    "preprocessing_seconds", "read_seconds", "workflow_seconds", "split_seconds",
    "input_format", "input_bytes",
)


def raw_audit():
    with AUDIT.open(newline="", encoding="utf-8-sig") as file:
        rows = {(r["metric"], r["column"]): r for r in csv.DictReader(file) if r["scope"] == "raw_month"}
    return {
        "row_count": int(rows["row_count", ""]["count"]),
        "min_timestamp_utc": rows["min_timestamp_utc", "event_time"]["value"],
        "max_timestamp_utc": rows["max_timestamp_utc", "event_time"]["value"],
        "missing": {column: int(rows["missing_count", column]["count"]) for column in ("brand", "category_code")},
        "source": str(AUDIT),
    }


def export(raw_only):
    index = {}
    smoke = None
    if not raw_only:
        records = json.loads(VERIFIED.read_text(encoding="utf-8"))["subsets"]
        index = {int(row["subset"]): row for row in records}
        if len(records) != len(index) or set(index) != set(SUBSETS):
            raise ValueError(f"{VERIFIED}: expected one record per cuDF subset")
        smoke = json.loads(SMOKE.read_text(encoding="utf-8"))
        if not isinstance(smoke["smoke_scope"], str):
            raise ValueError(f"{SMOKE}: expected smoke_scope text")
    commit = team_commit(Path.cwd())
    if not commit:
        raise ValueError("Cannot identify the team commit")
    return {
        "schema": "tv4-dataset-overview/v1",
        "team_commit": commit,
        "generated_at": date.today().isoformat(),
        "data_kind": "unconfirmed",
        "confirmed_by_tv1": False,
        "raw_month": raw_audit(),
        "subsets": [
            {"subset": subset, "scope": "first week of 2019-10, cuDF weekly cleanup",
             **{key: index.get(subset, {}).get(key) for key in FIELDS},
             "source": str(VERIFIED) if subset in index else None}
            for subset in SUBSETS
        ],
        "pipeline_measurements": {
            "status": "unconfirmed", "show": False,
            "e2": [{"subset": subset, **{key: row.get(key) for key in TIMINGS}} for subset, row in index.items()],
            "e4_smoke": [] if smoke is None else [{**smoke, "source": str(SMOKE)}],
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--raw-only", action="store_true", help="Export the raw audit when verified manifests are unavailable")
    args = parser.parse_args()
    try:
        content = json.dumps(export(args.raw_only), ensure_ascii=False, indent=2) + "\n"
        if len(content.encode("utf-8")) >= 200_000:
            raise ValueError("Dataset overview must be under 200 KB")
        args.output.write_text(content, encoding="utf-8")
    except (OSError, ValueError, TypeError, KeyError) as error:
        parser.exit(1, f"Dataset overview export failed: {error}\n")


if __name__ == "__main__":
    main()
