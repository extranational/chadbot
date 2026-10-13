# Chadbot — research synthesis (reviewed)

Source reports: `01-corpus-licensing.md`, `02-cloudflare-rag-stack.md`. This file records what the parent **independently verified** and what remains flagged, so downstream work does not rest on unverified claims.

## Verified against primary sources (2026-10-13)

| Claim | Verified how | Status |
|---|---|---|
| AutoRAG renamed **AI Search**; **GA 2026-10-01** | developers.cloudflare.com changelog + blog.cloudflare.com/ai-search-ga | ✅ confirmed |
| **Billing begins 2026-11-01** | AI Search release note + limits-pricing page | ✅ confirmed |
| Included: **1,000 semantic + 1,000 full-text queries/mo, 5M ingestion tokens, 10 GB-mo** (all Workers plans) | ai-search/platform/limits-pricing | ✅ confirmed |
| **$0.011 / 1,000 neurons**; **10,000 neurons/day free**, resets 00:00 UTC | workers-ai/platform/pricing | ✅ confirmed |
| Model pricing: llama-3.3-70b-fp8-fast $0.293/$2.253; llama-4-scout $0.270/$0.850; llama-3.1-8b-fp8-fast $0.045/$0.384; qwen3-30b-a3b-fp8 $0.051/$0.335; mistral-small-3.1 $0.351/$0.555; deepseek-v4-flash-0731 $0.440/$1.320 | workers-ai/platform/pricing table | ✅ confirmed |
| Embedding dims: bge-small 384, bge-base 768, bge-large 1024 | workers-ai/models | ✅ confirmed |
| **Ziff Davis v. OpenAI (S.D.N.Y.)**: robots.txt is **not** a "technological measure" under DMCA §1201; motion to amend denied as futile | opinion text (Doc. 302/983, filed 2025-12-18; underlying opinion 2025-12-15) | ✅ confirmed |

## Flagged / not independently verified

- `@cf/zai-org/glm-4.7-flash` free-plan eligibility — plausible but not seen in the fetched pricing extract (page truncated). Re-check before pinning.
- 2026-07-28 Workers Free model restriction (kimi-k2.6/2.7-code, glm-5.2 require Workers Paid) — from changelog per subagent; not re-fetched.
- Whether AI Search **overage** billing requires a paid Workers plan specifically — inferred, not stated on an official page.
- The reliable `match_threshold` for abstention — undisclosed; must be tuned empirically (this is what the eval harness is for).
- AI Search default system prompt text — not published.
- `MicrosoftDocs/entra-docs` licence (MIT vs CC BY 4.0) — verify the specific repo before relying on it.
- CISA `/terms-use` copyright clause (JS-rendered) — relied on public-domain framing instead.
- robots.txt / AI-directive state read 2026-10-13; changes frequently — re-check at ingest time.

## Corrections applied to the reports

None required — both reports held up. One framing correction carried into the PRD: Cloudflare automating chunk/embed/index/retrieve does **not** remove the reusable component; the answer pipeline (grounding contract, citation rendering, abstention gate, eval harness, API shape) remains ours and is the actual product.

## Standing constraints derived

1. Citation is not a licence — ingestion must rest on a licence, public-domain status, or an exception; attribution is added on top.
2. Two-tier corpus: FULL_INGEST (W3C, IETF, NIST, CISA, OWASP, Google, Wikipedia, CC-licensed papers) vs SUMMARIZE_ONLY (FIDO, Microsoft Learn, Apple, Yubico, 1Password, Okta — paraphrase + link only, no crawl, no stored text).
3. ShareAlike sources impose CC BY-SA 4.0 on derivative answer text → paraphrase-first prompt + per-source licence display.
4. Quote cap ≤ ~25 words, ≤ 1–2 quotes per source per answer.
5. Abstention gate runs **before** generation (saves cost and prevents invention).