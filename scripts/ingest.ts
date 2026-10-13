/**
 * Ingestion CLI: manifest -> opt-out gate -> fetch -> markdown -> upload items with provenance.
 *
 *   npm run ingest -- --dry-run [--only id,id] [--offline]
 *
 * `mode: pointer` entries are never fetched and never produce an item.
 * Live upload is performed by the operator, who holds the Cloudflare credentials.
 */
import { pathToFileURL } from "node:url";
import { loadManifest, type CorpusEntry } from "../src/corpus";
import { toMarkdown } from "../src/ingest/convert";
import { checkOptOut, evaluateResponseSignals, type Fetcher } from "../src/ingest/optout";

export interface UploadItem {
  key: string;
  markdown: string;
  metadata: {
    source_id: string;
    source_url: string;
    licence: string;
    attribution: string;
    retrieval_date: string;
  };
}
export interface Uploader {
  upload(items: UploadItem[]): Promise<void>;
}
export interface Deps {
  manifest: CorpusEntry[];
  fetcher: Fetcher;
  uploader: Uploader;
  now: () => Date;
}
export interface Options {
  dryRun: boolean;
  only?: string[];
}
export interface ReportRow {
  source_id: string;
  url: string;
  licence: string;
  mode: string;
  status: "indexed" | "skipped";
  reason?: string;
}
export interface IngestResult {
  report: ReportRow[];
  items: UploadItem[];
  uploaded: boolean;
  uploadError?: string;
}

export async function runIngest(deps: Deps, opts: Options): Promise<IngestResult> {
  const { manifest, fetcher, uploader, now } = deps;
  if (opts.only) {
    const known = new Set(manifest.map((e) => e.source_id));
    for (const id of opts.only) if (!known.has(id)) throw new Error(`unknown source_id in --only: ${id}`);
  }
  const retrieval_date = now().toISOString().slice(0, 10);
  const report: ReportRow[] = [];
  const items: UploadItem[] = [];

  for (const e of manifest) {
    const row = (status: "indexed" | "skipped", reason?: string): void => {
      report.push({ source_id: e.source_id, url: e.url, licence: e.licence, mode: e.mode, status, reason });
    };

    // Pointer check comes first and short-circuits: nothing below may touch the network.
    if (e.mode !== "full") {
      row("skipped", "pointer: cite-only, never fetched or stored");
      continue;
    }
    if (opts.only && !opts.only.includes(e.source_id)) {
      row("skipped", "not selected (--only)");
      continue;
    }

    try {
      const gate = await checkOptOut(e.url, fetcher);
      if (!gate.allowed) {
        row("skipped", `opt-out gate: ${gate.reasons.join("; ")}`);
        continue;
      }

      const page = await fetcher(e.url);
      if (page.status !== 200) {
        row("skipped", `content fetch returned HTTP ${page.status} (fail closed)`);
        continue;
      }
      const contentType = page.headers.get("content-type");
      const isHtml = /html/i.test(contentType ?? "");
      // Unsupported types (e.g. PDF) are rejected before the body is read.
      if (!isHtml && !/^(text\/markdown|text\/plain)/i.test(contentType ?? "")) {
        toMarkdown("", contentType); // throws UnsupportedContentError with the reason
      }
      const body = await page.text();
      const signals = evaluateResponseSignals(page.headers, isHtml ? body : "");
      if (!signals.allowed) {
        row("skipped", `opt-out gate (content response): ${signals.reasons.join("; ")}`);
        continue;
      }

      const markdown = toMarkdown(body, contentType);
      if (markdown.length === 0) {
        row("skipped", "converted content is empty");
        continue;
      }
      items.push({
        key: `${e.source_id}.md`,
        markdown,
        metadata: {
          source_id: e.source_id,
          source_url: e.url,
          licence: e.licence,
          attribution: e.attribution,
          retrieval_date,
        },
      });
      row("indexed");
    } catch (err) {
      row("skipped", `${(err as Error).message}`.replace(/^/, "error: ") + " (fail closed)");
    }
  }

  const result: IngestResult = { report, items, uploaded: false };
  if (!opts.dryRun && items.length > 0) {
    try {
      await uploader.upload(items);
      result.uploaded = true;
    } catch (err) {
      result.uploadError = (err as Error).message;
      for (const r of report) {
        if (r.status === "indexed") {
          r.status = "skipped";
          r.reason = `upload failed: ${result.uploadError}`;
        }
      }
    }
  }
  return result;
}

export function formatReport(r: IngestResult, dryRun: boolean): string {
  const indexed = r.report.filter((x) => x.status === "indexed").length;
  const lines = [
    `Ingestion report${dryRun ? " (dry-run: nothing uploaded)" : ""}`,
    `${indexed} indexed, ${r.report.length - indexed} skipped, ${r.report.length} manifest entries`,
    "",
  ];
  for (const x of r.report) {
    const tag = x.status === "indexed" ? (dryRun ? "INDEXED (dry-run)" : "INDEXED") : "SKIPPED";
    lines.push(`${tag.padEnd(18)} ${x.source_id}  [${x.licence}, ${x.mode}]`);
    if (x.reason) lines.push(`${"".padEnd(18)} reason: ${x.reason}`);
  }
  if (r.uploadError) lines.push("", `UPLOAD ERROR: ${r.uploadError}`);
  return lines.join("\n");
}

export interface CliArgs {
  dryRun: boolean;
  offline: boolean;
  only?: string[];
  manifest: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const a: CliArgs = { dryRun: false, offline: false, manifest: "config/corpus.yaml" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") a.dryRun = true;
    else if (arg === "--offline") a.offline = true;
    else if (arg === "--only") a.only = (argv[++i] ?? "").split(",").filter(Boolean);
    else if (arg === "--manifest") a.manifest = argv[++i] ?? a.manifest;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (a.offline && !a.dryRun) throw new Error("--offline requires --dry-run");
  return a;
}

/** Real fetcher for operator runs. */
export const liveFetcher: Fetcher = (url, init) =>
  fetch(url, {
    method: init?.method ?? "GET",
    redirect: "follow",
    headers: { "user-agent": "chadbot-ingest/0.1 (+https://viewridgesecurity.com)" },
    signal: AbortSignal.timeout(20_000),
  });

/** --offline: no network at all; everything fails closed. */
const offlineFetcher: Fetcher = async () => {
  throw new Error("network disabled (--offline)");
};

/** The Cloudflare AI Search upload is operator-run; it is deliberately not implemented here. */
const unimplementedUploader: Uploader = {
  async upload() {
    throw new Error("live upload is not implemented in this build: the operator wires the AI Search upload (needs Cloudflare credentials). Use --dry-run.");
  },
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await runIngest(
    {
      manifest: loadManifest(args.manifest),
      fetcher: args.offline ? offlineFetcher : liveFetcher,
      uploader: unimplementedUploader,
      now: () => new Date(),
    },
    { dryRun: args.dryRun, only: args.only },
  );
  console.log(formatReport(result, args.dryRun));
  if (result.uploadError) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 2;
  });
}
