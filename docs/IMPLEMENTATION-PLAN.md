# Chadbot v1 Implementation Plan

> **For Hermes:** execute via the `claude-harness` project `chadbot` (Slack channel `C0C84BQUDL6`). Review returned work against this plan; land by extraction into `/home/hermes/repos/chadbot`.

**Goal:** ship a public, corpus-grounded passkey Q&A bot at `viewridgesecurity.com/ask/passkeys` that answers only from a licensed corpus, cites every claim, and abstains instead of improvising.

**Architecture:** static Next.js page on Cloudflare Pages → thin Cloudflare Worker (`chadbot`) → Cloudflare AI Search (managed retrieval, hybrid) → abstention score-gate → Workers AI generation through AI Gateway → streamed answer + structured `citations[]`.

**Stack:** TypeScript · Cloudflare Workers (Wrangler) · AI Search · Workers AI · AI Gateway · KV (rate limit) · Vitest · Next.js static export (consuming page only).

**Non-negotiable invariants (the whole point of the build):**
1. No answer text is returned that is not grounded in a retrieved chunk.
2. No LLM call is made when the abstention gate trips.
3. Every answer carries citations with source URL + licence attribution string.
4. Corpus composition and model selection are **config**, not code.

## Host limitation — large file reads hang this harness

**Do not `Read` any file larger than ~30 KB.** A `Read` of a file above that size
never returns: the tool call is issued and no result is ever delivered, so the
session blocks forever with zero CPU consumption and no error. This is a property of
the harness host, not of the file or of this project.

Observed and isolated: `docs/research/02-cloudflare-rag-stack.md` (29 KB) reads
normally; `docs/research/01-corpus-licensing.md` (65 KB) hangs the session every
time. Two consecutive Phase 0/1 runs died on exactly that read.

Consequences for this project:
- `docs/CORPUS-CONTRACT.md` is the harness-facing extract of the corpus
  specification and is the file to read for corpus work.
- `docs/research/01-corpus-licensing.md` and `docs/research/02-cloudflare-rag-stack.md`
  are **operator reference only**. Do not read them, and do not reference them from
  the brief.
- Keep any specification file the harness must read under ~25 KB. If it grows past
  that, split it.

## Harness scope and ownership

The harness writes **code**. Anything that touches a live account, a production zone, a second repository, or the public internet is Hermes's, because the harness runs in a hardened container behind an allowlisting egress proxy: it has no Cloudflare credentials, no route to `api.cloudflare.com`, and no write access to `vrsweb`. Assigning those tasks to it would stall on an escalation it cannot resolve.

| Phase | Harness (code) | Hermes (operations / judgment) |
|---|---|---|
| 0 Scaffold | all | review |
| 1 Corpus + ingestion | all code, manifest, gates | **approve corpus composition and licence verdicts** before ingest; decide any source the harness asks about |
| 2 Retrieval + answer | all | review the abstention gate specifically |
| 3 UI | component (3.1) | **3.2 vrsweb page — Hermes, separate repo** |
| 4 Eval | harness + scoring code (4.1, 4.2) | **run live sweep and A/B against the deployed instance (4.3)**; accept/reject the winning config |
| 5 Deploy | notices **route code** + attribution rendering (5.3a); technical README (5.4) | **all CF resources, deploy, live verification (5.1, 5.2)**; notice text, takedown contact, publication (5.3b); final review of README framing |

---

## Phase 0 — Repo scaffolding

### Task 0.1: Initialise the chadbot repo

**Objective:** an empty-but-buildable TypeScript Worker repo with CI-less lint/test wiring.

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `README.md`
- Create: `src/index.ts` (exports a stub Worker returning 501)
- Create: `tests/smoke.test.ts`

**Steps:**
1. Write failing test `tests/smoke.test.ts` asserting `GET /healthz` returns 200 + `{status:"ok"}`.
2. Run `npx vitest run` → expect FAIL.
3. Implement stub Worker with the `/healthz` route.
4. Run `npx vitest run` → expect PASS.
5. Commit: `chore: scaffold chadbot worker`

**Verification:** `npx vitest run` passes; `npx wrangler dev` serves `/healthz`.

### Task 0.2: Config schema

**Objective:** one typed config surface for corpus, thresholds, and models.

**Files:** Create `config/chadbot.yaml`, `src/config.ts`, `tests/config.test.ts`

