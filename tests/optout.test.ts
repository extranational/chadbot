import { describe, expect, it } from "vitest";
import {
  checkOptOut,
  evaluateResponseSignals,
  evaluateRobots,
  type Fetcher,
  type FetchedResponse,
} from "../src/ingest/optout";

const URL_ = "https://example.test/docs/page";

function res(status: number, body = "", headers: Record<string, string> = {}): FetchedResponse {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { status, headers: { get: (n: string) => h.get(n.toLowerCase()) ?? null }, text: async () => body };
}

/** Fixture fetcher: robots.txt and page (HEAD) responses; no network. */
function fx(robots: FetchedResponse | Error, page: FetchedResponse | Error = res(200)): Fetcher {
  return async (url, init) => {
    const r = url.endsWith("/robots.txt") ? robots : page;
    if (!url.endsWith("/robots.txt")) expect(init?.method).toBe("HEAD");
    if (r instanceof Error) throw r;
    return r;
  };
}

describe("evaluateRobots", () => {
  it("blocks Disallow: / for User-agent: *", () => {
    expect(evaluateRobots("User-agent: *\nDisallow: /\n", "/docs/page").allowed).toBe(false);
  });

  it.each(["GPTBot", "CCBot", "ClaudeBot", "Google-Extended"])("blocks named AI agent %s", (agent) => {
    const r = evaluateRobots(`User-agent: ${agent}\nDisallow: /\n\nUser-agent: *\nAllow: /\n`, "/docs/page");
    expect(r.allowed).toBe(false);
    expect(r.reasons.join(" ")).toContain(agent);
  });

  it("matches agent names case-insensitively and across stacked User-agent lines", () => {
    const r = evaluateRobots("User-agent: foo\nuser-agent: gptbot\nDisallow: /\n", "/x");
    expect(r.allowed).toBe(false);
  });

  it("blocks Content-Signal: ai-train=no, search=no", () => {
    const r = evaluateRobots("User-agent: *\nAllow: /\nContent-Signal: ai-train=no, search=no\n", "/docs/page");
    expect(r.allowed).toBe(false);
  });

  it("blocks when any content signal is no, even if others are yes", () => {
    expect(evaluateRobots("Content-Signal: search=yes, ai-input=no, ai-train=yes\n", "/").allowed).toBe(false);
  });

  it("blocks a malformed Content-Signal (ambiguous => closed)", () => {
    expect(evaluateRobots("Content-Signal: ai-train=maybe\n", "/").allowed).toBe(false);
    expect(evaluateRobots("Content-Signal: garbage\n", "/").allowed).toBe(false);
  });

  it("allows when all content signals are yes", () => {
    expect(evaluateRobots("User-agent: *\nAllow: /\nContent-Signal: ai-train=yes, search=yes, ai-input=yes\n", "/").allowed).toBe(true);
  });

  it("allows when there are no signals", () => {
    expect(evaluateRobots("User-agent: *\nDisallow: /private/\n", "/docs/page").allowed).toBe(true);
    expect(evaluateRobots("", "/docs/page").allowed).toBe(true);
    expect(evaluateRobots("User-agent: *\nDisallow:\n", "/docs/page").allowed).toBe(true);
  });

  it("applies path rules: longest match wins, Allow wins ties, wildcards and $ work", () => {
    const body = "User-agent: *\nDisallow: /docs/\nAllow: /docs/page\n";
    expect(evaluateRobots(body, "/docs/page").allowed).toBe(true);
    expect(evaluateRobots(body, "/docs/other").allowed).toBe(false);
    expect(evaluateRobots("User-agent: *\nDisallow: /*.pdf$\n", "/a/b.pdf").allowed).toBe(false);
    expect(evaluateRobots("User-agent: *\nDisallow: /*.pdf$\n", "/a/b.pdf?x=1").allowed).toBe(true);
  });

  it("ignores comments", () => {
    expect(evaluateRobots("# Disallow: /\nUser-agent: * # all\nDisallow: /nothing # none\n", "/x").allowed).toBe(true);
  });
});

