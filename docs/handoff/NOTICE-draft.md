# Notices — passkey Q&A demonstration

_Draft for Brett's sign-off (Phase 5, task 5.3b). Contact address settled as
`privacy@viewridgesecurity.com`. Not yet published._

---

## About this demonstration

This page is a working demonstration by View Ridge Security of corpus-grounded question
answering. It is **not** legal, security or implementation advice, and it is **not a
substitute for the documentation published by the vendors and standards bodies it cites**.
For anything you intend to rely on, read the primary source — every answer links to it.

It is provided as-is, without warranty of any kind, and using it does not create any
professional or advisory relationship with View Ridge Security.

## Where the answers come from

Answers are generated **only** from a curated corpus of primary sources — the W3C WebAuthn
specification, IETF RFCs, NIST digital identity guidelines, CISA guidance, OWASP cheat
sheets, Google's identity documentation and Wikipedia. The bot is instructed to answer from
those sources alone and to **abstain** when they do not cover a question. Abstaining is the
intended behaviour, not a fault: an unsourced answer to a security question is worse than no
answer at all.

The corpus is not secret. It is declared in `config/corpus.yaml` in the public repository,
so anyone can see exactly which sources are used and under which licence.

The corpus has two tiers:

- **Ingested sources** — their text is stored and used to answer questions, and every answer
  that uses one carries that source's required attribution.
- **Cited-only sources** — named and linked, never copied, crawled or stored. This tier
  exists for sources whose terms do not permit reproduction.

## Sources, licences and attribution

Each source is used under its own licence, and each licence's obligations are encoded as
data, not prose. Where a licence requires attribution, the answer displays it. Where a
licence requires that adaptations be shared alike (for example CC BY-SA 4.0), an adaptations
notice is shown with the answer. Public-domain and government works are credited as a
courtesy even where no credit is required.

Some sources are linked but not reproduced, because their terms do not allow it. A link is
not an endorsement, and no source's inclusion implies any affiliation with, or endorsement
of, View Ridge Security. Trademarks named on this page belong to their respective owners.

## Your question and your address

We do not store your questions. There is no question history, and no account or sign-in.

To keep the demonstration available and within budget, two counters are kept:

- a **per-address counter** to enforce an hourly limit. The key is a truncated SHA-256 hash
  of your IP address — not your address in readable form — and it expires after two hours.
- a **monthly counter** for the total number of questions, which contains no address
  information and expires after the following month.

Requests necessarily pass through Cloudflare's infrastructure to be served, and their
handling of that traffic is governed by Cloudflare's own terms and privacy policy.

## Removal and opt-out

If you own or control content in the corpus and would like it removed, write to
**privacy@viewridgesecurity.com**. A URL is enough — you do not need to give a reason, and
you do not need to be the copyright owner to ask us to reconsider a source.

What we do when you ask:

1. We remove the source from `config/corpus.yaml`. Where the point is that we should not
   reproduce your text but may point readers to you, the entry becomes cited-only; where the
   point is that you would rather we did not reference you at all, we delete the entry.
2. We delete the source's stored content from the search index.
3. We record the removal in the repository's changelog, so the change is visible in public
   history rather than made quietly.

We aim to action removals within **five business days**. If our timeline matters to you,
say so and we will tell you where the request has got to.

## Changes

If this notice changes in a way that affects how content or addresses are handled, we will
note it in the repository's changelog rather than editing this page silently.
