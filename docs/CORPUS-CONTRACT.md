# Corpus contract — chadbot v1 (harness-facing, binding)

This is the operative extract of the corpus specification. Implement it as written.
The full legal analysis is `docs/research/01-corpus-licensing.md` — **operator-only
reference. Do not read it**: at 65 KB it exceeds what this harness can read, and a
Read of that file never returns (see IMPLEMENTATION-PLAN "Known host limitation").

## 1. Two ingestion modes

- **`full`** — the text may be stored, embedded, retrieved, paraphrased, and quoted
  (within the quote cap in §4), with the attribution string from §2 rendered on every
  answer that uses it.
- **`pointer`** — the source must **never** be fetched, crawled, stored, or embedded.
  It exists only to be named and linked in prose. The ingestion CLI must produce
  zero upload items for a `pointer` entry, and a test must prove that.

## 2. Frozen manifest — `config/corpus.yaml`

| source_id | url | licence | mode | attribution to display |
|---|---|---|---|---|
| `w3c-webauthn-3` | https://www.w3.org/TR/webauthn-3/ | `W3C-SDL-2023` | full | Full W3C NOTICE text + doc URL + status "W3C Recommendation"; note that answers are modifications, not W3C text |
| `w3c-webauthn-2` | https://www.w3.org/TR/webauthn-2/ | `W3C-SDL-2023` | full | as above, Level 2 |
| `ietf-rfc8809` | https://www.rfc-editor.org/rfc/rfc8809 | `IETF-TLP` | full | "Extracted from RFC 8809, © IETF Trust and the persons identified as the document authors. Subject to BCP 78 and the IETF Trust's Legal Provisions." |
| `nist-sp800-63b-4` | https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63b-4.pdf | `US-GOV-PD` | full | "Source: NIST SP 800-63B-4, Digital Identity Guidelines — Authentication and Lifecycle Management." (courtesy, not required) |
| `nist-sp800-63b-3` | https://pages.nist.gov/800-63-3/sp800-63b.html | `US-GOV-PD` | full | "Source: NIST SP 800-63B (superseded by SP 800-63B-4)." (courtesy) |
| `cisa-phishing-resistant-mfa` | https://www.cisa.gov/sites/default/files/publications/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf | `US-GOV-PD` | full | "Source: CISA — Implementing Phishing-Resistant MFA." (courtesy) |
| `cisa-more-than-a-password` | https://www.cisa.gov/MFA | `US-GOV-PD` | full | "Source: CISA — More than a Password." (courtesy) |
| `owasp-authentication-cheatsheet` | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | `CC-BY-SA-4.0` | full | "Adapted/Quoted from the OWASP Cheat Sheet Series, 'Authentication Cheat Sheet', <URL> — © OWASP, licensed CC BY-SA 4.0." |
| `owasp-mfa-cheatsheet` | https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Multifactor_Authentication_Cheat_Sheet.md | `CC-BY-SA-4.0` | full | as above, 'Multifactor Authentication Cheat Sheet' |
| `google-identity-passkeys` | https://developers.google.com/identity/passkeys | `CC-BY-4.0` | full | "Portions of this page are reproduced from work created and shared by Google and used according to terms described in the Creative Commons 4.0 Attribution License." + link |
| `wikipedia-passkey` | https://en.wikipedia.org/wiki/Passkey_(authentication) | `CC-BY-SA-4.0` | full | "Source: Wikipedia, 'Passkey (authentication)', <URL> — text available under CC BY-SA 4.0." |
| `wikipedia-webauthn` | https://en.wikipedia.org/wiki/WebAuthn | `CC-BY-SA-4.0` | full | as above, 'WebAuthn' |
| `fido-alliance-specs` | https://fidoalliance.org/specs/ | `CITE-ONLY` | **pointer** | Name + link only. FIDO site terms forbid verbatim copying; specs grant no derivative rights. |
| `mslearn-passkeys` | https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-passkeys-fido2 | `CITE-ONLY` | **pointer** | Name + link only. Learn ToU bars copying/storage/network posting. |
| `apple-passkeys` | https://developer.apple.com/documentation/authenticationservices/supporting-passkeys | `CITE-ONLY` | **pointer** | Name + link only. Apple ToU bars scraping and copying. |
| `yubico-docs` | https://docs.yubico.com/ | `CITE-ONLY` | **pointer** | Name + link only; note YubiKey is a registered trademark. |
| `1password-blog` | https://blog.1password.com/ | `CITE-ONLY` | **pointer** | Name + link only. AgileBits ToS: non-commercial display only. |
| `okta-blog` | https://www.okta.com/blog/ | `CITE-ONLY` | **pointer** | Name + link only. Okta ToS bars automated access and scraping. |

## 3. Licence registry — `src/licences.ts`

Encode as **data**, not prose. The loader must reject an unknown licence id.

| licence id | display name | share_alike | quote_permitted | link_required |
|---|---|---|---|---|
| `W3C-SDL-2023` | W3C Software and Document License 2023 | false | true | true |
| `IETF-TLP` | IETF Trust Legal Provisions | false | true | true |
| `US-GOV-PD` | U.S. Government work — public domain (17 U.S.C. §105) | false | true | false |
| `CC-BY-4.0` | Creative Commons Attribution 4.0 | false | true | true |
| `CC-BY-SA-4.0` | Creative Commons Attribution-ShareAlike 4.0 | **true** | true | true |
| `CITE-ONLY` | Cite and link only — no ingestion permitted | n/a | false | true |

`CITE-ONLY` is valid **only** for `mode: pointer` entries. A test must assert that
no `mode: full` entry carries a licence with `quote_permitted: false`.

## 4. Answer-layer rules (enforce in code and in the prompt)

- Attribution for every source actually used, rendered from §3 — mandatory, and it is
  what the CC licences require. **Attribution is not a licence**: it is displayed
  because the licence demands it, never as a substitute for permission.
- **Quote cap: ≤ 25 words per quote, ≤ 2 quotes per source per answer.** Never
  assemble consecutive quotes that reconstruct a source.
- **Paraphrase-first.** Reserve verbatim text for the quote cap.
- `share_alike: true` sources (OWASP, Wikipedia): if an answer is a close derivative,
  carry a CC BY-SA 4.0 adaptations notice.
- **Abstention runs before generation.** If top retrieval score < threshold, return the
  configured message and do NOT call the model.

## 5. Ingestion gates (implement as code, not convention)

1. **Opt-out gate, fail closed.** Fetch and parse `robots.txt` (including named AI
   agents), `Content-Signal`, and `tdm-reservation`/`tdm-policy`. Blocked, ambiguous,
   or a failed fetch ⇒ do not ingest.
2. **Provenance per item.** Every uploaded item carries `source_id`, `source_url`,
   `licence`, `attribution`, `retrieval_date`.
3. **Pointer entries produce zero items.** Test it.
4. **No paywalled, gated, or login-walled material.** No shadow libraries, no mirrors.
5. **Prefer the licensed copy** where the same content exists under a permissive
   licence elsewhere.
6. Tests must not hit the network. The CLI runs `--dry-run` for everything except the
   upload; the operator performs live ingestion.
