import { describe, expect, it } from "vitest";
import worker from "../src/index";

describe("worker smoke", () => {
  it("GET /healthz returns 200 and {status:'ok'}", async () => {
    const res = await worker.fetch(new Request("https://example.test/healthz"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("other routes return 501 for now", async () => {
    const res = await worker.fetch(new Request("https://example.test/anything"));
    expect(res.status).toBe(501);
  });
});