Schema (freeze these keys):
```yaml
corpus_manifest: config/corpus.yaml
retrieval:
  max_num_results: 8
  match_threshold: 0.4      # tuned in Phase 4
  rerank: true
generation:
  provider: workers-ai       # workers-ai | external
  model: "@cf/meta/llama-4-scout-17b-16e-instruct"
  max_tokens: 900
  temperature: 0.1
serving:
  rate_limit_per_ip_per_hour: 20
  monthly_query_ceiling: 3000
abstain:
  message: "That isn't covered by the passkeys material I have. I can answer questions about WebAuthn, passkey registration and authentication, recovery, and phishing resistance."
```

**Steps:** TDD a `loadConfig()` that validates presence/types and throws on unknown keys. Commit: `feat: typed config surface`.

---

## Phase 1 — Corpus registry and ingestion

### Task 1.1: Corpus manifest

**Objective:** declarative, reviewable list of every source with its licence verdict.

**Files:** Create `config/corpus.yaml`, `tests/corpus-manifest.test.ts`

`config/corpus.yaml` entries (from `research/01-corpus-licensing.md`):

| source | url | licence | mode | attribution |
|---|---|---|---|---|
| WebAuthn L3 | w3.org/TR/webauthn-3/ | W3C-SDL-2023 | full | W3C notice + URL + status |
| WebAuthn L2 | w3.org/TR/webauthn-2/ | W3C-SDL-2023 | full | as above |
| RFC 8809 | rfc-editor.org/rfc/rfc8809 | IETF-TLP | full | IETF + RFC number |
| NIST SP 800-63B-4 | nvlpubs.nist.gov/.../NIST.SP.800-63b-4.pdf | US-GOV-PD | full | courtesy credit |
| NIST SP 800-63B (superseded) | pages.nist.gov/800-63-3/sp800-63b.html | US-GOV-PD | full | courtesy credit |
| CISA phishing-resistant MFA | cisa.gov/... | US-GOV-PD | full | courtesy credit |
| OWASP Authentication Cheat Sheet | cheatsheetseries.owasp.org/... | CC-BY-SA-4.0 | full | OWASP + title + URL + licence |
| OWASP MFA Cheat Sheet | cheatsheetseries.owasp.org/... | CC-BY-SA-4.0 | full | as above |
| Google Identity passkeys | developers.google.com/identity/passkeys | CC-BY-4.0 | full | Google's reproduction wording |
| Wikipedia: Passkey | en.wikipedia.org/wiki/Passkey_(authentication) | CC-BY-SA-4.0 | full | URL + licence |
| Wikipedia: WebAuthn | en.wikipedia.org/wiki/WebAuthn | CC-BY-SA-4.0 | full | URL + licence |
| FIDO Alliance specs | fidoalliance.org/specs/... | cite-only | pointer | none (not ingressed) |
| MS Learn / Apple / Yubico / 1Password / Okta | — | cite-only | pointer | none (not ingressed) |

**Steps:**
1. Test: every entry has `url|licence|mode|attribution`; `mode` ∈ {full, pointer}; every licence ∈ the known-registry set.
2. Test: at least 8 entries with `mode: full` exist (corpus is not degenerate).
3. Test: no entry with `mode: full` carries a cite-only licence.
4. Implement the manifest + loader. Commit: `feat: corpus manifest with licence verdicts`.

### Task 1.2: Licence registry

**Objective:** encode each licence's obligations as data so the answer layer can render the correct notice.

**Files:** Create `src/licences.ts`, `tests/licences.test.ts`

For each licence id store: `display_name`, `attribution_template`, `share_alike: boolean`, `quote_permitted: boolean`, `link_required: true`.

**Steps:** TDD — assert `CC-BY-SA-4.0` has `share_alike: true` and `US-GOV-PD` has `share_alike: false`. Commit: `feat: licence registry`.

### Task 1.3: Opt-out gate (robots.txt / Content-Signal / TDM)

**Objective:** never ingest a source that has opted out; fail closed.

**Files:** Create `src/ingest/optout.ts`, `tests/optout.test.ts`

**Steps:**
1. Tests (with fixture strings, no network):
   - `Disallow: /` for `User-agent: *` → blocked.
   - Named AI agent blocked (GPTBot/CCBot/ClaudeBot/Google-Extended) → blocked.
   - `Content-Signal: ai-train=no, search=no` → blocked.
   - `tdm-reservation: 1` → blocked.
   - No signals → allowed.
   - Fetch failure → **blocked** (fail closed).
2. Implement. Commit: `feat: opt-out gate, fail-closed`.

### Task 1.4: Ingestion CLI

**Objective:** reproducible corpus → AI Search instance, with provenance metadata per chunk.

**Files:** Create `scripts/ingest.ts`, `tests/ingest.test.ts`

