# Chadbot — Product Requirements Document

**Product:** Chadbot — a grounded, citation-first Q&A bot on passkeys.
**Owner:** Brett (View Ridge Security). **Author:** Hermes. **Version:** 0.1 (draft for ratification) · **Date:** 2026-10-13.

---

## 1. Why this exists

Two goals, in priority order:

1. **Showcase.** A working, publicly reachable artifact demonstrating that View Ridge Security can build a corpus-grounded AI Q&A solution end-to-end — retrieval, grounding, citations, abstention, deployment, cost control.
2. **Reusable core.** The mechanism is content-independent. Chadbot is built as a framework (corpus + config in, grounded citations out) so that a second deployment on a different subject is a corpus/config change, not a rebuild.

The subject of v1 is **passkeys/WebAuthn/MFA** — bounded, authoritative, current, and on-brand for a security consultancy.

## 2. Goals and non-goals

**Goals (v1)**
- Public page at `viewridgesecurity.com/ask/passkeys` answering passkey questions from a curated corpus.
- Every substantive claim in an answer traceable to a cited corpus source with a visible link.
- **Abstain** when the corpus does not cover the question, rather than improvise.
- Total run cost ≤ **$10/month**, ideally $0 at demo volume.
- Corpus swapability and generation-model swapability preserved by design.
- Public GitHub repository (`extranational/chadbot`) containing the reusable components.

**Non-goals (v1)**
- Multi-topic routing (the `/ask/*` namespace reserves room; only `/ask/passkeys` ships).
- Multi-turn conversation memory / user accounts.
- Embeddable third-party widget.
- Non-passkey MFA coverage beyond what the corpus directly supports.
- Comparison against a hosted-model backend (explicitly deferred to a follow-on project).

## 3. Users

- **Prospect / evaluator** — arrives from a link, asks a passkey question, judges competence by answer quality and citation honesty.
- **Brett** — demonstrates it live; needs it to never be embarrassing.
- **Reuser** (future) — points the framework at a different corpus.

## 4. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| F1 | Chat UI at `/ask/passkeys`: question input, streamed answer, visible source list per answer. | P0 |
| F2 | Each answer renders numbered citations, each linking to the source URL. | P0 |
| F3 | Abstention: when top retrieval score is below threshold, return a canned "not covered by the corpus" response **without** invoking generation. | P0 |
| F4 | Prompt contract: answer only from retrieved chunks; cite `[n]`; state explicitly when chunks are insufficient. | P0 |
| F5 | Rate limiting per IP, and a hard monthly spend/volume ceiling with a fail-closed default. | P0 |
| F6 | Corpus registry: every chunk carries source URL, retrieval date, licence ID, and its attribution string. | P0 |
| F7 | Evaluation harness: a fixed question set with expected behaviour (answer w/ correct citation, or abstain), runnable on demand, reporting groundedness / citation-correctness / abstention-rate. | P0 |
| F8 | Ingestion path reproducible from the repo (curated corpus → index), not hand-uploaded. | P1 |
| F9 | Public "not legal advice / not a substitute for vendor documentation" notice + takedown/opt-out contact. | P0 |
| F10 | Graceful degradation: upstream model failure returns a clear error, never a fabricated answer. | P1 |

## 5. Corpus (v1, frozen)

Verdicts from `research/01-corpus-licensing.md`. **FULL_INGEST** = store text, synthesize, quote with attribution. **SUMMARIZE_ONLY** = do not store the source text; paraphrase facts and link.

**In corpus (FULL_INGEST):**
- W3C **WebAuthn Level 3** (and L2) — W3C Software and Document License 2023 (permissive).
- IETF RFCs — **RFC 8809** (WebAuthn registries) and related; IETF Trust Legal Provisions (verbatim + attribution permitted).
- **NIST SP 800-63B-4** and predecessor — US Government work, public domain (17 U.S.C. §105).
- **CISA** phishing-resistant MFA guidance — US Government, public domain.
- **OWASP** Authentication and Multifactor Authentication Cheat Sheets — CC BY-SA 4.0 (attribution mandatory, **ShareAlike**).
- **Google** Identity / Chrome passkeys documentation — CC BY 4.0 (attribution mandatory).
- **Wikipedia** passkey/WebAuthn articles — CC BY-SA 4.0 (ShareAlike).
- CC-licensed academic papers on passkeys (arXiv/ACM/USENIX where the licence permits; USENIX is conditional on genuinely non-commercial use).

**Recorded, not ingested (SUMMARIZE_ONLY — cite and link only):**
- **FIDO Alliance** specs and site: site terms forbid verbatim copying; specs grant no derivative rights. Cite/reference only.
- **Microsoft Learn**, **Apple** developer docs, **Yubico**, **1Password**, **Okta** blogs: no-reuse/anti-crawl terms. Paraphrase facts + link; no automated crawl, no stored text.
- Non-CC arXiv preprints; pre-2023/proprietary ACM papers.
- Gated/paywalled material (see research appendix) — recorded for later, never ingested.

