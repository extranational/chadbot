# Chadbot Corpus — Licensing & Permissions Assessment

**Project:** Chadbot — a public, non-commercial-ish Retrieval-Augmented Generation (RAG) Q&A bot on passkeys / WebAuthn / MFA, hosted by View Ridge Security (a security consultancy).
**Artifact assessed:** ingesting public passkeys/MFA documentation into a vector index, chunking/embedding it, and synthesizing answers that cite back to source URLs (paraphrase plus short quotations).
**Date:** 2026-10-13
**Prepared for:** the consultancy owner (technically strong, not a lawyer).

> **Non-legal-advice caveat.** This is a good-faith, source-documented assessment prepared by a non-lawyer agent, not legal advice. It states the law and the sources' own terms as researched on 2026-10-13. Have counsel review before launch if the bot is commercial, brand-critical, or funds-relevant.

---

## 0. The direct answer: does citing make it allowed to ingest and synthesize?

**No. Citation does not create a license, and citing a source does not, by itself, grant permission to ingest, store, paraphrase, or quote it.** Three separate legal mechanisms are frequently confused:

1. **Permission (a licence or a statutory exception).** The rightsholder grants rights, or the law grants an exception (fair use / fair dealing / an EU TDM exception). This is what actually authorizes ingestion.
2. **Attribution.** A credit line. It is *consequential*, never *generative* — it changes the risk calculus and satisfies some licences, but it cannot manufacture a right that does not exist.
3. **Cite-back / link.** A courtesy and a discovery norm; sometimes a licence requirement (IETF, CC), never a substitute for permission.

**What attribution actually does — and does not do:**

- **It is NOT a licence.** Repeating "source: example.com" while ignoring a site's Terms of Use or an express reservation of rights does not make the copying lawful. In US law, attribution is not even one of the four fair-use factors; it is *evidence* that supports factor 1 (purpose and character — a scholarly, transformative, non-substitutive use). In several cases courts praised quotation-with-attribution as a hallmark of fair use (e.g., *Author's Guild v. Google*, "snippet" display with pointers back to the source, below). That is evidentiary, not a grant.
- **It is a licence *condition* for some licences.** For **CC BY** and **CC BY-SA** content (Google Developers docs, Microsoft Learn GitHub docs, Wikipedia, OWASP), attribution is *mandatory*; omitting it is itself a licence breach. For the **IETF Trust Legal Provisions**, attribution to IETF plus the RFC number is a *condition* of the verbatim-reproduction licence. So "attribution is required" is true *because those licences say so*, not because attribution is a general law.
- **It is legally required vs. merely courteous** — the split:
  - **Legally required (to keep the licence):** CC BY / CC BY-SA (Google, Microsoft-docs-on-GitHub, Wikipedia, OWASP, CC-licensed arXiv/ACM papers); IETF RFCs (attribute + include the RFC legend when reproducing >1/5 of the text).
  - **Merely courteous (a fair-use tailwind, not a duty):** US-government works (NIST, CISA) — public domain; NIST explicitly says "Attribution would, however, be appreciated" but is not required. Likewise attribution to Microsoft/Apple/Okta/Yubico/1Password when we paraphrase facts under fair use is a professional-courtesy and risk-reduction measure, not a legal condition.
- **It does not authorize bulk ingestion.** A site can be perfectly happy to be *cited* while its Terms of Use still prohibit *scraping, copying, storage, or derivatives* (Okta, Apple, Microsoft Learn, FIDO). Citation and ingestion are different acts; a permissive attitude toward the former says nothing about the latter.

**Bottom line for Chadbot:** lawful ingestion must rest on (a) a permissive licence (W3C, CC BY, CC BY-SA, IETF TLP, US-Gov public domain, USENIX non-commercial), or (b) fair use / an EU TDM exception for the rest. Attribution is then *added* to comply with those licences and to strengthen the fair-use posture — it is never the thing that makes ingestion lawful in the first place.

---

## 1. Summary table (one row per source)

Legend — **FULL_INGEST** = may store text + generate answers + quote; **INGEST_SUMMARIZE** = may ingest and paraphrase, quotes need care; **SUMMARIZE_ONLY** = do not store full text, use for reference/pointer only (paraphrase facts + link); **DO_NOT_INGEST** = avoid.