**Steps:**
1. Test: manifest entry with `mode: pointer` produces zero upload items.
2. Test: each uploaded item carries `{source_url, licence, attribution, retrieval_date, source_id}` in metadata.
3. Test: a source failing the opt-out gate is skipped and reported, not silently dropped.
4. Implement: run the gate → fetch → convert to markdown → upload to the AI Search instance (built-in storage) with metadata; print a per-source report.
5. Run against a 2-source subset; verify 2 sources indexed.
6. Commit: `feat: corpus ingestion CLI with provenance metadata`.

**Verification:** re-running is idempotent; report lists every manifest entry as indexed or skipped-with-reason.

---

## Phase 2 — Retrieval and answer pipeline

### Task 2.1: Worker + bindings

**Files:** Modify `src/index.ts`, `wrangler.toml`; Create `tests/api.test.ts`

Bindings: `AI_SEARCH` (ai_search), `AI` (workers ai), `AI_GATEWAY` route, `RATE_LIMIT` (KV), vars from `config/chadbot.yaml`.

**Steps:** TDD `POST /api/chat` returns 400 on missing `question`; 405 on GET. Commit: `feat: worker routes and bindings`.

### Task 2.2: Retrieval module

**Files:** Create `src/retrieve.ts`, `tests/retrieve.test.ts`

**Steps:**
1. Test: maps AI Search response → `Chunk[] {id, text, score, sourceUrl, licence, attribution}`.
2. Test: applies `max_num_results` and metadata filter from config.
3. Test: empty result set returns `[]` without throwing.
4. Implement. Commit: `feat: retrieval with provenance mapping`.

### Task 2.3: Abstention gate

**Objective:** the single most important function in the codebase.

**Files:** Create `src/abstain.ts`, `tests/abstain.test.ts`

**Steps:**
1. Test: top score below `match_threshold` → `{abstain: true}`.
2. Test: empty chunk list → `{abstain: true}`.
3. Test: top score at/above threshold → `{abstain: false}`.
4. Test: **integration** — when abstaining, the generation function is never called (inject a spy; assert zero calls).
5. Test: abstain response is the configured message and carries no citations.
6. Implement. Commit: `feat: abstention gate with no-LLM-call guarantee`.

### Task 2.4: Prompt + citation contract

**Files:** Create `src/prompt.ts`, `tests/prompt.test.ts`

System prompt requirements (assert each in tests):
- Answer **only** from the numbered chunks.
- Cite as `[n]` for every substantive claim.
- If the chunks are insufficient, say so plainly — do not fill gaps.
- Paraphrase; verbatim quotation ≤ 25 words, ≤ 2 quotes per source.
- Do not reproduce a source's text as a substitute for it.
- No legal/security advice framing; point to the source.

**Steps:** TDD prompt assembly (chunks numbered deterministically; question appended). Commit: `feat: grounding prompt contract`.

### Task 2.5: Generation via AI Gateway

**Files:** Create `src/generate.ts`, `tests/generate.test.ts`

**Steps:**
1. Test: model id and params come from config, not literals.
2. Test: provider `external` swaps the call target with no other code change (mock both paths).
3. Test: generation error → structured error response, **never** a fabricated answer.
4. Implement. Commit: `feat: swappable generation through AI Gateway`.

### Task 2.6: Streaming handler + citation assembly

**Files:** Modify `src/index.ts`; Create `src/citations.ts`, `tests/citations.test.ts`

**Steps:**
1. Test: only chunks actually referenced by `[n]` in the answer appear in `citations[]`.
2. Test: each citation renders `attribution` from the licence registry.
3. Test: ShareAlike sources surface an adaptations notice.
4. Implement SSE streaming: `{token}` events then a final `{citations:[…]}` event.
5. Commit: `feat: streaming answer with citation assembly`.

### Task 2.7: Rate limiting + spend ceiling

**Files:** Create `src/limits.ts`, `tests/limits.test.ts`

**Steps:**
1. Test: 21st request in an hour from one IP → 429.
2. Test: monthly counter at ceiling → 503 with a clear message (fail closed).
3. Implement on KV. Commit: `feat: per-IP rate limit and monthly ceiling`.

---

## Phase 3 — UI

### Task 3.1: Chat component

**Files:** Create `ui/PasskeyChat.tsx`, `tests/PasskeyChat.test.tsx`

Framework-agnostic props: `endpoint`, `placeholder`, `noticeUrl`. Renders question input, streamed answer, and the citation list with links + attribution lines.

**Steps:** TDD render/abstain/error states. Commit: `feat: chat component`.

