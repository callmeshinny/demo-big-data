"""Export one CSV per experiment chart using the same metric definitions as the UI."""
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / "public/run-results.json")
    parser.add_argument("--output", type=Path, default=ROOT / "figures/data")
    args = parser.parse_args()
    specs = json.loads(Path(__file__).with_name("figure_specs.json").read_text(encoding="utf-8"))
    payload = json.loads(args.input.read_text(encoding="utf-8"))
    args.output.mkdir(parents=True, exist_ok=True)
    for experiment, charts in specs.items():
        runs = [run for run in payload["runs"] if run["experiment"] == experiment]
        for chart, _, metrics in charts:
            path = args.output / f"{experiment.lower()}-{chart}.csv"
            with path.open("w", encoding="utf-8", newline="") as output:
                writer = csv.writer(output, lineterminator="\n")
                writer.writerow(("team_commit", "generated_at", "run_id", "series", "status", "metric", "value", "unit", "scope"))
                if not runs:
                    writer.writerow((payload["team_commit"], payload.get("generated_at"), "", "", "", "", "", "", ""))
                for run in runs:
                    for metric in metrics:
                        entry = {} if run["status"] in {"failed", "excluded"} else run.get("metrics", {}).get(metric) or {}
                        value = entry.get("value")
                        writer.writerow((
                            payload["team_commit"], payload.get("generated_at"), run["run_id"],
                            "toy" if run["data_kind"] == "toy" else "official" if run["data_kind"] == "real" else "planned", run["status"],
                            metric, value if type(value) in {float, int} else None, entry.get("unit"), entry.get("scope"),
                        ))


if __name__ == "__main__":
    main()
