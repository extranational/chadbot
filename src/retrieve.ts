import { isKnownLicence, LICENCES, type LicenceId } from "./licences";

export interface Chunk {
  id: string;
  text: string;
  /** Raw AI Search score. Its scale is NOT interpreted here; see abstain.ts. */
  score: number;
  sourceId: string;
  sourceUrl: string;
  licence: LicenceId;
  attribution: string;
  retrievalDate?: string;
}

export interface SearchRequest {
  messages: { role: "user"; content: string }[];
  ai_search_options: { retrieval: { match_threshold: number; max_num_results: number } };
}
/** The slice of the AI Search binding we use. The operator wires the real one. */
export interface AiSearchInstance {
  search(req: SearchRequest): Promise<unknown>;
}
/** Reranking is not a retrieval-level option: AI Search takes it at `ai_search_options.reranking`. */
export interface RetrievalConfig {
  max_num_results: number;
  match_threshold: number;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() !== "" ? v : undefined);

/**
 * Map one raw chunk, or null if it cannot be cited.
 * Provenance comes from item.metadata (written by scripts/ingest.ts), not from item.key:
 * the ingest key is "{source_id}.md|pdf", and the URL lives in metadata.source_url.
 */
function mapChunk(raw: unknown, index: number, allowed?: ReadonlySet<string>): Chunk | null {
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as { id?: unknown; text?: unknown; score?: unknown; item?: { key?: unknown; metadata?: unknown } };

  const text = str(c.text);
  if (text === undefined || typeof c.score !== "number" || !Number.isFinite(c.score)) return null;

  const md = c.item?.metadata;
  if (typeof md !== "object" || md === null) return null;
  const m = md as Record<string, unknown>;
  const sourceId = str(m.source_id);
  const sourceUrl = str(m.source_url);
  const licence = str(m.licence);
  const attribution = str(m.attribution);
  if (!sourceId || !sourceUrl || !licence || !attribution) return null;
  if (!/^https:\/\//.test(sourceUrl)) return null;
  if (!isKnownLicence(licence) || !LICENCES[licence].ingestable) return null; // CITE-ONLY is never citable from the index
  if (allowed && !allowed.has(sourceId)) return null;

  const key = str(c.item?.key) ?? sourceId;
  return {
    id: str(c.id) ?? `${key}#${index}`,
    text,
    score: c.score,
    sourceId,
    sourceUrl,
    licence,
    attribution,
    retrievalDate: str(m.retrieval_date),
  };
}

/**
 * Query AI Search and return citable chunks, best score first, at most max_num_results.
 * `allowedSourceIds` is the metadata filter: the full-mode source ids from the corpus manifest.
 * Anything without complete provenance is dropped, never passed on. A failing search() rejects.
 */
export async function retrieve(
  instance: AiSearchInstance,
  question: string,
  cfg: RetrievalConfig,
  allowedSourceIds?: ReadonlySet<string>,
): Promise<Chunk[]> {
  const res = (await instance.search({
    messages: [{ role: "user", content: question }],
    ai_search_options: { retrieval: { match_threshold: cfg.match_threshold, max_num_results: cfg.max_num_results } },
  })) as { chunks?: unknown } | null | undefined;

  const rawChunks = Array.isArray(res?.chunks) ? (res!.chunks as unknown[]) : [];
  return rawChunks
    .map((r, i) => mapChunk(r, i, allowedSourceIds))
    .filter((c): c is Chunk => c !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, cfg.max_num_results);
}