| # | Source (owner) | Own terms — operative point | Verdict | Attribution / notice to display |
|---|---|---|---|---|
| 1 | **FIDO Alliance** specs + fidoalliance.org (FIDO Alliance, Inc.) | Site TOU: "You may not copy text from the FIDO Alliance Site verbatim"; specs: "No rights are granted to prepare derivative works… Entities seeking permission to reproduce portions… must contact the FIDO Alliance"; published specs "may be used as reference material or cited from another document." | **SUMMARIZE_ONLY** | Cite spec title/version + URL, "© FIDO Alliance." No verbatim quotes without written permission. |
| 2 | **W3C WebAuthn L2/L3** (W3C) | WebAuthn uses the **W3C Software and Document License 2023**: "Permission to copy, modify, and distribute this work… for any purpose and without fee or royalty is hereby granted, provided that you include… the full text of this NOTICE… [and] notice of any changes." | **FULL_INGEST** | Include W3C notice + link to doc + document status. |
| 3 | **Other W3C specs** (W3C) | **W3C Document License 2023**: copy/distribute in any medium for any purpose without fee, *provided* you include a URL + the copyright notice + the document STATUS. "No right to create modifications or derivatives… is granted." | **FULL_INGEST** (quotes/paraphrase OK; don't republish as a competing spec) | URL + copyright notice + status. |
| 4 | **IETF RFCs** e.g. RFC 8809 (IETF Trust) | TLP §3.c: licence "to copy, publish, display and distribute IETF Contributions and IETF Documents in full and without modification," and "unmodified portions," *provided* each portion "is clearly attributed to IETF and identifies the RFC." No licence to modify outside the standards process. | **FULL_INGEST** (verbatim + quotes expressly licensed) | Attribute to IETF + RFC number; include the RFC's copyright/licence legend when reproducing >1/5 of the text. |
| 5 | **NIST SP 800-63B / NIST pubs** (NIST, US Gov) | "not subject to copyright in the United States. Attribution would, however, be appreciated by NIST." | **FULL_INGEST** | Courtesy: "Source: NIST SP 800-63B…" (+ link). Not required. |
| 6 | **CISA guidance pages** (CISA, US Gov) | CISA Linking Policy: "It is a public domain website"; US-Gov works have no US copyright (17 U.S.C. §105). | **FULL_INGEST** | Courtesy: cite CISA + link. Flag any third-party material embedded in a page. |
| 7 | **OWASP Cheat Sheet Series** (OWASP Foundation) | Footer + LICENSE.md: **CC BY-SA 4.0**. | **FULL_INGEST** (ShareAlike) | Credit OWASP + sheet title + link + "CC BY-SA 4.0"; adaptations must carry the same licence. |
| 8 | **Microsoft Learn / Entra passkey docs** (Microsoft) | Learn TOU: "for your personal and non-commercial use. You may not modify, copy, distribute… create derivative works… (except for your own, personal, non-commercial use)"; documents: personal/non-commercial, "no modifications," not to be "posted on any network computer." **But** the *same* content source on GitHub is CC BY 4.0 (e.g. `MicrosoftDocs/azure-docs`), and the TOU says explicit licences control. | **SUMMARIZE_ONLY** for learn.microsoft.com; **FULL_INGEST** where the content is taken from a CC BY 4.0 GitHub source | For CC BY 4.0 source: "Microsoft Docs, `MicrosoftDocs/<repo>` — CC BY 4.0." |
| 9 | **Google Identity / Chrome passkeys docs** (Google) | Google Developers Site Policies: content **CC BY 4.0**; code samples Apache 2.0; trademarks excluded; attribution required. | **FULL_INGEST** | Google's wording: "Portions of this page are reproduced from work created and shared by Google and used according to terms described in the Creative Commons 4.0 Attribution License." + link-back. |
| 10 | **Apple developer docs / Passkeys Overview** (Apple Inc.) | Apple Site Terms: "no part of the Site and no Content may be copied, reproduced, republished… without Apple's express prior written consent"; docs usable "only for your personal, non-commercial informational purpose… make no modifications"; "You may not use any 'deep-link', 'page-scrape', 'robot', 'spider'… to access… the Site." | **SUMMARIZE_ONLY** (do not crawl/store; paraphrase facts + link) | Cite "Apple Developer Documentation — *Supporting passkeys*, <URL> (Apple Inc.)." No verbatim quote without permission. |
| 11 | **Yubico blog & docs** (Yubico AB) | Website Terms: no content-reproduction licence (the "CC ShareAlike" note applies to the *terms document itself*); docs: "© Copyright 2026, Yubico AB"; Toolset licence: "Yubico does not license… any documentation to You." | **SUMMARIZE_ONLY** | Cite Yubico + doc/blog title + link; note Yubico/YubiKey are registered trademarks. |
| 12 | **1Password security blog** (AgileBits Inc. / 1Password) | ToS: "The Service and all contents… are the property of AgileBits Inc. and are protected by copyright"; "You may display and copy, download or print portions… only for your own non-commercial use. Any other use is strictly prohibited." | **SUMMARIZE_ONLY** | Cite 1Password + post title + link. Paraphrase facts only. |
| 13 | **Okta security blog** (Okta, Inc.) | Website Terms: "No rights are granted to you unless expressly stated"; prohibited uses include "Accessing the Site via automated means (crawlers, scripts)" and "Scraping, copying, reselling, or duplicating Site content without written permission." | **SUMMARIZE_ONLY** (do not crawl; read + paraphrase facts + link) | Cite Okta + post title + link. |
| 14 | **Wikipedia articles** (Wikimedia community / WMF) | Text licensed **CC BY-SA 4.0** (dual with GFDL); "can be copied, modified, and redistributed if and only if the copied version is made available on the same terms… and acknowledgment of the authors… included." | **FULL_INGEST** (ShareAlike) | Hyperlink/URL to the article + "Text available under CC BY-SA 4.0"; adaptations re-licensed CC BY-SA 4.0. Honour the Wikimedia robot/UA policy when crawling. |
| 15 | **arXiv preprints** (authors; arXiv licence) | Default is the "arXiv.org perpetual, non-exclusive license" which "does not grant further reuse permissions"; a minority carry **CC** licences. Metadata is **CC0**. | **SUMMARIZE_ONLY** by default; **FULL_INGEST** if the e-print carries a CC licence | Cite authors + arXiv ID + URL; add the paper's CC licence when present. |
| 16 | **ACM published papers** (authors / ACM) | Since 2023 authors retain © and grant ACM a non-exclusive licence; from 2026 all ACM articles are Open Access; ACM offers **CC** options; ACM itself may license works "for training by LLMs." | **FULL_INGEST** for **CC-licensed** ACM papers; otherwise **SUMMARIZE_ONLY**/cite | Author(s) + title + DOI + the applicable CC licence. |
| 17 | **USENIX papers** (authors; USENIX) | USENIX "permits authors to retain their ownership of the copyrights in their works." Standard consent notice: "Permission is granted for the noncommercial reproduction of the complete work for educational or research purposes." | **FULL_INGEST** if the use is genuinely non-commercial educational/research; else **INGEST_SUMMARIZE** | Cite authors + paper title + USENIX URL; reproduce the USENIX non-commercial notice. |

---

# PART A — General legal framework

## A1. US copyright

### A1.1 What is (and is not) protected — facts, ideas, government works

Lead: **Protectable:** the *expression* (wording, structure, selection/arrangement). **Not protectable:** the *facts, ideas, procedures, processes, systems, methods of operation, concepts, principles, discoveries* — however described. This is the single most important rule for a technical Q&A bot, because most of a passkey spec's *substance* (how a challenge/response works, what a "user verification flag" does) is uncopyrightable fact/method even though the spec's *wording* is protected.

- **17 U.S.C. §102(b):** "In no case does copyright protection for an original work of authorship extend to any idea, procedure, process, system, method of operation, concept, principle, or discovery, regardless of the form in which it is described, explained, illustrated, or embodied in such work." — https://www.law.cornell.edu/uscode/text/17/102
- **Facts** are likewise unprotected (the "idea/expression" and "merger"/"scènes à faire" doctrines); the leading modern statement is *Feist Publications v. Rural Telephone Service*, 499 U.S. 340 (1991) (facts are not copyrightable; creativity is the touchstone). — summary: https://www.copyright.gov/fair-use/ (Fair Use Index) and https://supreme.justia.com/cases/federal/us/499/340/
- **17 U.S.C. §105 — US Government works:** "Copyright protection under this title is not available for any work of the United States Government…" — https://www.law.cornell.edu/uscode/text/17/105 . This makes **NIST** and **CISA** publications public domain (though the government may still hold copyrights *assigned* to it, and government sites sometimes embed third-party material that is *not* public domain — check each page).

### A1.2 The four fair-use factors (17 U.S.C. §107) and how they apply to Chadbot

**§107 text:** fair use considers "(1) the purpose and character of the use, including whether such use is of a commercial nature or is for nonprofit educational purposes; (2) the nature of the copyrighted work; (3) the amount and substantiality of the portion used in relation to the copyrighted work as a whole; and (4) the effect of the use upon the potential market for or value of the copyrighted work." — https://www.law.cornell.edu/uscode/text/17/107

Applied to our four activities:

**(a) Bulk ingestion for indexing.**
- *Factor 1 (purpose/character):* Copying to build a searchable index is **transformative** — the copy serves a different function (retrieval/pointing) than the original (reading). This is the crux of *Authors Guild v. Google* and *Kelly v. Arriba Soft* (below). Making the whole corpus non-commercial-ish strengthens this.
- *Factor 2 (nature):* Chapters of *facts/functional* works (specs, cheat sheets, How-tos) weigh *toward* fair use; purely creative expression (a vendor's carefully worded marketing blog) weighs *against*.
- *Factor 3 (amount):* Copying *entire works* for indexing is tolerated where **what is exposed to users** is limited (Google Books copied whole books but showed only snippets). Internal full-text storage is not by itself fatal; **output** design is what matters.
- *Factor 4 (market):* Little/no market harm where the bot does not substitute for the source and *drives traffic back* to it. This is exactly the "link-back" norm Cloudflare describes as the original web bargain (see A3).

**(b) Retrieval (query-time fetch/embedding lookup).** Retrieval is the same copy used for a different purpose; it inherits (a)'s analysis and adds no new copying.

**(c) Paraphrased answer output.** The strongest factor-1 posture: the bot produces *new* text about *facts*. Paraphrase of facts is not infringement at all (facts are uncopyrightable); paraphrase that tracks a source's *expression* too closely risks being a derivative, so the practical rule is **paraphrase the substance, not the sentences**. Keep answers short and source-citing; do not reconstruct a source document through many chunk-retrievals.

**(d) Short verbatim quotations.** Fair use favors quotation that is (i) brief, (ii) attributed, (iii) *illustrative* rather than substitutional. Design rule: **quote the operative sentence, not the paragraph**; cap quote length; always attach the citation. Note: for **CC BY / CC BY-SA** and **IETF** sources a longer quote is separately *licensed*, so quotation there is easier.

### A1.3 Precedent — what the cases actually held and how much transfers

- **Authors Guild v. Google, Inc., 804 F.3d 202 (2d Cir. 2015).** Google scanned 20M+ library books, made a search index, and displayed **snippets**. Held **fair use** — transformative; full-text copying was "not dispositive" because the amount *shown to users* was limited; snippet view was "cumbersome, disjointed, and incomplete" and no significant substitute. *Transfers strongly:* our index-and-cite architecture is the same shape. *Does not transfer:* Google showed snippets of *books*; we would *synthesize prose*, which is a further step a court has not blessed for a commercial product. — https://law.justia.com/cases/federal/appellate-courts/ca2/13-4829/13-4829-2015-10-16.html ; https://www.copyright.gov/fair-use/summaries/authorsguild-google-2dcir2015.pdf
- **Kelly v. Arriba Soft Corp., 336 F.3d 811 (9th Cir. 2003).** Image search engine made **thumbnails**. Held **fair use** — transformative ("a tool to help index and improve access to images"), no market harm. *Transfers:* the indexing/pointing rationale.
- **Perfect 10, Inc. v. Amazon.com, Inc., 508 F.3d 1146 (9th Cir. 2007).** Thumbnails **highly transformative** (a "pointer directing a user to a source of information"), preliminary injunction vacated; also adopted the **"server test"** (inline-linking/framing is not a display by the linker). *Transfers:* pointing/indexing; *caution:* does not authorize re-serving full content. — https://casetext.com/case/perfect-10-inc-v-amazoncom-inc-1
- **Campbell v. Acuff-Rose Music, 510 U.S. 569 (1994).** Origin of "**transformative**" and the rule that commerciality is not presumptively dispositive. Baseline doctrine.
- **Bartz v. Anthropic PBC, No. 3:24-cv-05417 (N.D. Cal. June 23, 2025)** (post-2023 AI-training decision). Judge Alsup held: training LLMs on **lawfully acquired** books was "quintessentially transformative" fair use; making a permanent digital **library** of *lawfully acquired* print books was fair use (*format change*); but downloading and *keeping* books from **pirate** sources was **not** fair use, and pirated copies tainted the library. *Transfers:* storing copies *you lawfully obtained*, and transformative downstream use, are supportive; **provenance matters** — never ingest from shadow libraries or pirate mirrors. (Case later settled.) — https://www.afslaw.com/perspectives/alerts/landmark-ruling-ai-copyright-fair-use-vs-infringement-bartz-v-anthropic ; https://legalblogs.wolterskluwer.com/copyright-blog/the-bartz-v-anthropic-settlement-understanding-americas-largest-copyright-settlement/
- **Thomson Reuters Enterprise Centre GmbH v. Ross Intelligence Inc., 2025 WL … (D. Del. Feb. 11, 2025).** The court **reversed its 2023 position and denied fair use**: Ross's use of Westlaw **headnotes** to train a competing legal-research AI was *not* transformative (it was "intermediate copying" aimed at a market *substitute*) and harmed the plaintiff's market. *Transfers as a warning:* the more the bot competes with, or substitutes for, the source (e.g., rebuilding a vendor's doc set as a rival Q&A), the weaker the fair use. Our *cite-back, non-substitutive* design is the opposite posture — keep it that way. — https://www.ded.uscourts.gov/sites/ded/files/opinions/20-613_5.pdf

**Net:** US fair use supports a public, cite-back, non-substitutive, paraphrase-first bot fairly well — *for the US*. It does **not** travel well: the EU/UK have narrower, enumerated exceptions (below), so build to the stricter standard.

## A2. EU / UK

Lead: **In the EU there is a broad text-and-data-mining (TDM) exception you can likely rely on for publicly accessible web content — *unless the rightsholder has reserved the right*.** In the **UK** there is **no** general/commercial TDM exception, so the UK default is "permission required."

- **DSM Directive (EU) 2019/790** — https://eur-lex.europa.eu/eli/dir/2019/790
  - **Art. 3 — TDM for scientific research.** An *unwaivable* exception for "reproductions and extractions made by **research organisations and cultural heritage institutions**… for the purposes of scientific research." — https://www.legislation.gov.uk/eudr/2019/790/article/3 . **This does not fit Chadbot** unless a genuine research organisation operates it.
  - **Art. 4 — general TDM exception.** For "reproductions and extractions of **lawfully accessible** works… for the purposes of text and data mining" — **but it applies only if the use "has not been expressly reserved by their rightholders in an appropriate manner, such as machine-readable means in the case of content made publicly available online."** — https://www.legislation.gov.uk/eudr/2019/790/article/4 . So: (i) EU TDM of *publicly accessible* pages is permitted **by default**, (ii) *unless* the rightsholder opted out via a machine-readable reservation (robots.txt/TDMRep/Content-Signals — see A3), and (iii) copies may be retained "for as long as is necessary." Note the exception covers *reproduction/extraction*, not the *communication to the public* of the output — the synthesis step still needs its own footing (quoting, short-extract rules, etc.).
  - **Art. 15 — press publishers' right.** Gives press publishers an online-reproduction right in "press publications," but it **excludes "individual words or very short extracts,"** excludes **hyperlinking**, and excludes non-commercial uses by individual users; it **expires two years** after publication. — https://www.legislation.gov.uk/eudr/2019/790/article/15 . Relevant if we ever ingest news/blog journalism; our short quotes + links sit inside the carve-outs.
  - **Sui generis database right — Directive 96/9/EC.** Protects the *investment* in obtaining/verifying/presenting the *contents* of a database against extraction/re-utilisation — **and Art. 4 (TDM) and Art. 3 expressly override Art. 7(1)** of the database directive. — https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:31996L0009 . Relevance: an *index we build* is our own; we must not bulk-extract a *third party's* compiled database (e.g., a scraped vendor doc-portal as a whole).
  - **UK position (post-Brexit).** The UK retains **only** the narrow **CDPA s.29A**: copies for **"text and data analysis for non-commercial research"** — the copy must be made by "a person who has lawful access," for "research for a non-commercial purpose," "accompanied by a sufficient acknowledgement," and **may not be transferred to anyone else nor used for any other purpose**. — https://www.legislation.gov.uk/ukpga/1988/48/section/29A . The UK **abandoned** the planned broad/commercial TDM exception (2023). So the UK default is: no exception for a commercial or public-facing use → rely on licence or UK fair dealing (criticism/review/quotation), which is narrow. **Practical consequence:** because Chadbot is public on the web, assume it is exposed to UK/EU law; design to the EU Art. 4 default **and honour opt-outs**, and treat UK-only rightsholders conservatively.

## A3. Machine-readable signals: robots.txt, TDMRep, ai.txt, Content-Signals

Lead: **robots.txt is not a statute and, per the latest US authority, is not a "technological measure" either — it is normative, not magic.** But an opt-out signal *is* legally operative under **EU Art. 4(3)**, and ignoring signals is powerful evidence of bad faith in a fair-use or contract analysis. Treat signals as **binding where the EU applies, and as a strong presumption everywhere else.**

- **robots.txt — legal status.** Not a law and not automatically a contract. robotstxt.org: "There is no law stating that /robots.txt must be obeyed, nor does it constitute a binding contract…" — https://www.robotstxt.org/faq/legal.html . Courts have nonetheless treated robots.txt as relevant to *trespass-to-chattels / CFAA / contract* analyses. 
- **Ziff Davis v. OpenAI (S.D.N.Y. Dec. 15, 2025)** — the most on-point recent ruling. Ziff Davis argued OpenAI's GPTBot ignored its robots.txt, violating DMCA **§1201(a)**. The court **rejected it**: "Robots.txt files… do not 'effectively control' access… any more than a sign requesting that visitors 'keep off the grass' effectively controls access to a lawn… A web crawler need not 'apply… information…' in order to gain access… it may access the content without taking any affirmative step other than impertinently disregarding the request… This is not 'circumvention' under the DMCA." — analysis + quote: https://blog.ericgoldman.org/archives/2025/12/are-robots-txt-instructions-legally-binding-ziff-davis-v-openai.htm . **Takeaway:** ignoring robots.txt is *not* automatically a DMCA violation — but the DMCA is not the only hook (contract, EU Art. 4), and courts plainly view ignoring signals unfavorably.
- **Scraping and terms of service.** Two poles: *hiQ Labs v. LinkedIn* (9th Cir.) — scraping **public** data likely is **not** "without authorization" under the CFAA — https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn ; vs. **Meta v. Bright Data (N.D. Cal. Jan. 2024)** — Meta lost on breach-of-contract when scrapers were logged-out and not bound by its terms. — https://storage.courtlistener.com/recap/gov.uscourts.cand.406956/gov.uscourts.cand.406956.181.0_1.pdf . Practical rule: **contract terms bite when you are a bound user (logged-in / accepted ToS); CFAA is a weak hook for public pages; robots.txt alone is neither.** So vendor sites whose ToS bar scraping (Okta, Apple, Microsoft Learn) are the real risk.
- **TDMRep (Text & Data Mining Reservation Protocol).** A W3C Community Group protocol (Final Report, 10 May 2024) that expresses a **reservation of TDM rights** via `tdm-reservation` (a `tdm.txt` / HTTP header / HTML/EPUB/PDF metadata) and a machine-readable **TDM policy** (`tdm-policy`) — https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/ . It is explicitly designed to give effect to **EU Art. 4(3)** opt-outs.
- **Cloudflare Content Signals Policy + default AI-crawler blocking.** Cloudflare (Sept 24, 2025) extended robots.txt with three machine-readable signals — `search`, `ai-input`, `ai-train` — and states that "**ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF RIGHTS UNDER ARTICLE 4** of… Directive 2019/790." — https://blog.cloudflare.com/content-signals-policy/ . Cloudflare (July 1, 2025) also began **blocking AI crawlers by default** for its customers — https://www.cloudflare.com/press/press-releases/2025/cloudflare-just-changed-how-ai-crawlers-scrape-the-internet-at-large/ . If a source is Cloudflare-fronted with default settings, our crawler may simply be blocked — and the block is an expression of intent we should respect.
- **ai.txt / IETF AIPREF.** A proposed `.well-known/ai.txt` / `Content-Usage` mechanism and the IETF **AIPREF** working group are standardizing a machine-readable AI-preferences vocabulary and how to attach it to content — https://www.ietf.org/blog/aipref-wg/ ; https://datatracker.ietf.org/doc/draft-ietf-aipref-attach/ ; ai.txt draft: https://www.ietf.org/archive/id/draft-car-ai-txt-wellknown-00.html . Not yet final standards; treat as **voluntary signals we honour** and monitor.

**Rule of thumb:** before ingesting any source, (1) read its `robots.txt` for AI user-agents and any `Content-Signal`/`tdm-reservation`, (2) read its ToS for scraping/derivative/AI clauses, (3) if either says "no," do not bulk-ingest — fall back to SUMMARIZE_ONLY (paraphrase facts + link).

## A4. Practical compliance rules for a defensible public bot

Lead: the ingest pipeline must encode permission *before* it ingests, and the answer layer must be built to be **non-substitutive**.

**Ingestion policy (build these as code gates, not vibes):**
1. **Allow-list first.** Ingest only sources whose licence or public-domain status is recorded in an allow-list (this document is that registry). Default-deny for anything not on it.
2. **Honour opt-outs mechanically.** Fetch and parse `robots.txt` (including named AI agents), `Content-Signal`, and `tdm-reservation`/`tdm-policy`; skip disallowed paths/agents. Respect HTTP 429/403; identify our crawler with an honest User-Agent and a contact URL.
3. **No paywalled / gated / login-walled content.** No shadow libraries, no pirate mirrors, no bypassing paywalls (this is where *Bartz* draws the line). Record gated items on a "watch list" (Appendix A) but do not ingest.
4. **Provenance metadata per chunk.** Store source URL, retrieval date, licence ID, and the attribution string alongside each chunk, so every answer can render the correct notice.
5. **Prefer the licensed copy.** Where the same content exists under a permissive licence (e.g., a vendor doc also on GitHub under CC BY 4.0), ingest the licensed copy, not the ToS-restricted website.
6. **Snapshots + freshness.** Cache a snapshot with a timestamp; re-check licences/robots periodically. Drop chunks when a source revokes permission.

**Storing full text vs. derived embeddings (a practical legal distinction):**
- **Full-text storage** is a *reproduction* — squarely an act that needs a licence or fair use/EU-Art.4 footing.
- **Embeddings** (vectors) are *derived data*, not human-readable copies, and are far less likely to be found to reproduce protectable expression; but they are still *derived from* the work, and reversing/extracting text from them is debated. The prudent posture: **do not treat embeddings as a licence workaround.** Obtain the same permission for embedding that you would for storage; embed from the licensed/public-domain sources where possible; and do not rely on "we only keep vectors" as a defence.

**Answer/output policy (the fair-use-critical layer):**
1. **Attribution display is mandatory UI.** Every answer cites the source(s) with a visible link and the licence/credit string from the registry.
2. **Quote-length cap.** Enforce a hard cap (e.g., ≤ ~25 words per quote; ≤ 1–2 quotes per source per answer) and never assemble enough consecutive quotes to reconstruct a source.
3. **Paraphrase, don't reproduce.** System-prompt the generator to paraphrase substance and reserve verbatim text for the short-quote cap; strip any long verbatim spans in post-processing.
4. **No-substitution design.** Do not build features that let users dump a source's full text (no "export the doc," no raw full-document retrieval to the user). Keep the pointer back to the source.
5. **Link-back everywhere.** Both in the answer and in any browsable UI; this supports fair-use factor 4 and the original web norm.
6. **Notice & takedown.** Publish a DMCA-style takedown/opt-out contact and a documented process to (i) remove a source from the index and (ii) regenerate/expire cached answers; honour rightsholder opt-outs promptly.
7. **Human spot-audit.** Sample answers monthly for over-quoting/over-paraphrasing and for missing attribution.

---

# PART B — Per-source verdicts (detail)

> "Own terms" quotes are the operative sentences only. Verdicts assume the **ingest-the-licensed-copy, paraphrase-first, cite-back** policy in A4.

## 1. FIDO Alliance — specifications and fidoalliance.org
- **Owner:** FIDO Alliance, Inc. (a US non-profit industry consortium).
- **Own terms.** Website **Terms of Use** reserve all rights and state: *"All copyright, trademark, and other proprietary rights in the FIDO Alliance Site… are reserved to the FIDO Alliance and its licensors."* Use is authorized for download/copy **with notices retained**, with *"You may not modify, edit or take out of context…"* and, decisively, **"g. You may not copy text from the FIDO Alliance Site verbatim, nor are you permitted to translate the text verbatim into any other language."** Commercial use is barred except under §3 (linking/mirroring rules). — https://fidoalliance.org/terms-of-use/
  The **specifications themselves** carry a narrower status note: *"Permission is hereby granted to use the Specification solely for the purpose of reviewing the Specification. **No rights are granted to prepare derivative works of this Specification.** Entities seeking permission to reproduce portions of this Specification for other uses must contact the FIDO Alliance."* — https://fidoalliance.org/specs/fidoserver/fido-server-v2.3-rd-20260226.html . Published (Proposed Standard) specs add: *"It is a stable document and may be used as reference material or cited from another document."* — https://fidoalliance.org/specs/fido-v2.1-ps-20210615/fido-client-to-authenticator-protocol-v2.1-ps-20210615.html
- **robots.txt:** `User-agent: *` / `Disallow: /wp-admin/` / `Crawl-delay: 10` — does **not** block AI crawlers. — https://fidoalliance.org/robots.txt
- **Legal status.** The website *expression* is fully copyrighted and expressly not to be copied verbatim. The *protocol facts/methods* inside the specs are uncopyrightable (§102(b)), and published specs may be "used as reference material or cited." US fair use could cover brief quotation for scholarship/comment, but the site's verbatim-copying prohibition and the spec's no-derivatives clause make relying on fair use here *unwise* when a cleaner path (W3C WebAuthn) exists for the same technical content.
- **Verdict: SUMMARIZE_ONLY.** Do not store FIDO spec/site full text or reproduce it verbatim. You may *cite and link*, and you may state protocol facts in your own words (facts are uncopyrightable). Prefer the W3C WebAuthn specification (source #2/#3) for anything you need to quote.
- **Required attribution:** e.g., *"FIDO Alliance, Client to Authenticator Protocol (CTAP) 2.1, Proposed Standard, https://fidoalliance.org/specs/… — © 2021 FIDO Alliance."* Add "quoted content requires permission" discipline: no verbatim quotes.
- **Gated/commercial to record, not ingest:** FIDO Alliance **members-only** documents (working drafts, conformance test tools, member specifications), membership agreements, and the **FIDO Trademark License Agreement** (contract).

## 2. W3C — WebAuthn Level 2 / Level 3
- **Owner:** World Wide Web Consortium (W3C).
- **Own terms.** WebAuthn is published under the **W3C Software and Document License (2023)**, the permissive one: *"Permission to copy, modify, and distribute this work, with or without modification, for any purpose and without fee or royalty is hereby granted, provided that you include… The full text of this NOTICE in a location viewable to users of the redistributed or derivative work… [and] Notice of any changes or modifications, through a copyright statement on the new code or document such as 'This software or document includes material copied from or derived from [title and URI]…'"* — https://www.w3.org/copyright/software-license-2023/ . The WebAuthn TR footer confirms "*W3C® liability, trademark and **permissive** document license rules apply*" and its markup references `software-license/`. — https://www.w3.org/TR/webauthn-3/
- **robots.txt:** standard path disallows only; **no AI-crawler block.** — https://www.w3.org/robots.txt
- **Legal status.** Fully covered by an express, royalty-free, any-purpose licence — the strongest permission in this corpus. Note the licence excludes any right to use W3C **trademarks** in publicity, and requires carrying the NOTICE and marking modifications.
- **Verdict: FULL_INGEST.** Store, embed, synthesize, and quote freely, subject to the notice + modification-marking requirement.
- **Required attribution.** Include the notice, e.g.: *"This document/bot output includes material copied from or derived from Web Authentication: An API for accessing Public Key Credentials Level 3 (https://www.w3.org/TR/webauthn-3/). Copyright © 2026 World Wide Web Consortium. https://www.w3.org/copyright/software-license-2023/"* — and state that answers are modifications, not W3C text.

## 3. W3C — other specs (default Document License)
- **Owner:** W3C.
- **Own terms.** The **W3C Document License 2023** applies by default to W3C technical reports: *"Permission to copy, and distribute the contents of this document… in any medium for any purpose and without fee or royalty is hereby granted, provided that you include… A link or URL to the original W3C document… The pre-existing copyright notice… If it exists, the STATUS of the W3C document."* It then states: *"No right to create modifications or derivatives of W3C documents is granted pursuant to this license, except… to facilitate implementation… Code Components… licensed under the [W3C Software and Document License]."* — https://www.w3.org/copyright/document-license-2023/
- **Legal status.** Copying/distribution is expressly licensed with attribution; **modifications are not** — so a *paraphrased* W3C output relies on US fair use, while verbatim *quotation* is expressly licensed. Keep quotes attributed and don't republish the spec as if it were our own technical specification.
- **Verdict: FULL_INGEST** for storage + quotation with attribution; paraphrase is fair-use-supported. (Check each spec's page — some, like WebAuthn, already use the permissive licence.)
- **Required attribution:** URL to the W3C document + the copyright notice + the document **STATUS** (e.g., "W3C Candidate Recommendation…").

## 4. IETF — RFCs (e.g., RFC 8809) and the IETF Trust
- **Owner:** IETF Trust. (RFC 8809, *Registries for Web Authentication (WebAuthn)*, is the WebAuthn-related IETF RFC; the WebAuthn API itself is W3C, not IETF.)
- **Own terms.** **IETF Trust Legal Provisions (TLP), §3.c** grant, to anyone, the right *"to copy, publish, display and distribute IETF Contributions and IETF Documents in full and without modification,"* and *"to copy, publish, display and distribute unmodified portions…, provided that: (x) each such portion is clearly attributed to IETF and identifies the RFC or other IETF Document…; (y) all IETF legends, legal notices and indications of authorship… must also be included where any substantial portion of the text of an IETF RFC, and in any event where more than one-fifth of such text, is reproduced…"* **§3.d** states **no** licence to *modify* outside the standards process. Code components are under the **Revised BSD License** (§4). — https://trustee.ietf.org/documents/trust-legal-provisions/tlp-5/ ; overview: https://trustee.ietf.org/documents/trust-legal-provisions/
- **robots.txt:** not applicable per-RFC; datatracker.ietf.org is open.
- **Legal status.** Verbatim reproduction (full or portions) is **expressly licensed** with attribution; derivatives/modifications are not, so paraphrase relies on US fair use (non-commercial, attributed, non-substitutive → strong).
- **Verdict: FULL_INGEST.**
- **Required attribution.** *"Extracted from RFC 8809, © IETF Trust and the persons identified as the document authors. This document is subject to BCP 78 and the IETF Trust's Legal Provisions (https://trustee.ietf.org/license-info)."* Include that legend when reproducing a substantial portion (>1/5) of any RFC.

## 5. NIST — SP 800-63B (and SP 800-63-4, NISTIRs, etc.)
- **Owner:** National Institute of Standards and Technology (US Government).
- **Own terms.** SP 800-63B: *"This publication may be used by nongovernmental organizations on a voluntary basis and is **not subject to copyright in the United States**. Attribution would, however, be appreciated by NIST."* — https://pages.nist.gov/800-63-3/sp800-63b.html . Site-wide: *"With the exception of material marked as copyrighted, information presented on NIST sites are considered public information and may be distributed or copied. Use of appropriate byline/photo/image credits is requested."* — https://www.nist.gov/copyrights-disclaimers . (SP 800-63B is superseded by **SP 800-63-4**, approved 2025-05-30 — https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-63b-4.pdf )
- **robots.txt:** standard admin/search disallows; no AI block.
- **Legal status.** Public domain (17 U.S.C. §105); no copyright to infringe. Caveat: a NIST page/section *marked* copyrighted (e.g., incorporated third-party figures) is the exception.
- **Verdict: FULL_INGEST.**
- **Required attribution:** none legally required. Courtesy: *"Source: NIST Special Publication 800-63B, Digital Identity Guidelines — Authentication and Lifecycle Management, https://pages.nist.gov/800-63-3/sp800-63b.html."*

## 6. CISA guidance pages (.gov)
- **Owner:** Cybersecurity and Infrastructure Security Agency (US Government).
- **Own terms.** CISA Linking Policy: *"CISA.gov … is a public domain website, so you can link to CISA.gov at no cost and without specific permissions."* — https://www.cisa.gov/linking-policy . CISA Terms of Use: https://www.cisa.gov/terms-use . Example assets: *Implementing Phishing-Resistant MFA* fact sheet — https://www.cisa.gov/sites/default/files/publications/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf ; *More than a Password* — https://www.cisa.gov/MFA .
- **robots.txt:** standard admin/search disallows; no AI block.
- **Legal status.** Public domain (17 U.S.C. §105). Caveat: some CISA pages link to or embed non-government material that is *not* public domain.
- **Verdict: FULL_INGEST.**
- **Required attribution:** none legally required. Courtesy: *"Source: CISA — <title>, <URL>."*

## 7. OWASP — Authentication Cheat Sheet & Cheat Sheet Series
- **Owner:** OWASP Foundation (the Cheat Sheets Team).
- **Own terms.** Page footer: *"©Copyright – Cheat Sheets Series Team – This work is licensed under Creative Commons Attribution-ShareAlike 4.0 International."* — https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html ; repo licence: `SPDX-License-Identifier: CC-BY-SA-4.0` — https://github.com/OWASP/CheatSheetSeries/blob/master/LICENSE.md . Relevant sheets: **Authentication**, **Multifactor Authentication** — https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Multifactor_Authentication_Cheat_Sheet.md
- **robots.txt:** `User-agent: *` / `Allow: /` — fully open. (The site is also on GitHub under a public licence.)
- **Legal status.** An express **CC BY-SA 4.0** licence. Attribution is *mandatory*; **ShareAlike** means adapted material (including the answer text, if it is a derivative of the sheet) must be licensed under CC BY-SA 4.0 (or a compatible licence). Facts/ideas remain uncopyrightable, so a pure-facts answer may not trigger ShareAlike; a close paraphrase or quote will.
- **Verdict: FULL_INGEST** (with ShareAlike).
- **Required attribution.** *"Adapted/Quoted from the OWASP Cheat Sheet Series, 'Authentication Cheat Sheet', https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html — © OWASP, licensed CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)."* Indicate modifications; if the answer text is adapted material, mark it CC BY-SA 4.0.

## 8. Microsoft Learn / Entra passkey docs
- **Owner:** Microsoft Corporation.
- **Own terms.** Microsoft Learn **Terms of Use**: *"Unless otherwise specified, the Services are for your personal and non-commercial use. You may not modify, copy, distribute… create derivative works from… (except for your own, personal, non-commercial use) without prior written consent from Microsoft."* And for *Documents*: permission is granted *"provided that… (2) use of such Documents… is for informational and non-commercial or personal use only and will not be copied or posted on any network computer…, and (3) no modifications of any Documents are made."* — https://learn.microsoft.com/en-us/legal/termsofuse . **Crucially**, the same ToU says: *"Certain documentation may be subject to explicit license terms separate from the terms contained here. To the extent the terms conflict, the explicit license terms control."*
- **Own terms (GitHub source).** Much Microsoft documentation is published in `MicrosoftDocs/*` GitHub repos under **CC BY 4.0** for content (e.g. `MicrosoftDocs/azure-docs` LICENSE = "Attribution 4.0 International" — https://github.com/MicrosoftDocs/azure-docs/blob/main/LICENSE ). ⚠️ **Not uniform:** `MicrosoftDocs/entra-docs` currently shows an **MIT** LICENSE for the repo — verify the specific repo's LICENSE/README before relying on CC BY 4.0.
- **robots.txt:** no AI-crawler block. — https://learn.microsoft.com/robots.txt
- **Legal status.** The *website* ToS forbids the exact acts a public bot performs (modify/redistribute/post on a network). Where a **CC BY 4.0** GitHub source controls, ingestion is expressly licensed. Fair use might still permit brief quotation, but the contract makes website scraping/storage the weak link.
- **Verdict: SUMMARIZE_ONLY** for learn.microsoft.com (**do not** scrape/store the website); **FULL_INGEST** when the content is taken from a repo whose LICENSE is CC BY 4.0.
- **Required attribution.** For the CC BY 4.0 source: *"Microsoft Docs — <article title>, https://github.com/MicrosoftDocs/<repo> — © Microsoft, licensed CC BY 4.0."*
- **Gated/commercial:** Azure/Entra product docs that require an account; the **Microsoft Product Terms** / licensing docs (contractual).

## 9. Google — Identity / Chrome passkey docs
- **Owner:** Google LLC.
- **Own terms.** Page notice: *"Except as otherwise noted, the content of this page is licensed under the Creative Commons Attribution 4.0 License, and code samples are licensed under the Apache 2.0 License."* — https://developers.google.com/identity/passkeys . Site Policies: *"We are pleased to license much of the documentation on Google Developers under terms that explicitly encourage people to take, modify, reuse, re-purpose, and remix our work… We just ask that you give us attribution…"*; trademarks/brand features and some images/video are **excluded**; attribution required per CC BY §3; suggested reproduction wording given. — https://developers.google.com/terms/site-policies
- **robots.txt:** only `/youtube/partner/` disallowed; no AI block. — https://developers.google.com/robots.txt
- **Legal status.** Express **CC BY 4.0** licence (code Apache 2.0). Attribution mandatory; no ShareAlike, so adapting is fine with credit.
- **Verdict: FULL_INGEST.**
- **Required attribution.** Use Google's own wording for exact reproductions: *"Portions of this page are reproduced from work created and shared by Google and used according to terms described in the Creative Commons 4.0 Attribution License."* (+ link to the source page). For modified/paraphrased output, use the "modifications based on work created and shared by Google…" variant.

## 10. Apple — developer docs / Passkeys Overview
- **Owner:** Apple Inc.
- **Own terms.** Apple website **Terms of Use**: *"Except as expressly provided in these Terms of Use, no part of the Site and no Content may be copied, reproduced, republished… without Apple's express prior written consent."* Permitted product-info use: *"…(2) use such information only for your personal, non-commercial informational purpose and do not copy or post such information on any networked computer…, (3) make no modifications…."* And: *"You may not use any 'deep-link', 'page-scrape', 'robot', 'spider'… to access, acquire, copy or monitor any portion of the Site or any Content."* — https://www.apple.com/legal/internet-services/terms/site.html . Developer content is additionally governed by the **Apple Developer Program License Agreement**, whose "Documentation" grant is for *authorized developers, internal use only*. — https://developer.apple.com/support/terms/apple-developer-program-license-agreement/ . Sources: https://developer.apple.com/passkeys/ , https://developer.apple.com/documentation/authenticationservices/supporting-passkeys
- **robots.txt:** disallows `/reference/`, `/documentation/dataformats/`, search, temp, etc. — https://developer.apple.com/robots.txt
- **Legal status.** The ToS expressly bars scraping, copying, modification, and posting on a networked computer — the *opposite* of a permissive licence. Fair use might cover a brief attributed quotation for teaching/criticism, but building an automated ingest of Apple docs is exactly what the contract forbids.
- **Verdict: SUMMARIZE_ONLY** (ideally **DO_NOT_INGEST** via automation): do not crawl or store Apple doc pages; state facts in your own words and link to Apple's page.
- **Required attribution:** *"Apple Developer Documentation — Supporting passkeys, https://developer.apple.com/documentation/authenticationservices/supporting-passkeys (Apple Inc.)."* No verbatim quotes without Apple's written permission.
- **Gated/commercial:** the Apple Developer Program License Agreement and Xcode/SDK terms (contractual, authorized-developer only).

## 11. Yubico — security blog and docs
- **Owner:** Yubico AB (Sweden).
- **Own terms.** Website **Terms and Conditions of Use**: no content-reproduction licence is granted; the document itself merely *"is adopted from Akismet.com TOS, available under a Creative Commons Sharealike license"* (a licence on the *terms text*, **not** on Yubico's content). Trademarks reserved *(no right or license to reproduce… any Yubico… trademarks)*. — https://www.yubico.com/support/terms-conditions/yubico-website-terms-conditions/ . Docs: *"© Copyright 2026, Yubico AB."* and *"Yubico Software referenced in this document is licensed to you under the terms and conditions accompanying the software…"* — https://docs.yubico.com/hardware/yubikey-guidance/best-practices/copyright.html ; Toolset Software License Agreement states *"Yubico does not license the Software, Yubico trademarks or any documentation to You."* — https://www.yubico.com/support/terms-conditions/yubico-toolset-software-license-agreement/
- **robots.txt:** disallows `/documentation/`, search/tag params — https://www.yubico.com/robots.txt
- **Legal status.** Copyright retained; no reuse licence. Governed by Swedish law (per the ToS). Fair use permits brief attributed quotation; wholesale ingestion does not.
- **Verdict: SUMMARIZE_ONLY.** Paraphrase facts + link; no verbatim reproduction.
- **Required attribution:** *"Source: Yubico — <title>, <URL>. Yubico and YubiKey are registered trademarks of Yubico AB."*

## 12. 1Password — security blog
- **Owner:** AgileBits Inc. (dba 1Password), Ontario, Canada.
- **Own terms.** Terms of Service: *"The Service and all contents, including but not limited to text, images, graphics or code are the property of AgileBits Inc. and are protected by copyright, trademarks, database and other intellectual property rights. You may display and copy, download or print portions of the material from the different areas of the Service only for your own non-commercial use. Any other use is strictly prohibited…"* — https://1password.com/legal/terms-of-service
- **robots.txt:** only a monitoring page and a white-paper PDF disallowed — https://1password.com/robots.txt
- **Legal status.** Personal, non-commercial use only; redistribution barred. Canadian/Ontario law and arbitration govern. Fair use (US) may cover brief attributed quotation.
- **Verdict: SUMMARIZE_ONLY.**
- **Required attribution:** *"Source: 1Password blog — <title>, <URL> (AgileBits Inc.)."*

## 13. Okta — security blog
- **Owner:** Okta, Inc.
- **Own terms.** Website Terms of Service: *"All Site content… is the exclusive property of Okta or its licensors and is protected by US and international IP and copyright laws. No rights are granted to you unless expressly stated."* Prohibited: *"Accessing the Site via automated means (crawlers, scripts)…"* and *"Scraping, copying, reselling, or duplicating Site content without written permission."* — https://www.okta.com/legal/terms-of-service/
- **robots.txt:** the catch-all disallow is *commented out* (`# User-agent: * / # Disallow: /`), so Okta does not currently block crawlers via robots.txt — https://www.okta.com/robots.txt — but the **ToS does**, and ToS beats robots.txt in any contract analysis.
- **Legal status.** No licence granted; anti-crawling and anti-scraping terms. Automated ingestion is contractually barred; brief attributed quotation may still be fair use, but do not run a crawler.
- **Verdict: SUMMARIZE_ONLY** (read manually; paraphrase facts; link).
- **Required attribution:** *"Source: Okta — <title>, <URL> (Okta, Inc.)."*

## 14. Wikipedia articles
- **Owner:** the Wikimedia community (contributors); the Wikimedia Foundation hosts but does **not** own the text (*"Please do not ask the Wikimedia Foundation for permission… The Foundation does not own that content"*).
- **Own terms.** *"The text of Wikipedia is copyrighted… and is formally licensed to the public"* under **CC BY-SA 4.0** (dual with **GFDL**). *"Wikipedia content can be copied, modified, and redistributed if and only if the copied version is made available on the same terms to others and acknowledgment of the authors… is included (a link back to the article is generally thought to satisfy the attribution requirement)."* Attribution method: hyperlink/URL to the page (or a stable copy), or a list of authors; modifications must be licensed CC BY-SA 4.0 or later; each distributed copy must carry a licensing notice. — https://en.wikipedia.org/wiki/Wikipedia:Copyrights ; licence text: https://creativecommons.org/licenses/by-sa/4.0/
- **robots.txt & robot policy.** Wikimedia's `robots.txt` is large but does **not** blanket-block AI crawlers; the **Robot policy** requires an honest UA, honouring robots.txt, and rate limits (no more than ~5 req/s; prefer dumps). — https://wikitech.wikimedia.org/wiki/Robot_policy ; https://en.wikipedia.org/robots.txt
- **Legal status.** Express CC BY-SA 4.0. Attribution mandatory; **ShareAlike** — adapted answer text (close paraphrase/derivative) must be CC BY-SA 4.0. Pure facts/ideas are not protected, so factual answers need no ShareAlike licence, but quotes and close paraphrases do.
- **Verdict: FULL_INGEST** (with ShareAlike).
- **Required attribution:** *"Source: Wikipedia, '<article>', https://en.wikipedia.org/wiki/<article> — text available under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)."* If the answer is adapted material, mark it CC BY-SA 4.0.

## 15. Academic — arXiv preprints
- **Owner:** the authors (arXiv is a non-profit host).
- **Own terms.** Default is the **arXiv.org perpetual, non-exclusive license**: *"This license gives limited rights to arXiv to distribute the article, and also limits re-use of any type from other entities or individuals."* *"The overwhelming majority of e-prints are submitted using the arXiv perpetual non-exclusive license, which does not grant further reuse permissions directly."* Some are **CC-licensed** (then a "CC" logo appears). **Metadata** is released under **CC0**. — https://info.arxiv.org/help/license/index.html ; https://info.arxiv.org/help/license/reuse.html
- **robots.txt:** mostly blocks `/oai2`, `/show-email`, API paths — no AI block. — https://arxiv.org/robots.txt
- **Legal status.** Default licence grants arXiv distribution only — **no reuse** for us. CC-licensed preprints permit reuse with attribution. Metadata (CC0) is free to use.
- **Verdict: SUMMARIZE_ONLY** by default (store CC0 metadata + abstract + link); **FULL_INGEST** only for preprints that carry a CC licence.
- **Required attribution:** *"<Authors>, '<title>', arXiv:<id> (https://arxiv.org/abs/<id>) — <applicable CC licence, if any>."*

## 16. Academic — ACM published papers
- **Owner:** the authors (ACM as publisher; since 2023 authors retain copyright and grant ACM a non-exclusive licence). — https://www.acm.org/publications/policies/publication-rights-and-licensing-policy
- **Own terms.** From 2026 all ACM articles are **Open Access**; authors retain © and grant ACM *"(1) a non-exclusive license to publish… (2) the right to serve as the official Publisher… including the right to license the Work to third parties, such as for training by LLMs, and (3) the right to defend the integrity of that Work…"*; ACM offers **CC** licence options (Work-for-hire articles get **CC BY**). — https://www.acm.org/publications/policies/publication-rights-and-licensing-policy ; author rights: https://authors.acm.org/author-resources/author-rights
- **Legal status.** Depends on the article's licence: **CC BY** → reuse with attribution; ACM proprietary licence → permission required. Pre-2023 articles keep their then-current terms.
- **Verdict: FULL_INGEST** for CC-licensed ACM papers; otherwise **SUMMARIZE_ONLY**/cite.
- **Required attribution:** *"<Authors>, '<title>', ACM <venue> (<year>). DOI: <doi> — licensed <CC licence>."*

## 17. Academic — USENIX papers
- **Owner:** the authors. USENIX "permits authors to retain their ownership of the copyrights in their works." — https://www.usenix.org/conferences/author-resources/submissions-policy
- **Own terms.** Standard USENIX consent notice accompanying the paper: *"…work is retained by the author[s]. **Permission is granted for the noncommercial reproduction of the complete work for educational or research purposes.**"* — https://www.usenix.org/conference/webapps12/consent-form
- **Legal status.** An express, if narrow, licence: non-commercial reproduction for education/research, with attribution. If Chadbot's use is genuinely non-commercial educational/research, this fits; a consultancy-hosted showcase may not be strictly "non-commercial," so treat as conditional.
- **Verdict: FULL_INGEST** if the use is genuinely non-commercial educational/research; otherwise **INGEST_SUMMARIZE**.
- **Required attribution:** *"<Authors>, '<title>', USENIX <venue> (<year>), https://www.usenix.org/… . Permission granted for noncommercial reproduction for educational or research purposes."*

---

## Appendix A — Commercial / gated / restricted content to record but NOT ingest now

| Item | Owner | Why |
|---|---|---|
| FIDO Alliance members-only drafts, conformance tools, membership agreements | FIDO Alliance | Members-only / contract |
| Microsoft Product Terms, Azure/Entra paid docs, Learn content behind accounts | Microsoft | Contract / gated |
| Apple Developer Program License Agreement, Xcode/SDK terms, "Documentation" | Apple | Authorized-developer-only contract |
| ACM published versions where licence ≠ CC (pre-2023, proprietary) | ACM / authors | Permission required |
| IEEE / Elsevier / Springer paywalled papers on passkeys/WebAuthn | publishers | Paywalled |
| Vendor gated whitepapers & webinars (Okta, Yubico, 1Password, Duo/Cisco, Ping) | vendors | Gated / lead-capture terms |
| Paywalled press (Art. 15 press-publisher right applies in EU) | press publishers | Press right / paywall |
| Books (e.g., O'Reilly/Kluwer titles on WebAuthn) | publishers/authors | Copyright, not licensed |
| Cloudflare-fronted vendors that block AI crawlers by default | various | Technical + expressed opt-out |

## Appendix B — Claims I could not fully verify (flagged)

- **`MicrosoftDocs/entra-docs` licence.** The repo's `LICENSE` currently reads **MIT**, not CC BY 4.0 (I verified `MicrosoftDocs/azure-docs` = CC BY 4.0). Microsoft's practice is CC BY 4.0 for *content* and MIT for *code*; **verify the specific repo's LICENSE and README before relying on CC BY 4.0** for Entra/passkey docs.
- **USENIX licence per paper.** The "noncommercial reproduction for educational or research purposes" text is the standard USENIX consent notice; individual papers/conferences may vary — confirm per paper.
- **`robots.txt` and AI-agent directives** were read on 2026-10-13 and change frequently; re-check before each crawl. None of the robots.txt files I fetched named a specific AI crawler (GPTBot, CCBot, ClaudeBot, Google-Extended, etc.), but Cloudflare-fronted properties may block them at the edge regardless of robots.txt.
- **CISA Terms of Use copyright clause.** The `/terms-use` page is JS-rendered; I relied on CISA's public-domain framing ("public domain website") and 17 U.S.C. §105 rather than a fetched copyright clause. Confirm any specific page for embedded third-party material.
- **TDMRep / Content-Signals / ai.txt** are new/proposed; adoption is uneven. Do not assume a source "opted out" merely because no signal is present (absence of signal ≠ permission outside the EU; under EU Art. 4(3) absence of reservation ≠ prohibition, but that inverts outside the EU).
- **EU Art. 4** grants reproduction/extraction rights, but the *output/communication* step (returning synthesized answers publicly) is governed by separate provisions (quotation exception, Art. 15 short-extract carve-out, etc.) that are narrower; I did not exhaustively analyse member-state implementations.
- **This is not legal advice** and has not been reviewed by counsel.

## Appendix C — Primary sources (URLs)

**Statutes/regs:** 17 U.S.C. §102 https://www.law.cornell.edu/uscode/text/17/102 · §105 https://www.law.cornell.edu/uscode/text/17/105 · §107 https://www.law.cornell.edu/uscode/text/17/107 · DSM Directive 2019/790 https://eur-lex.europa.eu/eli/dir/2019/790 (Art. 3 / 4 / 15) · Database Directive 96/9/EC https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:31996L0009 · UK CDPA s.29A https://www.legislation.gov.uk/ukpga/1988/48/section/29A

**Cases:** Authors Guild v. Google https://law.justia.com/cases/federal/appellate-courts/ca2/13-4829/13-4829-2015-10-16.html · Kelly v. Arriba Soft https://copyright.gov/fair-use/summaries/kelly-arriba-9thcir2003.pdf · Perfect 10 v. Amazon https://casetext.com/case/perfect-10-inc-v-amazoncom-inc-1 · Bartz v. Anthropic https://www.afslaw.com/perspectives/alerts/landmark-ruling-ai-copyright-fair-use-vs-infringement-bartz-v-anthropic · Thomson Reuters v. Ross https://www.ded.uscourts.gov/sites/ded/files/opinions/20-613_5.pdf · Ziff Davis v. OpenAI (analysis) https://blog.ericgoldman.org/archives/2025/12/are-robots-txt-instructions-legally-binding-ziff-davis-v-openai.htm · Meta v. Bright Data https://storage.courtlistener.com/recap/gov.uscourts.cand.406956/gov.uscourts.cand.406956.181.0_1.pdf

**Signals:** robots.txt legal FAQ https://www.robotstxt.org/faq/legal.html · TDMRep https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/ · Cloudflare Content Signals https://blog.cloudflare.com/content-signals-policy/ · Cloudflare default-block press https://www.cloudflare.com/press/press-releases/2025/cloudflare-just-changed-how-ai-crawlers-scrape-the-internet-at-large/ · IETF AIPREF https://www.ietf.org/blog/aipref-wg/ · ai.txt draft https://www.ietf.org/archive/id/draft-car-ai-txt-wellknown-00.html

**Sources:** FIDO TOU https://fidoalliance.org/terms-of-use/ · W3C Document License https://www.w3.org/copyright/document-license-2023/ · W3C Software & Document License https://www.w3.org/copyright/software-license-2023/ · WebAuthn L3 https://www.w3.org/TR/webauthn-3/ · IETF TLP https://trustee.ietf.org/documents/trust-legal-provisions/tlp-5/ · NIST SP 800-63B https://pages.nist.gov/800-63-3/sp800-63b.html · NIST policy https://www.nist.gov/copyrights-disclaimers · CISA linking policy https://www.cisa.gov/linking-policy · OWASP Authentication Cheat Sheet https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html · OWASP LICENSE https://github.com/OWASP/CheatSheetSeries/blob/master/LICENSE.md · Microsoft Learn TOU https://learn.microsoft.com/en-us/legal/termsofuse · MicrosoftDocs azure-docs LICENSE https://github.com/MicrosoftDocs/azure-docs/blob/main/LICENSE · Google Identity passkeys https://developers.google.com/identity/passkeys · Google Site Policies https://developers.google.com/terms/site-policies · Apple site terms https://www.apple.com/legal/internet-services/terms/site.html · Yubico terms https://www.yubico.com/support/terms-conditions/yubico-website-terms-conditions/ · 1Password ToS https://1password.com/legal/terms-of-service · Okta ToS https://www.okta.com/legal/terms-of-service/ · Wikipedia copyrights https://en.wikipedia.org/wiki/Wikipedia:Copyrights · Wikimedia robot policy https://wikitech.wikimedia.org/wiki/Robot_policy · arXiv licences https://info.arxiv.org/help/license/index.html · ACM policy https://www.acm.org/publications/policies/publication-rights-and-licensing-policy · USENIX submissions policy https://www.usenix.org/conferences/author-resources/submissions-policy · CC BY 4.0 https://creativecommons.org/licenses/by/4.0/legalcode.en · CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/