# chadbot

Corpus-grounded passkey Q&A bot: a Cloudflare Worker over a licensed, manifest-driven
corpus. See `docs/PRD.md` and `docs/IMPLEMENTATION-PLAN.md`.

Status: Phase 0–1 (scaffold, config, corpus manifest, licence registry, opt-out gate,
ingestion CLI). Retrieval and answer code are not built yet.

```
npm test                         # vitest
npm run ingest -- --dry-run      # per-source ingestion report, no upload
```
