// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PasskeyChat, type ChatCitation } from "../ui/PasskeyChat";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const enc = new TextEncoder();
const sse = (...events: unknown[]) => events.map((e) => "data: " + JSON.stringify(e) + "\n\n");

/** A streamed Response whose body yields the given raw string pieces as separate chunks. */
function streamResponse(pieces: string[], init: ResponseInit = {}): Response {
  return new Response(
    new ReadableStream({
      start(c) {
        for (const p of pieces) c.enqueue(enc.encode(p));
        c.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" }, ...init },
  );
}

const cite = (over: Partial<ChatCitation> = {}): ChatCitation => ({
  n: 1,
  chunkId: "c1",
  sourceId: "webauthn-3",
  url: "https://www.w3.org/TR/webauthn-3/",
  licence: "W3C-SDL-2023",
  licenceName: "W3C Software and Document License",
  attribution: "W3C, Web Authentication Level 3",
  shareAlike: false,
  linkRequired: true,
  ...over,
});

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const render = (props: Partial<Parameters<typeof PasskeyChat>[0]> = {}) =>
  act(() => root.render(<PasskeyChat endpoint="https://worker.test/api/chat" {...props} />));

async function ask(q: string) {
  const input = container.querySelector("input") as HTMLInputElement;
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, q);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  // let the stream drain
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
}

const text = (sel: string) => container.querySelector(sel)?.textContent ?? "";

describe("PasskeyChat", () => {
  it("renders the input with the placeholder and the notice link", () => {
    render({ placeholder: "Ask away", noticeUrl: "https://example.test/notices" });
    expect((container.querySelector("input") as HTMLInputElement).placeholder).toBe("Ask away");
    expect((container.querySelector('a[href="https://example.test/notices"]') as HTMLAnchorElement)).not.toBeNull();
  });

  it("posts the question as JSON to the endpoint", async () => {
    fetchMock.mockResolvedValue(streamResponse(sse({ citations: [], notices: [], grounded: false, abstained: true })));
    render();
    await ask("  What is a passkey?  ");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://worker.test/api/chat");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ question: "What is a passkey?" });
  });

  it("streams tokens (split mid-event) into one answer and lists citations with link and attribution", async () => {
    const [t1, t2, fin] = sse({ token: "Passkeys are credentials [1]." }, { token: " Good." }, {
      citations: [cite()],
      notices: [],
      grounded: true,
      abstained: false,
    });
    // split the first event across two network chunks
    fetchMock.mockResolvedValue(streamResponse([t1.slice(0, 10), t1.slice(10), t2, fin]));
    render();
    await ask("What is a passkey?");

    expect(text('[data-testid="answer"]')).toBe("Passkeys are credentials [1]. Good.");
    const items = container.querySelectorAll('[data-testid="citation"]');
    expect(items).toHaveLength(1);
    const a = items[0].querySelector("a") as HTMLAnchorElement;
    expect(a.href).toBe("https://www.w3.org/TR/webauthn-3/");
    expect(a.rel).toContain("noopener");
    expect(items[0].textContent).toContain("W3C, Web Authentication Level 3");
    expect(items[0].textContent).toContain("W3C Software and Document License");
    expect(container.querySelector('[data-testid="notice"]')).toBeNull();
  });

  it("displays the share-alike notice when present", async () => {
    const notice = "This answer adapts material from sources licensed under CC BY-SA 4.0 (https://x.test).";
    fetchMock.mockResolvedValue(
      streamResponse(
        sse({ token: "Use MFA [1]." }, {
          citations: [cite({ shareAlike: true, licence: "CC-BY-SA-4.0", licenceName: "CC BY-SA 4.0", attribution: "OWASP, MFA Cheat Sheet" })],
          notices: [notice],
          grounded: true,
          abstained: false,
        }),
      ),
    );
    render();
    await ask("MFA?");
    expect(text('[data-testid="notice"]')).toBe(notice);
    expect(text('[data-testid="citation"]')).toContain("OWASP, MFA Cheat Sheet");
  });

  it("shows the abstention message with no sources", async () => {
    fetchMock.mockResolvedValue(
      streamResponse(sse({ token: "That isn't covered by the passkeys material I have." }, { citations: [], notices: [], grounded: false, abstained: true })),
    );
    render();
    await ask("What's the weather?");
    expect(text('[data-testid="answer"]')).toContain("isn't covered");
    expect(container.querySelector(".passkey-chat__abstain")).not.toBeNull();
    expect(container.querySelector('[data-testid="citation"]')).toBeNull();
    expect(container.textContent).not.toContain("unverified");
  });

  it("flags a non-abstained answer that has no valid citation as unverified", async () => {
    fetchMock.mockResolvedValue(
      streamResponse(sse({ token: "Something." }, { citations: [], notices: [], grounded: false, abstained: false })),
    );
    render();
    await ask("q");
    expect(container.textContent).toContain("unverified");
  });

  it.each([
    [429, "rate_limited", "Too many requests. Try again later."],
    [503, "ceiling", "Monthly capacity reached."],
  ])("shows the server's message for HTTP %i", async (status, code, message) => {
    fetchMock.mockResolvedValue(Response.json({ error: { code, message } }, { status }));
    render();
    await ask("q");
    expect(text('[role="alert"]')).toBe(message);
    expect(container.querySelector('[data-testid="answer"]')).toBeNull();
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 502 }));
    render();
    await ask("q");
    expect(text('[role="alert"]')).toBe("Request failed (502).");
  });

  it("on a mid-stream error event, discards the partial answer and shows the error, no citations", async () => {
    fetchMock.mockResolvedValue(
      streamResponse(sse({ token: "Half an ans" }, { error: { code: "generation_interrupted", message: "The answer was interrupted. Please try again." } })),
    );
    render();
    await ask("q");
    expect(text('[role="alert"]')).toBe("The answer was interrupted. Please try again.");
    expect(container.querySelector('[data-testid="answer"]')).toBeNull();
    expect(container.querySelector('[data-testid="citation"]')).toBeNull();
  });

  it("treats a stream that ends without a final event as an error", async () => {
    fetchMock.mockResolvedValue(streamResponse(sse({ token: "partial" })));
    render();
    await ask("q");
    expect(text('[role="alert"]')).toContain("interrupted");
    expect(container.querySelector('[data-testid="answer"]')).toBeNull();
  });

  it("shows an error when the network call rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("failed to fetch"));
    render();
    await ask("q");
    expect(text('[role="alert"]')).toContain("Could not reach");
  });

  it("does not link non-http(s) citation URLs", async () => {
    fetchMock.mockResolvedValue(
      streamResponse(sse({ token: "x [1]" }, { citations: [cite({ url: "javascript:alert(1)" })], notices: [], grounded: true, abstained: false })),
    );
    render();
    await ask("q");
    expect(container.querySelector('[data-testid="citation"] a')).toBeNull();
  });

  it("does not submit an empty question", async () => {
    render();
    await ask("   ");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
