import { useRef, useState, type FormEvent } from "react";

/** Mirrors the Citation object emitted by the Worker (src/citations.ts). Kept local so the component has no Worker imports. */
export interface ChatCitation {
  n: number;
  chunkId: string;
  sourceId: string;
  url: string;
  licence: string;
  licenceName: string;
  attribution: string;
  shareAlike: boolean;
  linkRequired: boolean;
}

export interface PasskeyChatProps {
  /** Full URL of the Worker's POST /api/chat route. */
  endpoint: string;
  placeholder?: string;
  /** Link to the public notices page (attribution, takedown contact). */
  noticeUrl?: string;
}

type Phase = "idle" | "loading" | "done" | "abstained" | "error";

const MAX_QUESTION_CHARS = 500; // matches the Worker's limit

/** Only http(s) URLs become links; anything else is shown as plain text. */
const safeHref = (u: string): string | null => (/^https?:\/\//i.test(u) ? u : null);

/** Incremental SSE parser: feed text chunks, get decoded `data:` JSON payloads per complete event. */
function createSseParser(onEvent: (data: unknown) => void) {
  let buf = "";
  return (text: string) => {
    buf += text;
    let i: number;
    while ((i = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = raw
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).replace(/^ /, ""))
        .join("\n");
      if (!data) continue;
      try {
        onEvent(JSON.parse(data));
      } catch {
        /* ignore malformed event */
      }
    }
  };
}

export function PasskeyChat({ endpoint, placeholder = "Ask a question about passkeys", noticeUrl }: PasskeyChatProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<ChatCitation[]>([]);
  const [notices, setNotices] = useState<string[]>([]);
  const [grounded, setGrounded] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || phase === "loading") return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAnswer("");
    setCitations([]);
    setNotices([]);
    setGrounded(true);
    setError("");
    setPhase("loading");

    let acc = "";
    let finished = false;
    const fail = (message: string) => {
      finished = true;
      // Never leave a partial, unsourced answer on screen after a failure.
      setAnswer("");
      setCitations([]);
      setNotices([]);
      setError(message);
      setPhase("error");
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        let message = "Request failed (" + res.status + ").";
        try {
          const body = (await res.json()) as { error?: { message?: string } };
          if (body.error?.message) message = body.error.message;
        } catch {
          /* keep default */
        }
        fail(message);
        return;
      }

      const parse = createSseParser((data) => {
        if (finished || typeof data !== "object" || data === null) return;
        const ev = data as Record<string, unknown>;
        if (typeof ev.token === "string") {
          acc += ev.token;
          setAnswer(acc);
        } else if (ev.error && typeof ev.error === "object") {
          fail((ev.error as { message?: string }).message ?? "Something went wrong. Please try again.");
        } else if (Array.isArray(ev.citations)) {
          finished = true;
          setCitations(ev.citations as ChatCitation[]);
          setNotices(Array.isArray(ev.notices) ? (ev.notices as string[]) : []);
          setGrounded(ev.grounded !== false);
          setPhase(ev.abstained === true ? "abstained" : "done");
        }
      });

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parse(dec.decode(value, { stream: true }));
      }
      parse(dec.decode() + "\n\n");
      if (!finished) fail("The answer was interrupted. Please try again.");
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      fail("Could not reach the service. Please try again.");
    }
  }

  return (
    <section className="passkey-chat">
      <form onSubmit={submit}>
        <label htmlFor="passkey-chat-q" className="passkey-chat__label">
          Your question
        </label>
        <input
          id="passkey-chat-q"
          type="text"
          value={question}
          maxLength={MAX_QUESTION_CHARS}
          placeholder={placeholder}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit" disabled={phase === "loading" || question.trim() === ""}>
          Ask
        </button>
      </form>

      <div aria-live="polite" className="passkey-chat__output">
        {phase === "loading" && answer === "" && <p role="status">Searching the sources…</p>}

        {phase === "error" && <p role="alert">{error}</p>}

        {answer !== "" && (
          <div className={phase === "abstained" ? "passkey-chat__abstain" : "passkey-chat__answer"} data-testid="answer">
            {answer}
          </div>
        )}

        {phase === "done" && !grounded && (
          <p role="note">This answer could not be tied to any source, so treat it as unverified.</p>
        )}

        {citations.length > 0 && (
          <div className="passkey-chat__sources">
            <h3>Sources</h3>
            <ol>
              {citations.map((c) => {
                const href = safeHref(c.url);
                return (
                  <li key={c.n} value={c.n} data-testid="citation">
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {c.url}
                      </a>
                    ) : (
                      <span>{c.url}</span>
                    )}
                    <div className="passkey-chat__attribution">
                      {c.attribution} · {c.licenceName}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {notices.map((n, i) => (
          <p key={i} role="note" className="passkey-chat__notice" data-testid="notice">
            {n}
          </p>
        ))}
      </div>

      {noticeUrl && (
        <p className="passkey-chat__footer">
          <a href={noticeUrl}>Notices, licences and takedown contact</a>
        </p>
      )}
    </section>
  );
}

export default PasskeyChat;
