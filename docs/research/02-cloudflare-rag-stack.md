# Cloudflare RAG Stack for a Public Passkeys/WebAuthn Q&A Bot

**Research date:** 2026-10-13 · **Budget target:** ~$10/month of inference, riding free tiers
**Context:** Next.js **static export** on Cloudflare Pages (no Next.js server; all dynamic behavior must be a Worker / Pages Function or an external service). Bot must retrieve from a curated corpus, synthesize an answer **with citations**, and **abstain** when the corpus doesn't cover the question.

> **Headline finding (answers the user's verbatim assumption):** Cloudflare's `AutoRAG` was **renamed to "AI Search"** (Sept 2025) and went **generally available on 2026-10-01**, with usage-based billing starting **2026-11-01**. It genuinely does automate chunking, embedding, index creation, retrieval, and — optionally — the answer-generation call. **But it is not a complete product for our use case out of the box:** the developer still writes (a) the request/response glue, (b) the generation system prompt that enforces citations, (c) the abstention logic, and (d) an eval harness. It does **not** emit a structured citation object or abstain for you; you get it close with a system prompt + a retrieval-score threshold. It is, however, the biggest shortcut on the platform and the free tier is real (1,000 semantic queries + 1,000 full-text queries + 5M ingestion tokens + 10 GB storage per month, on **all** Workers plans).

---

## Summary table

| Component | What it does for us | Free tier | Paid price | Needed? |
|---|---|---|---|---|
| **Cloudflare Pages** | Hosts the static-exported Next.js chat UI. Static asset requests are free & unlimited. | Unlimited static requests; 500 builds/mo | Builds above free; no egress | **Yes** (already have) |
| **AI Search** (was **AutoRAG**) | Managed ingest → markdown → chunk → embed → index → hybrid retrieve; optional built-in generation (chat completions). The shortcut. | 5M ingestion tokens, 10 GB-mo storage, **1,000 semantic + 1,000 full-text queries/mo** (all Workers plans) | $0.75/M ingestion tokens; $2.00/GB-mo; $0.75/1k semantic queries; $0.10/1k full-text; OCR +$0.50/M tokens | **Optional** — strongest build accelerator |
| **Vectorize** | Vector DB (if we build the pipeline ourselves instead of AI Search). | 30M queried vector-dims/mo; 5M stored vector-dims | 50M queried dims incl. + $0.01/M; 10M stored dims incl. + $0.05/100M | **No** if using AI Search; **Yes** if DIY |
| **Workers AI** | Embeddings + the **answer-generation LLM**. | **10,000 neurons/day** (all plans) | $0.011 / 1,000 neurons (needs Workers Paid to exceed free) | **Yes** — generation |
| **AI Gateway** | Proxy/observability for the generation call; caching, rate limiting, BYOK for external models, per-request logs. | Core features free (caching, rate limiting, analytics); logs free 200k/day, 3-day retention (new accounts) | Logpush $0.05/M req (Paid plan); Unified-billing credits +5% | **Recommended** |
| **Workers / Pages Functions** | The API endpoint that keeps keys secret, rate-limits, formats citations, enforces abstention. | 100,000 req/day; **10 ms CPU**/req; 50 subrequests/req | $5/mo base; 10M req incl. + $0.30/M; 30M CPU-ms incl. + $0.02/M | **Yes** (thin) — or skip via AI Search public endpoint |
| **R2** | Raw corpus storage. | 10 GB; 1M Class A; 10M Class B/mo | $0.015/GB-mo; $4.50/M Class A; $0.36/M Class B | **No** — AI Search has built-in storage |
| **D1** | Session / rate-limit / analytics state. | 5M rows read/day; 100k rows written/day; 5 GB | $0.001/M rows read; $1.00/M rows written; $0.75/GB-mo | **Optional** |
| **KV** | Lightweight session/rate-limit counters. | 100k reads/day; 1,000 writes/day; 1 GB | $0.50/M reads; $5.00/M writes | **Optional** |

---

## 1. Cloudflare AutoRAG = "AI Search" — what it is, what it automates, product status

**Official pages:** overview <https://developers.cloudflare.com/ai-search/> · limits & pricing <https://developers.cloudflare.com/ai-search/platform/limits-pricing/> · supported models <https://developers.cloudflare.com/ai-search/configuration/models/supported-models/> · how it works <https://developers.cloudflare.com/ai-search/concepts/how-ai-search-works/> · GA changelog <https://developers.cloudflare.com/changelog/post/2026-10-01-ai-search-generally-available/> · GA blog <https://blog.cloudflare.com/ai-search-ga/> · original AutoRAG launch blog <https://blog.cloudflare.com/introducing-autorag-on-cloudflare/>

**What it is.** AI Search (formerly AutoRAG) is a fully managed RAG/search pipeline built on Cloudflare's own primitives — Workers AI (markdown conversion + embeddings), Vectorize (vector index), R2 (built-in storage), Browser Run (web crawling) — but you don't touch those directly. You create an instance, point it at a data source (or upload files), and query it via a Workers binding, REST API, MCP, or a public HTTPS endpoint.

**What it automates (yes, automatically):**
- **File ingestion** from built-in storage (upload), an R2 bucket, or a website crawl.
- **Markdown conversion** of PDFs, Office docs, HTML, CSV, images, etc. (via Workers AI `toMarkdown`).
- **Chunking** — recursive chunking at natural boundaries; you can set **chunk size (tokens)** and **chunk overlap (0–30%)**.
- **Embedding model choice + embedding** — you pick from a supported list or take "Smart Default"; AI Search embeds every chunk. *(Embedding model is fixed at instance creation and cannot be changed later without a reindex.)*
- **Index creation** — vector index (Vectorize) and, by default, a **keyword/BM25 index** (new instances default to **hybrid** search).
- **Retrieval** — vector, keyword, or hybrid, with optional **query rewriting**, optional **reranking** (`@cf/baai/bge-reranker-base`), metadata filtering, fusion (RRF/max), context expansion, and a similarity cache.
- **The answer-generation call** — *optional*, via the **Chat Completions** endpoint (it retrieves and generates in one call). The alternative **Search** endpoint returns just chunks.
- **Background sync** — for R2/website sources it re-checks and re-indexes on a schedule; built-in-storage uploads index immediately.

**What the developer STILL has to write (this is the crux):**
- **The API glue / UI** — the chat UI and the call to AI Search (the static page + a Worker or the public endpoint).
- **The generation system prompt** — you can pass a `system` message (per-request via binding/REST, or the instance default). The docs even ship an example prompt that instructs "cite which document(s) you're drawing from" and "acknowledge if the documents don't fully answer." **There is no built-in citation object or abstention guarantee** — it's prompt-dependent, model-dependent, and best-effort.
- **Citation formatting** — the **Search** response gives you `chunks[].item.key` (file path/URL), `item.timestamp`, `item.metadata`, and per-chunk scores — enough to render citations yourself. The **Chat Completions** response gives you prose; if you want structured, clickable citations, the reliable path is *search-then-generate yourself* so you control numbering and formatting.
- **Abstention logic** — AI Search exposes `retrieval.match_threshold` (default `0.4`) and `max_num_results` (1–50, default 10). You can implement "if the top chunk score < threshold → return a canned 'not covered' message *without* calling the LLM" — but *you* write that branch. Otherwise you rely on the system prompt, which is not a guarantee.
- **An eval harness** — nothing built-in measures answer groundedness, citation correctness, or abstention rate. You bring your own.

**Product status & eligibility (as of 2026-10-13):**
- **Generally available** since **2026-10-01**. **No waitlist, no eligibility gate** — create an instance from the dashboard. (It was "open beta / free to enable" from its 2025-04-07 launch through GA.)
- **Billing begins 2026-11-01** (Cloudflare emails a reminder the week before). Before then, usage is free; after, the free monthly allotment still applies on **all Workers plans**.
- The **legacy `env.AI.autorag()` / `/autorag/rags/` API was replaced** by the `ai_search` / `ai_search_namespaces` binding and `/ai-search/namespaces/{ns}/instances/{id}/` endpoints — this is a **rename + API break**, not a new product.

**Verdict for our use case:** AI Search is **most of the retrieval pipeline, managed**, and a **legitimate "obviates the reusable component pipeline" answer for ingestion/chunking/embedding/indexing/retrieval**. It is **not** a finished product for "answer with verified citations, abstain reliably." Treat it as *managed retrieval + an optional baseline generator*, and keep citation formatting, abstention, and evals in our own thin layer.

---

## 2. Vectorize — mechanics, limits, filtering, pricing

**Official pages:** overview <https://developers.cloudflare.com/vectorize/> · limits <https://developers.cloudflare.com/vectorize/platform/limits/> · pricing <https://developers.cloudflare.com/vectorize/platform/pricing/>

**How it works.** A globally distributed vector DB queried from Workers. You create an index, generate embeddings yourself (e.g. with Workers AI), upsert them, and query by vector (optionally with metadata filters). It does **not** chunk, embed, or generate — that's on you (or on AI Search, which uses Vectorize internally).

**Create/query.** Via Wrangler (`wrangler vectorize create <name> --dimensions=<n> --metric=cosine`), the Workers binding, or the HTTP API. You `upsert` vectors (with metadata) and `query` returning topK matches + scores.

**Index & vector limits (official "Limits" page):**
- Max dimensions/vector: **1,536** (32-bit float precision).
- **Max vectors per index: 20,000,000** (V2 indexes; deprecated V1 = 200,000).
- Indexes per account: **100 (Free) / 50,000 (Paid)**.
- Metadata per vector: **10 KiB**. Max **10 metadata indexes** per index; **64 bytes** of indexed data per metadata field per vector.
- `topK`: **50** with values/metadata, **100** without.
- Upsert batch: 1,000 (Workers) / 5,000 (HTTP).
- **Namespaces per index: 1,000 (Free) / 50,000 (Paid)** — yes, namespaces are supported (partition a single index into isolated partitions).

**Metadata filtering: supported** — filter by indexed metadata fields at query time (equality and range via comparison operators on the metadata index).

**Pricing (official "Pricing" page):**
| | Workers Free | Workers Paid |
|---|---|---|
| Queried vector dimensions | **30M/mo** | first **50M/mo included**, then **$0.01/M** |
| Stored vector dimensions | **5M** | first **10M included**, then **$0.05 per 100M** |

- No charge for CPU, memory, "active index hours", or number of indexes. No egress charges.
- **Literal billing formula** (from the docs): `monthly_queried_dims = (stored_vectors + queries_this_month) × dims`; cost = `((queried + stored) × dims × ($0.01/1,000,000)) + (stored × dims × ($0.05/100,000,000))`. Worked example in the docs: 10,000 vectors @768 dims, 30,000 queries/mo → 30.72M queried dims + 7.68M stored dims → **$0.31/mo** (and it fits inside the Paid included allocation).

**Worked fit for our corpus:** 5,000 chunks @ 768 dims = **3.84M stored dims → Free tier OK**. Monthly queried dims at 10,000 queries/mo = (5,000 + 10,000) × 768 = **11.52M → within the 30M Free limit**. So a ~5k-chunk corpus with ~10k queries/mo is **fully free** on Vectorize. Free-tier query ceiling at that index size ≈ `30M/768 − 5,000 ≈ 34,000 queries/mo`.

---

## 3. Workers AI — models, neuron pricing, worked estimate

**Official pages:** overview <https://developers.cloudflare.com/workers-ai/> · **pricing** <https://developers.cloudflare.com/workers-ai/platform/pricing/> · models <https://developers.cloudflare.com/workers-ai/models/> · Free-plan model restriction changelog <https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/>

### The neuron model
- Workers AI is billed in **neurons** ($0.011 per 1,000 neurons). Neurons scale with model size (input and output tokens are priced separately).
- **Free allocation: 10,000 neurons/day**, reset daily at 00:00 UTC — on **both** Free and Paid plans. On **Workers Free** you *cannot* exceed it (requests error out); on **Workers Paid** you keep the 10,000/day free and pay $0.011/1k neurons beyond.
- `10,000 neurons/day × 30 = 300,000 neurons/mo = **$3.30/mo of free inference value.**`
- **⚠️ Free-plan model restriction (2026-07-28):** `@cf/moonshotai/kimi-k2.6`, `@cf/moonshotai/kimi-k2.7-code`, and `@cf/zai-org/glm-5.2` now **require Workers Paid** (return HTTP 403 on Free). Many strong models remain Free-plan eligible (e.g. `glm-4.7-flash`, `gemma-4-26b-a4b-it`, `nemotron-3-120b-a12b`, and the llama/qwen/gpt-oss line-up below).

### Generation models suitable for grounded RAG with citations
All of these are usable from AI Search's Chat Completions generation step and/or directly from Workers AI. Prices are per 1M tokens (in/out). Context windows from the AI Search "Supported models" table where listed.

| Model ID | Context window | Price /M in → out | Notes |
|---|---|---|---|
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 24,000 | $0.293 → $2.253 | The default workhorse; strong instruction-following for citations. Small context — cap retrieved context. |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | 131,000 | $0.270 → $0.850 | **Best quality/cost/context balance** for RAG. Long context holds many chunks. |
| `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | 60,000 | $0.045 → $0.384 | Cheapest fast option; good for rewriting/rewriting + simple grounded answers. |
| `@cf/qwen/qwen3-30b-a3b-fp8` | 32,000 | $0.051 → $0.335 | Very cheap MoE; solid. |
| `@cf/zai-org/glm-4.7-flash` | 131,072 | $0.060 → $0.400 | Cheapest 128k-context option; **Free-plan eligible**. |
| `@cf/google/gemma-4-26b-a4b-it` | (see models page) | $0.100 → $0.300 | Free-plan eligible; cheap. |
| `@cf/openai/gpt-oss-120b` | 128,000 | $0.350 → $0.750 | Strong open reasoning model; good abstention judgment, pricier. |
| `@cf/openai/gpt-oss-20b` | 128,000 | $0.200 → $0.300 | Cheaper GPT-OSS; good balance. |
| `@cf/deepseek-ai/deepseek-v4-flash-0731` | 1,048,576 | $0.440 → $1.320 | Huge context, cached-input discount. |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | — | $0.351 → $0.555 | Mid-tier. |
| `@cf/zai-org/glm-5.3-flash` | 1,048,576 | $0.150 → $0.500 | Long context, cheap, cached input. |

*(Also available but Paid-plan-gated: `kimi-k2.6/2.7-code`, `glm-5.2`. Vector/vision models exist but are irrelevant here.)*

### Embedding models (with vector dimensions)
Used automatically by AI Search (included in AI Search pricing), or directly if building on Vectorize. Prices are per 1M input tokens.

| Model ID | Vector dims | Context (tokens) | Price /M tokens |
|---|---|---|---|
| `@cf/baai/bge-small-en-v1.5` | **384** | 512 | $0.020 |
| `@cf/baai/bge-base-en-v1.5` | **768** | 512 | $0.067 |
| `@cf/baai/bge-large-en-v1.5` | **1024** | 512 | $0.204 |
| `@cf/baai/bge-m3` | **1024** | 512 | $0.012 |
| `@cf/qwen/qwen3-embedding-0.6b` | **1024** | 8,192 | $0.012 (AI Search **default**) |
| `@cf/google/embeddinggemma-300m` | **768** | 512 | (see models page) |
| `@cf/qwen/qwen3-vl-embedding-2b` | **1024** | 32,768 | multimodal (image) support |

Reranker: `@cf/baai/bge-reranker-base` ($0.003/M tokens). **In AI Search, embedding + reranking are included — they don't hit the Workers AI bill or AI Gateway logs.** Generation, query rewriting, and external providers do.

### Worked estimate — how many queries fit the free tier, and what $10 buys

**Assumed standard query:** ~3,000 input tokens (system prompt + retrieved chunks + question) and ~400 output tokens. (Neurons/query = `in_per_M × 3000/1e6 + out_per_M × 400/1e6`.)

| Generation model | Neurons / query | Free queries/day | **Free queries/month** | $/query beyond free | Queries covered by $5 | Queries covered by $10 |
|---|---|---|---|---|---|---|
| `llama-3.3-70b-instruct-fp8-fast` | 161.9 | 62 | **1,853** | $0.00178 | 2,807 | 5,614 |
| `llama-3.1-8b-instruct-fp8-fast` | 26.3 | 380 | **11,405** | $0.00029 | 17,280 | 34,561 |
| `qwen3-30b-a3b-fp8` | 26.1 | 384 | **11,510** | $0.00029 | 17,439 | 34,878 |
| `glm-4.7-flash` | 31.1 | 322 | **9,659** | $0.00034 | 14,634 | 29,269 |
| `llama-4-scout-17b-16e-instruct` | 104.5 | 96 | **2,870** | $0.00115 | 4,348 | 8,696 |
| `gpt-oss-20b` | 65.5 | 153 | **4,583** | $0.00072 | 6,944 | 13,889 |
| `gpt-oss-120b` | 122.7 | 81 | **2,444** | $0.00135 | 3,704 | 7,407 |

**Reading this (Workers AI only, generation + any embeddings if DIY):**
- **Entirely free the whole month, zero dollars:** any volume up to the "Free queries/month" number. With a cheap model that's ~**9,600–11,500 grounded answers/month free**; with the 70B workhorse ~**1,850/month free**.
- **$10 buys:** beyond the free daily 10k neurons, $10 covers **~5,600** 70B answers, or **~8,700** llama-4-scout, or **~29,000** glm-4.7-flash answers. Free daily allocation still applies on top, so total monthly volume is free + paid.

**The AI Search overlay (managed path):** each chat/retrieval request also incurs the AI Search **query fee** — free for the first **1,000 semantic** + **1,000 full-text** queries/month, then $0.75/1k semantic ($0.00075/query) and $0.10/1k full-text. So the **effective free ceiling on the AI Search path is 1,000 answer-generating queries/month** (the query allotment binds before the neuron allocment). Adding the query fee to generation:
- 70B: ~$0.00178 + $0.00075 = **$0.00253/query** → $5 buys ~1,976; $10 buys ~3,953 (plus 1,000 free).
- glm-4.7-flash: ~$0.00034 + $0.00075 = **$0.00109/query** → $5 buys ~4,587; $10 buys ~9,174 (plus 1,000 free).

**Ingestion & storage (AI Search):** free **5M ingestion tokens/month** + **10 GB-month**. A curated passkeys/WebAuthn corpus of, say, 300–800 docs at ~1–3M tokens fits **free**; at 10M tokens you'd pay ~$3.75 (5M over × $0.75/M). Text storage is negligible (<100 MB), well under 10 GB.

**Bottom line for the budget:** a realistic public demo (low hundreds to low thousands of queries/month, small corpus) sits **at or under $0** on the AI Search + Workers AI free tiers, and even at 10–30k queries/month the whole thing costs **well under $10/month** with a mid-size model. **The binding constraint is not dollars — it's the 1,000/month AI Search query allotment (free path) or the Workers-Paid $5 base if you want to exceed any free tier.**

---

## 4. The other pieces, and what needs the paid plan

**Workers / Pages Functions** (official: <https://developers.cloudflare.com/workers/platform/pricing/> · <https://developers.cloudflare.com/workers/platform/limits/>):
| | Workers Free | Workers Paid |
|---|---|---|
| Requests | 100,000/day | 10M/mo included + $0.30/M |
| CPU time | **10 ms/invocation** | 30M CPU-ms incl. + $0.02/M; up to 5 min/invocation |
| Subrequests | 50/request | 10,000/request |
| Simultaneous outbound connections | 6 | 6 |
| Duration (HTTP) | no limit | no limit |
- **Needs paid?** For a demo within free tiers, **no**. But: **10 ms CPU/request is tight** — fine for a streaming proxy (network waits don't count as CPU), risky if we parse/format large payloads in-Worker. And the **$5/mo Workers Paid base is required to exceed the Workers AI daily neuron cap** and (almost certainly) to incur AI Search overage billing — so treat **$5/mo as the practical floor for any real public launch**. Requests overage is negligible at demo scale.

**Pages Functions vs standalone Worker:** Functionally equivalent — Pages Functions run on the same Workers runtime with the same limits. Instruction: **next.config `output: 'export'` produces a static site; you can drop `functions/api/chat.ts` alongside it** and Pages serves it, or deploy a **standalone Worker** and route a path/custom domain to it. A **standalone Worker is cleaner** here (own bindings for AI Search + AI Gateway, own rate limiting, independently deployable), but Pages Functions work with zero extra infra. Either is fine; neither changes cost.

**R2** (official: <https://developers.cloudflare.com/r2/pricing/>): Free **10 GB**, 1M Class A, 10M Class B/month; then $0.015/GB-mo, $4.50/M Class A, $0.36/M Class B; **no egress fees**. **Do we need it?** **No** — AI Search now ships **built-in storage** (backed by R2 internally) and a built-in vector index; storage is included in AI Search pricing. You'd only add R2 if you build the DIY Vectorize pipeline and want a durable raw-chunk store.

**D1** (official: <https://developers.cloudflare.com/d1/platform/pricing/>): Free **5M rows read/day, 100k rows written/day, 5 GB**; Paid 25B reads/mo incl. + $0.001/M, 50M writes/mo incl. + $1.00/M, $0.75/GB-mo. Good for session history, rate-limit counters, and a query/feedback log. **Optional.**

**KV** (pricing on the Workers pricing page): Free **100k reads/day, 1,000 writes/day, 1 GB**; Paid $0.50/M reads, $5.00/M writes. Simplest choice for a tiny rate-limit counter or config. **Optional** — but note the **1,000 writes/day free cap** can bite if you log every request; D1 is better for write-heavy logging.

**AI Gateway** (official: <https://developers.cloudflare.com/ai-gateway/reference/pricing/> · features <https://developers.cloudflare.com/ai-gateway/features/>): **Core features are free on all plans** — dashboard analytics, **caching** (serves identical requests from Cloudflare's cache; up to 90% latency cut and real cost avoidance), and **rate limiting**. **Logs** are free up to **200k/day with 3-day retention** for accounts created on/after 2026-09-24; **Logpush** (ship logs to your own sink) requires Workers Paid ($0.05/M req). Guardrails are billed as Workers AI. **Does it help us?** **Yes, materially for cost control and safety**: request-level logging of prompts/answers/token cost, a cache to dodge repeat generation, rate limiting to cap abuse on a public demo, and **BYOK** to plug in external model keys later. Recommended even though optional.

---

## 5. Portability — how clean is swapping to an external hosted model later?

**Very clean for generation; locked-ish for embeddings.** Concretely:

- **AI Search generation model is provider-swappable with no reindex and (mostly) no code change.** Per official docs (`/configuration/models/`), you can point an instance at **any provider compatible with the AI Gateway chat-completions endpoint** (OpenAI, Anthropic, etc.) by adding the provider key to **AI Gateway → BYOK** and selecting it; the **generation model can be changed at any time in Settings**, or overridden **per-request**. So "swap the generation model to OpenRouter/Anthropic" = add key in AI Gateway + change a model string.
- **Embeddings are the lock-in.** The **embedding model can only be set at instance creation and cannot be changed** without rebuilding the index (a change in embedding model/space invalidates stored vectors). Changing it = re-ingest/re-embed. Since embedding is included in AI Search pricing, this is usually a non-event — but it is the one thing you can't hot-swap.
- **If you build on Vectorize directly**, you control both: generation is just a `fetch` you can repoint at OpenRouter/Anthropic/Workers AI (put it behind AI Gateway and switching = one line), while embeddings likewise require a full reindex if you change models.
- **What does NOT change on a generation swap:** the corpus, the chunking, the index, the retrieval, the metadata filters, your citation-rendering code, and your abstention threshold logic (all independent of the generator). Only the prompt template and the provider auth change.
- **Recommended hedge:** architect the Worker as **retrieve (AI Search) → build prompt → generate (through AI Gateway)**. Then the generator is a single config value, and you can A/B Workers AI vs an external model per request. This is the concrete answer to the user's lock-in worry: the pipeline is portable, because the only provider-specific piece is one outbound call.

---

## 6. Recommended concrete architecture for our case

```
[Browser]  Next.js static export on Cloudflare Pages (chat UI: fetch → streaming SSE renderer)
     │  POST /api/chat {question}
     ▼
[Cloudflare Worker]  (or Pages Function functions/api/chat.ts)   ← keeps secrets, rate-limits, enforces abstention
     │  1. rate-limit via D1/KV (per-IP)
     │  2. retrieve  →  AI Search instance: instance.search({ messages, ai_search_options:{ retrieval:{ match_threshold, max_num_results } } })
     │        └─ returns scored chunks:  chunks[].{text, score, item.key, item.metadata}
     │  3. ABSTAIN GATE: if best chunk score < ~0.4 → return canned "not covered by the corpus" (NO LLM call → saves neurons)
     │  4. build prompt: number each chunk as [1],[2]… (cite from item.key); system prompt mandates "cite [n]; if unsupported, say so"
     │  5. generate → AI Gateway route → Workers AI model  (later: repoint same call to OpenRouter/Anthropic via BYOK)
     │  6. stream answer tokens + a citations[] array derived from the chunks actually used
     ▼
[Browser]  renders answer + clickable source list
```

**Where the corpus ingestion runs & how updates are triggered:**
- **Managed path (recommended):** put the curated docs in **AI Search built-in storage** (upload via the Items API / dashboard) or connect an **R2 bucket** / a **website** source. **Built-in-storage uploads index immediately**; R2/website sources re-sync on a **schedule** automatically. No ingestion code, no chunking code, no embedding code. Trigger a content refresh by uploading/replacing the file (immediate) or by pushing to the R2 bucket (picked up on next sync).
- **DIY path (only if we need full control):** a **separate Worker/script** (or local script) reads the corpus → `env.AI.run('@cf/baai/bge-base-en-v1.5', …)` to embed → `VECTORIZE_INDEX.upsert()` → rows/chunks in R2/D1. Updates triggered by re-running the ingest script (or a Cron Trigger on Workers Paid, up to 250 triggers).

**Two viable endpoint choices (both keep the static-site constraint):**
1. **Thin Worker (recommended)** — keeps the AI Search binding and any generation keys server-side; lets us set the system prompt per request, implement the abstention score-gate, enforce rate limits, and format structured citations. Uses the `ai_search` binding (`search()` / `chatCompletions()`).
2. **AI Search public endpoint (zero-backend option)** — AI Search can expose a **public HTTPS endpoint** (`<id>.search.ai.cloudflare.com/chat/completions`, plus `/search` and `/mcp`) with **CORS enabled by default** and **built-in rate limiting** (default 120 req/min). The static page could call it directly. **Trade-off:** it's unauthenticated (anyone with the URL can query) and uses instance-default generation/system-prompt settings, so per-request citation/abstention control is weaker. Fine for a throwaway demo over public docs; use a **custom domain + Cloudflare Access** to lock it down, or prefer option 1 for anything real.

**Deploy targets & cost:** Pages hosts the static UI (free, unlimited static requests). One standalone Worker (or one Pages Function) → $5/mo Workers Paid base if we exceed free tiers, else $0. AI Search + Workers AI generation sit on the free tiers at demo scale. **Everything above fits comfortably under $10/month.**

---

## Verdict (build/buy)

- **AutoRAG = AI Search is real and GA, and it genuinely removes the ingest/chunk/embed/index/retrieve build.** The user's intuition ("just upload docs and it chunks, vectors, embeds") is **correct** — that part is automated.
- **It is NOT a finished bot.** We still own: the API glue, the citation system prompt + rendering, the abstention gate, and an eval harness. None of that is provided as a product feature.
- **Cost:** at realistic demo volume the stack is **free or a few dollars**, capped by free tiers (AI Search 1,000 semantic queries/mo; Workers AI 10k neurons/day; Vectorize 30M queried dims/mo). A hard **~$10/month** budget comfortably covers a public demo even at 10–30k queries/month with a cheap-to-mid model. The only near-certain paid line is the **$5/mo Workers Paid** base once we want to exceed any free tier.
- **Portability:** generation model is swappable to OpenRouter/Anthropic with a config change (AI Gateway BYOK); embeddings are the one creation-time lock. Keeping the Worker as retrieve→prompt→generate preserves optionality.

### Items I could not fully verify on an official page (flagged)
- **Whether overage billing on AI Search requires a paid Workers plan specifically.** The docs show the *included* allotment as identical on Free and Paid (1,000 semantic + 1,000 full-text) and say billing "begins Nov 1, 2026," but don't state a plan requirement for incurring overage. I infer (as with Workers AI) that exceeding free tiers needs Workers Paid; not explicitly confirmed.
- **Exact effective "match_threshold" that reliably yields good abstention** — not documented as a guarantee; needs empirical tuning (→ eval harness).
- The AI Search **default system prompt text** is not published; the docs only say a default exists and is visible in AI Gateway logs.