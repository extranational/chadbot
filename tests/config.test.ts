import { describe, expect, it } from "vitest";
import { parseConfig, loadConfig } from "../src/config";

const VALID = `
corpus_manifest: config/corpus.yaml
retrieval:
  max_num_results: 8
  match_threshold: 0.4
  rerank: true
generation:
  provider: workers-ai
  model: "@cf/meta/llama-4-scout-17b-16e-instruct"
  max_tokens: 900
  temperature: 0.1
serving:
  rate_limit_per_ip_per_hour: 20
  monthly_query_ceiling: 3000
abstain:
  message: "Not covered."
`;

describe("config", () => {
  it("loads the shipped config/chadbot.yaml", () => {
    const c = loadConfig("config/chadbot.yaml");
    expect(c.retrieval.max_num_results).toBe(8);
    expect(c.generation.model).toBe("@cf/meta/llama-4-scout-17b-16e-instruct");
    expect(c.serving.monthly_query_ceiling).toBe(3000);
    expect(c.abstain.message).toMatch(/isn't covered/);
  });

  it("parses a valid document", () => {
    expect(parseConfig(VALID).generation.provider).toBe("workers-ai");
  });

  it("rejects unknown top-level keys", () => {
    expect(() => parseConfig(VALID + "\nextra: 1\n")).toThrow(/unknown key.*extra/i);
  });

  it("rejects unknown nested keys", () => {
    expect(() => parseConfig(VALID.replace("rerank: true", "rerank: true\n  bogus: 1"))).toThrow(
      /unknown key.*retrieval\.bogus/i,
    );
  });

  it("rejects missing keys", () => {
    expect(() => parseConfig(VALID.replace("  max_tokens: 900\n", ""))).toThrow(
      /generation\.max_tokens/,
    );
  });

  it("rejects wrong types", () => {
    expect(() => parseConfig(VALID.replace("max_num_results: 8", 'max_num_results: "8"'))).toThrow(
      /retrieval\.max_num_results/,
    );
  });

  it("rejects an invalid provider", () => {
    expect(() => parseConfig(VALID.replace("workers-ai", "bogus"))).toThrow(/generation\.provider/);
  });

  it("rejects out-of-range values", () => {
    expect(() => parseConfig(VALID.replace("match_threshold: 0.4", "match_threshold: 1.5"))).toThrow(
      /match_threshold/,
    );
  });
});