### Task 3.2: Wire into vrsweb — **HERMES, not the harness**

**Rationale:** different repository, different deploy pipeline (Pages `vrsweb` project). The harness project is scoped to the `chadbot` checkout only.

**Files:** Modify `vrsweb`: add `src/app/ask/passkeys/page.tsx` importing the published component; point at the Worker route.

**Steps:** Local `next build` with `output: export` succeeds; page renders; commit in vrsweb: `feat: /ask/passkeys page`.

---

## Phase 4 — Evaluation

### Task 4.1: Question set

**Files:** Create `eval/questions.yaml`

≥ 30 questions: ~20 in-corpus with an expected source, ~10 out-of-corpus that **must** abstain (adjacent topics: passwords, SSO, MFA in general, biometrics, FIDO2 for IoT, competitor products). Include 2 adversarial prompts attempting to elicit unsupported claims.

### Task 4.2: Harness

**Files:** Create `scripts/eval.ts`, `tests/eval.test.ts`

Reports: **groundedness** (claims traceable to a cited chunk), **citation-correctness** (cited chunk actually supports the claim), **abstention-rate on OOC questions**, **false-abstention rate on in-corpus questions**, **p50/p95 latency**, **cost per query**.

**Steps:** TDD scoring functions with fixtures; then a live run. Commit: `feat: eval harness with grounding and abstention scoring`.

### Task 4.3: Threshold tuning + model A/B — **HERMES runs it**

**Rationale:** the sweep requires a live deployed instance and burns real queries against the account. Harness delivers the harness; Hermes drives it.

**Steps:** Sweep `match_threshold` 0.30–0.55 against the live instance; report the curve. Run the harness with `llama-4-scout-17b-16e-instruct` vs `glm-4.7-flash`; record the winning config in `config/chadbot.yaml`; present the numbers to Brett for acceptance. Commit: `chore: tuned threshold and selected default model`.

**Gate:** do not proceed to deploy until false-abstention < 15% and abstention-on-OOC ≥ 90%.

---

## Phase 5 — Deploy, notices, docs

> **Ownership note:** tasks 5.1 and 5.2 are **Hermes's**, not the harness's. The harness container has no Cloudflare credentials and its egress proxy does not allow `api.cloudflare.com`; a deploy task sent there stalls. Task 5.3 is split — the route *code* is harness work, the *notice text, contact address, and publication* are Hermes's. Task 5.4 is harness-written, Hermes-reviewed.

### Task 5.1: Cloudflare resources — **HERMES**

Create AI Search instance + ingest corpus; KV namespace; AI Gateway; Worker route on the VRS zone. Secrets via `wrangler secret put`. Provisioning decisions (instance naming, zone, rate-limit policy values) are mine to make and Brett's to approve.

### Task 5.2: Deploy and verify — **HERMES**

`npx wrangler deploy`. Verify from the public internet, not the host: `/healthz`, an in-corpus question (answer + working links), an out-of-corpus question (abstention). Confirm the monthly ceiling trips as configured.

### Task 5.3: Public notices — **split**

**5.3a — harness (code):** `src/notices.ts` + a `/notices` route rendering per-source attribution and the CC BY-SA 4.0 adaptations notice where applicable, driven by the licence registry.

**5.3b — Hermes (judgment):** the notice text itself, the takedown/opt-out contact at the VRS address, and the documented removal process (drop source → drop chunks → changelog entry). These are published claims about the business, so they are not a coding agent's call.

### Task 5.4: README — **harness writes, Hermes reviews**

Documents: architecture, how to swap the corpus, how to swap the generation model, cost model, licence summary, and how to run the eval harness. This is what makes the repo a showcase artifact rather than a demo — Hermes reviews the framing on that basis.

---

## Definition of done

1. `/ask/passkeys` live and public; in-corpus question returns a correct, cited answer.
2. Out-of-corpus question abstains; the LLM is provably not called (test).
3. Citation rendering includes the correct per-source licence/attribution.
4. Eval harness runs from the repo and reports the four metrics; thresholds met.
5. Second-corpus swap demonstrated by config change alone.
6. Total live cost at demo volume $0, monthly ceiling enforced.
7. README complete; public repo contains the reusable core.

## Harness brief (front-loaded)

Deliver Phase 0 and Phase 1 first and stop for review. Constraints for the harness: no `rm` inside the checkout (denied by policy); commit on a feature branch; git author identity is set on the repo already. Do not ingest any source outside `config/corpus.yaml`. Ask rather than guess on anything touching corpus composition or licence handling.