describe("evaluateResponseSignals", () => {
  it("blocks tdm-reservation: 1 header", () => {
    expect(evaluateResponseSignals({ get: (n) => (n === "tdm-reservation" ? "1" : null) }).allowed).toBe(false);
  });
  it("allows tdm-reservation: 0", () => {
    expect(evaluateResponseSignals({ get: (n) => (n === "tdm-reservation" ? "0" : null) }).allowed).toBe(true);
  });
  it("blocks an unparseable tdm-reservation value", () => {
    expect(evaluateResponseSignals({ get: (n) => (n === "tdm-reservation" ? "yes?" : null) }).allowed).toBe(false);
  });
  it("blocks any tdm-policy header (cannot evaluate policy => closed)", () => {
    expect(evaluateResponseSignals({ get: (n) => (n === "tdm-policy" ? "https://x.test/p.json" : null) }).allowed).toBe(false);
  });
  it("blocks a Content-Signal header with a no", () => {
    expect(evaluateResponseSignals({ get: (n) => (n === "content-signal" ? "ai-train=no" : null) }).allowed).toBe(false);
  });
  it("blocks tdm-reservation / tdm-policy / content-signal meta tags in the body", () => {
    const none = { get: () => null };
    expect(evaluateResponseSignals(none, '<meta name="tdm-reservation" content="1">').allowed).toBe(false);
    expect(evaluateResponseSignals(none, "<meta content='1' name='tdm-reservation'>").allowed).toBe(false);
    expect(evaluateResponseSignals(none, '<meta name="tdm-policy" content="https://x.test/p">').allowed).toBe(false);
    expect(evaluateResponseSignals(none, '<meta name="content-signal" content="ai-input=no">').allowed).toBe(false);
  });
  it("allows when there are no signals", () => {
    expect(evaluateResponseSignals({ get: () => null }, "<html></html>").allowed).toBe(true);
  });
});

describe("checkOptOut (fixtures, fails closed)", () => {
  it("allows when robots.txt is clean and the page carries no signals", async () => {
    const r = await checkOptOut(URL_, fx(res(200, "User-agent: *\nAllow: /\n")));
    expect(r.allowed).toBe(true);
  });

  it("blocks on robots Disallow", async () => {
    expect((await checkOptOut(URL_, fx(res(200, "User-agent: *\nDisallow: /\n")))).allowed).toBe(false);
  });

  it("blocks on a tdm-reservation header from the page", async () => {
    const r = await checkOptOut(URL_, fx(res(200, ""), res(200, "", { "TDM-Reservation": "1" })));
    expect(r.allowed).toBe(false);
  });

  it("FAILS CLOSED: robots.txt fetch throws => blocked", async () => {
    const r = await checkOptOut(URL_, fx(new Error("network down")));
    expect(r.allowed).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/robots\.txt.*fail/i);
  });

  it("FAILS CLOSED: page header fetch throws => blocked", async () => {
    const r = await checkOptOut(URL_, fx(res(200, ""), new Error("timeout")));
    expect(r.allowed).toBe(false);
  });

  it("FAILS CLOSED: reading the robots body throws => blocked", async () => {
    const broken: FetchedResponse = { status: 200, headers: { get: () => null }, text: async () => { throw new Error("reset"); } };
    expect((await checkOptOut(URL_, fx(broken))).allowed).toBe(false);
  });

  it.each([401, 403, 404, 410, 429, 500, 503])("FAILS CLOSED: robots.txt status %i => blocked", async (status) => {
    expect((await checkOptOut(URL_, fx(res(status)))).allowed).toBe(false);
  });

  it("FAILS CLOSED: page HEAD returns a non-2xx => blocked", async () => {
    expect((await checkOptOut(URL_, fx(res(200, ""), res(405)))).allowed).toBe(false);
  });

  it("FAILS CLOSED: unparseable URL => blocked", async () => {
    expect((await checkOptOut("not a url", fx(res(200, "")))).allowed).toBe(false);
  });

  it("always reports at least one reason when blocked", async () => {
    const r = await checkOptOut(URL_, fx(new Error("x")));
    expect(r.reasons.length).toBeGreaterThan(0);
  });
});
