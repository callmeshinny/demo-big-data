# TV4 demo web — Session-based recommendation

Standalone demo for the Big Data group project (`tlmthuy/Big-Data`). It shows Top-20 next-item recommendations per session and E1–E5 experiment results.

The static demo has Recommendations, Dataset, and Experiments tabs. English is the default, with a Vietnamese toggle in the header. Toy runs carry a badge and official results appear as “Not available yet” until delivered.

## Branding

Add either or both images to `src/branding/` using these exact filenames.

| Image | Path | Where it appears |
| --- | --- | --- |
| Logo | `src/branding/logo.png` | In the header, above the tab bar |
| Cover | `src/branding/cover.jpg` | Full-width banner below the header |

Use a transparent PNG for the logo and a wide JPG for the cover. Each slot appears automatically on the next build when its file is present. The site name is temporarily blank. When it is ready, set `siteName` in `src/main.jsx` and fill the `<title>` in `index.html`.

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