**Licensing constraints carried into the build:**
- ShareAlike sources (OWASP, Wikipedia) mean answer text that is a *derivative* of those sources must be licensed CC BY-SA 4.0. Mitigation: paraphrase substance rather than closely track expression; display per-source licence in the attribution line; carry an adaptations notice.
- Mandatory quote cap: ≤ ~25 words per quote, ≤ 1–2 quotes per source per answer; never assemble enough consecutive quotes to reconstruct a source.
- Honour `robots.txt`, `Content-Signal`, and TDM reservations at ingest time.
- **Citation is not a licence** — attribution is displayed because the licences require it and because it strengthens the fair-use posture, not because it grants ingestion rights.

## 6. Architecture (v1)

```
[Browser]  vrsweb static Next.js export on Cloudflare Pages — /ask/passkeys page
     │ POST /api/chat {question}   (streamed)
     ▼
[Cloudflare Worker — chadbot]   secrets, rate limit, abstention gate, citation formatting
     │ 1. rate-limit check (KV/D1)
     │ 2. retrieve  → AI Search instance (scored chunks + item.key + metadata)
     │ 3. ABSTAIN GATE: best chunk score < threshold → canned response, NO LLM call
     │ 4. build prompt: chunks numbered [1..n]; system prompt mandates cite-or-decline
     │ 5. generate → AI Gateway → Workers AI model (swappable to external via BYOK)
     │ 6. stream answer + citations[] derived from chunks actually used
     ▼
[Browser]  renders answer + clickable source list + licence/attribution line
```

- **Retrieval/index:** Cloudflare **AI Search** (formerly AutoRAG), GA 2026-10-01. Automates ingest → markdown → chunk → embed → index → hybrid retrieve. Corpus in built-in storage (R2 not required).
- **Generation:** Workers AI. Default `@cf/meta/llama-4-scout-17b-16e-instruct` (128k context, best quality/cost/context fit). Alternatives: `@cf/zai-org/glm-4.7-flash`, `@cf/meta/llama-3.3-70b-instruct-fp8-fast`.
- **Portability:** generation swapped by config via AI Gateway BYOK (no reindex); embedding model is fixed at instance creation — the one lock-in, accepted.
- **Cost model (verified against Cloudflare pricing, 2026-10-13):** free tier = 1,000 semantic + 1,000 full-text AI Search queries/month, 5M ingestion tokens, 10 GB storage; Workers AI 10,000 neurons/day free. A demo at low-hundreds–few-thousand queries/month costs **$0**. Even at 10–30k queries/month the stack lands well under $10. The practical paid floor is the $5/mo Workers Paid base if free tiers are exceeded.

## 7. Repository split

- **`extranational/chadbot`** (public) — reusable components: the Worker, the ingestion CLI, the evaluation harness, the prompt/citation/abstention modules, and a framework-agnostic chat UI component. Config declares corpus sources, licences, thresholds, and model.
- **`vrsweb`** — consumes the component: hosts `/ask/passkeys` static page and points at the chadbot Worker.

## 8. Success criteria (demo acceptance)

1. A passkey question answerable from the corpus returns a correct answer with working citations.
2. A question **outside** the corpus triggers abstention, not invention.
3. An answer requiring a quote renders a capped, attributed quote.
4. The eval harness runs and reports groundedness / citation-correctness / abstention-rate on the fixed question set.
5. Live cost tracking shows $0 at demo volume; a spend ceiling is enforced.
6. A second corpus could be swapped in without touching retrieval/answer/citation code (demonstrated by config, not claim).

## 9. Risks

| Risk | Mitigation |
|---|---|
| Confident hallucination on a security topic — the reputational nightmare | Abstention gate before generation; prompt contract; eval harness scored on abstention honesty; F10. |
| ShareAlike contamination of answer text | Paraphrase-first prompt; licence surfaced per source; adaptations notice. |
| Public endpoint abuse / cost blowout | Per-IP rate limit; hard monthly ceiling; abstention gate avoids needless LLM calls; AI Gateway caching. |
| Free-tier cliff at 1,000 queries/month | Accepted for v1; documented; upgrade path to Workers Paid is one plan change. |
| Corpus quality — too thin to be credible | Licensed core (W3C + NIST + CISA + OWASP + Google) is authoritative and substantial; vendor material used for pointer/paraphrase only. |
| Embedding lock-in | Accepted; documented. Generation stays swappable. |

## 10. Decisions

Resolved 2026-10-13:

- **D1.** ✅ Repo split as in §7 — `chadbot` = reusable core, `vrsweb` = the page.
- **D2.** ✅ Providers and models are config-driven. Default generation model `@cf/meta/llama-4-scout-17b-16e-instruct`; `@cf/zai-org/glm-4.7-flash` carried as the cost alternative and A/B'd in the eval harness. Final pick is whichever wins on groundedness / citation-correctness / abstention-rate.
- **D3.** ✅ Public notice and takedown/opt-out contact published at a VRS address.
- **D4.** ✅ USENIX non-commercial papers excluded from v1.

**Configurability (recorded):** generation is swappable per-instance or per-request across any AI Gateway chat-completions-compatible provider (Workers AI models, or external such as Anthropic/OpenAI/OpenRouter via BYOK) with no reindex. **The embedding model is fixed at AI Search instance creation** — the one genuine lock-in; default is `@cf/qwen/qwen3-embedding-0.6b` (1,024 dims). Changing it requires re-ingest/re-embed. Reranking default `@cf/baai/bge-reranker-base`.