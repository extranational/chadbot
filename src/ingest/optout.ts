/**
 * Opt-out gate (CORPUS-CONTRACT.md §5.1). FAILS CLOSED: a failed fetch, a non-200
 * robots.txt, an unparseable signal, or any other ambiguity means `allowed: false`.
 * Blocking more can only narrow what is ingested, never widen it.
 */

export interface HeaderReader {
  get(name: string): string | null;
}
export interface FetchedResponse {
  status: number;
  headers: HeaderReader;
  text(): Promise<string>;
}
export type Fetcher = (url: string, init?: { method?: string }) => Promise<FetchedResponse>;

export interface GateResult {
  allowed: boolean;
  reasons: string[];
}

/** Our own crawler token plus AI agents whose robots groups we honour. */
export const OUR_AGENT = "chadbot";
export const AI_AGENTS = ["GPTBot", "CCBot", "ClaudeBot", "Google-Extended"];
const HONOURED = [OUR_AGENT, ...AI_AGENTS.map((a) => a.toLowerCase())];

interface Rule {
  allow: boolean;
  pattern: string;
}
interface Group {
  agents: string[];
  rules: Rule[];
}

function parseRobots(text: string): { groups: Group[]; contentSignals: string[] } {
  const groups: Group[] = [];
  const contentSignals: string[] = [];
  let current: Group | null = null;
  let collectingAgents = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const field = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();

    if (field === "user-agent") {
      if (!collectingAgents || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
    } else if (field === "allow" || field === "disallow") {
      collectingAgents = false;
      if (current && value !== "") current.rules.push({ allow: field === "allow", pattern: value });
    } else if (field === "content-signal") {
      contentSignals.push(value);
    }
  }
  return { groups, contentSignals };
}

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const src = body.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp("^" + src + (anchored ? "$" : ""));
}

/** Longest matching pattern wins; Allow wins ties; no match => allowed. */
function pathAllowed(rules: Rule[], path: string): boolean {
  let best: { len: number; allow: boolean } | null = null;
  for (const r of rules) {
    if (!patternToRegExp(r.pattern).test(path)) continue;
    const len = r.pattern.length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { len, allow: r.allow };
  }
  return best ? best.allow : true;
}

/** Returns a block reason, or null if the Content-Signal value permits use. */
function contentSignalBlock(value: string, where: string): string | null {
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return `${where}: empty Content-Signal (ambiguous)`;
  for (const p of parts) {
    const m = /^([a-z-]+)\s*=\s*(yes|no)$/i.exec(p);
    if (!m) return `${where}: unparseable Content-Signal "${p}" (ambiguous)`;
    if (m[2].toLowerCase() === "no") return `${where}: Content-Signal ${m[1].toLowerCase()}=no`;
  }
  return null;
}

/** Evaluate robots.txt text (robots rules for the path, plus any Content-Signal lines). */
export function evaluateRobots(text: string, path: string): GateResult {
  const reasons: string[] = [];
  const { groups, contentSignals } = parseRobots(text);

  for (const g of groups) {
    const hit = g.agents.filter((a) => a === "*" || HONOURED.includes(a));
    if (hit.length === 0) continue;
    if (!pathAllowed(g.rules, path)) {
      const lower = hit.find((a) => a !== "*");
      const named = lower ? (AI_AGENTS.find((a) => a.toLowerCase() === lower) ?? lower) : "*";
      reasons.push(`robots.txt disallows ${path} for User-agent: ${named}`);
    }
  }
  for (const cs of contentSignals) {
    const r = contentSignalBlock(cs, "robots.txt");
    if (r) reasons.push(r);
  }
  return { allowed: reasons.length === 0, reasons };
}

function tdmReservationBlock(v: string, where: string): string | null {
  const t = v.trim();
  if (t === "0") return null;
  if (t === "1") return `${where}: tdm-reservation: 1`;
  return `${where}: unparseable tdm-reservation "${t}" (ambiguous)`;
}

function metaTags(html: string): { name: string; content: string | null }[] {
  const out: { name: string; content: string | null }[] = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attr = (n: string) => new RegExp(`\\b${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i").exec(tag);
    const name = attr("name");
    if (!name) continue;
    const content = attr("content");
    out.push({ name: (name[1] ?? name[2]).toLowerCase(), content: content ? (content[1] ?? content[2]) : null });
  }
  return out;
}

/** Evaluate a page response's headers (and, if supplied, its HTML meta tags). */
export function evaluateResponseSignals(headers: HeaderReader, html = ""): GateResult {
  const reasons: string[] = [];

  const tdmRes = headers.get("tdm-reservation");
  if (tdmRes !== null) {
    const r = tdmReservationBlock(tdmRes, "response header");
    if (r) reasons.push(r);
  }
  const tdmPol = headers.get("tdm-policy");
  if (tdmPol !== null && tdmPol.trim() !== "") {
    reasons.push("response header: tdm-policy present (policy cannot be evaluated)");
  }
  const cs = headers.get("content-signal");
  if (cs !== null) {
    const r = contentSignalBlock(cs, "response header");
    if (r) reasons.push(r);
  }

  for (const m of metaTags(html)) {
    if (m.name === "tdm-reservation") {
      const r = m.content === null ? "meta tdm-reservation without content (ambiguous)" : tdmReservationBlock(m.content, "meta tag");
      if (r) reasons.push(r);
    } else if (m.name === "tdm-policy") {
      reasons.push("meta tag: tdm-policy present (policy cannot be evaluated)");
    } else if (m.name === "content-signal") {
      const r = m.content === null ? "meta content-signal without content (ambiguous)" : contentSignalBlock(m.content, "meta tag");
      if (r) reasons.push(r);
    }
  }
  return { allowed: reasons.length === 0, reasons };
}

/**
 * Full gate for one URL: robots.txt (must be a 200), then the page's own headers via HEAD.
 * Never throws; every failure path returns `allowed: false` with a reason.
 */
export async function checkOptOut(url: string, fetcher: Fetcher): Promise<GateResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reasons: [`unparseable URL ${JSON.stringify(url)} (fail closed)`] };
  }

  const reasons: string[] = [];

  try {
    const robots = await fetcher(`${parsed.origin}/robots.txt`);
    if (robots.status !== 200) {
      reasons.push(`robots.txt returned HTTP ${robots.status} (fail closed)`);
    } else {
      const r = evaluateRobots(await robots.text(), parsed.pathname + parsed.search);
      reasons.push(...r.reasons);
    }
  } catch (e) {
    reasons.push(`robots.txt fetch failed: ${(e as Error).message} (fail closed)`);
  }

  try {
    const head = await fetcher(url, { method: "HEAD" });
    if (head.status < 200 || head.status >= 300) {
      reasons.push(`page HEAD returned HTTP ${head.status} (fail closed)`);
    } else {
      reasons.push(...evaluateResponseSignals(head.headers).reasons);
    }
  } catch (e) {
    reasons.push(`page header fetch failed: ${(e as Error).message} (fail closed)`);
  }

  return { allowed: reasons.length === 0, reasons };
}
