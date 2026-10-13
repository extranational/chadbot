import { readFileSync } from "node:fs";
import { parse } from "yaml";

export interface ChadbotConfig {
  corpus_manifest: string;
  retrieval: { max_num_results: number; match_threshold: number; rerank: boolean };
  generation: {
    provider: "workers-ai" | "external";
    model: string;
    max_tokens: number;
    temperature: number;
  };
  serving: { rate_limit_per_ip_per_hour: number; monthly_query_ceiling: number };
  abstain: { message: string };
}

type Obj = Record<string, unknown>;

function section(root: Obj, key: string, allowed: string[]): Obj {
  const v = root[key];
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new Error(`config: "${key}" must be a mapping`);
  }
  for (const k of Object.keys(v)) {
    if (!allowed.includes(k)) throw new Error(`config: unknown key "${key}.${k}"`);
  }
  return v as Obj;
}

function str(o: Obj, path: string, key: string): string {
  const v = o[key];
  if (typeof v !== "string" || v.trim() === "") throw new Error(`config: ${path} must be a non-empty string`);
  return v;
}

function num(o: Obj, path: string, key: string, min: number, max: number, int = false): number {
  const v = o[key];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`config: ${path} must be a number`);
  if (v < min || v > max || (int && !Number.isInteger(v))) {
    throw new Error(`config: ${path} out of range (${int ? "integer " : ""}${min}..${max})`);
  }
  return v;
}

function bool(o: Obj, path: string, key: string): boolean {
  const v = o[key];
  if (typeof v !== "boolean") throw new Error(`config: ${path} must be a boolean`);
  return v;
}

export function parseConfig(text: string): ChadbotConfig {
  const raw = parse(text) as unknown;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("config: document must be a mapping");
  }
  const root = raw as Obj;
  const top = ["corpus_manifest", "retrieval", "generation", "serving", "abstain"];
  for (const k of Object.keys(root)) {
    if (!top.includes(k)) throw new Error(`config: unknown key "${k}"`);
  }

  const r = section(root, "retrieval", ["max_num_results", "match_threshold", "rerank"]);
  const g = section(root, "generation", ["provider", "model", "max_tokens", "temperature"]);
  const s = section(root, "serving", ["rate_limit_per_ip_per_hour", "monthly_query_ceiling"]);
  const a = section(root, "abstain", ["message"]);

  const provider = str(g, "generation.provider", "provider");
  if (provider !== "workers-ai" && provider !== "external") {
    throw new Error(`config: generation.provider must be "workers-ai" or "external"`);
  }

  return {
    corpus_manifest: str(root, "corpus_manifest", "corpus_manifest"),
    retrieval: {
      max_num_results: num(r, "retrieval.max_num_results", "max_num_results", 1, 50, true),
      match_threshold: num(r, "retrieval.match_threshold", "match_threshold", 0, 1),
      rerank: bool(r, "retrieval.rerank", "rerank"),
    },
    generation: {
      provider,
      model: str(g, "generation.model", "model"),
      max_tokens: num(g, "generation.max_tokens", "max_tokens", 1, 100000, true),
      temperature: num(g, "generation.temperature", "temperature", 0, 2),
    },
    serving: {
      rate_limit_per_ip_per_hour: num(s, "serving.rate_limit_per_ip_per_hour", "rate_limit_per_ip_per_hour", 1, 1e6, true),
      monthly_query_ceiling: num(s, "serving.monthly_query_ceiling", "monthly_query_ceiling", 1, 1e9, true),
    },
    abstain: { message: str(a, "abstain.message", "message") },
  };
}

export function loadConfig(path = "config/chadbot.yaml"): ChadbotConfig {
  return parseConfig(readFileSync(path, "utf8"));
}
