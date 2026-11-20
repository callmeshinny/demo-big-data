# TV4 demo web — Session-based recommendation

Standalone demo for the Big Data group project (`tlmthuy/Big-Data`). It shows Top-20 next-item recommendations per session and E1–E5 experiment results.

**Status:** both views built (Recommendation, Experiments E1–E5) and wired to the toy artifacts in the team repo (`main` @ `86bc1c8`). No real benchmark numbers yet: official runs show "Chưa có", toy runs carry a TOY badge. Static site, no backend.

```bash
npm ci
npm run dev     # local
npm run build   # static build in dist/
npm test        # data validation tests
```

- Agent instructions: [AGENTS.md](AGENTS.md)
- Project context: [docs/CONTEXT.md](docs/CONTEXT.md)
- Data contract: [docs/data_contract.md](docs/data_contract.md)
- Contract extensions to report to TV2: [docs/CONTRACT_NOTES.md](docs/CONTRACT_NOTES.md)
- Syncing with the team repo: [docs/SYNC.md](docs/SYNC.md)
