# Sync with the team repo

This repo is a personal working copy for the demo. The team repo `tlmthuy/Big-Data` is the source of truth.

## 1. Folder setup

Keep both repos side by side:

```
workspace/
├── Big-Data/        # git clone https://github.com/tlmthuy/Big-Data
└── tv4-demo-web/    # this repo
```

## 2. Pull data into the demo (team repo → this repo)

1. Update the team repo:
   ```bash
   cd Big-Data && git pull
   ```
2. Take only artifacts that TV2 has delivered or confirmed: prediction run directories and the metrics package.
3. Run the adapter from the team repo root, so its `evaluation` modules are importable:
   ```bash
   PYTHONPATH=. python3 ../tv4-demo-web/scripts/export_demo_data.py \
     --run-dir <run dir delivered by TV2> \
     --catalog <catalog of the same run> \
     --output ../tv4-demo-web/public/demo-data.json
   ```
   The current adapter only accepts a Popularity toy run with K = 20. Extend it before using real or neural runs.
4. Commit only the small JSON in `public/`. Note the source run ID and the team commit in the commit message.

## 3. Push the UI back (this repo → team repo)

The team expects the demo under `app/` on branch `feature/tv4-demo-documentation`. Push back only at milestones (for example 21/11 sample, 27/11 integration, 28/11 final), not after every change:

```bash
cd Big-Data
git checkout feature/tv4-demo-documentation && git pull
rsync -a --delete --exclude node_modules --exclude dist --exclude .git \
  --exclude AGENTS.md --exclude docs \
  ../tv4-demo-web/ app/
# keep app/output_contract.md, app/README.md, app/TODO.md in the team repo
git status    # review: only app/ should change
```

Then make one clean commit and push (or open a PR).

## 4. Contract changes

`docs/data_contract.md` is a pinned copy at team commit `5b2df90`. Edit the contract in the team repo (`app/output_contract.md`) first, then refresh the copy here. Never let the two drift.
