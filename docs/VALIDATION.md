# MVP validation — 22 October 2026

## Automated

`npm test`: 21 tests pass. Coverage includes exact decimals; quoted/BOM/multiline CSV; bad dates, duplicate headers and precision limits; BTC/EVM hashes; precise BTC/EVM structures; cross-asset/amount/date/hash exclusions; role gaps; report omission of originals; save/reopen metadata round trips; imported trust reset; original reattachment requirements; hostile text as data; unsupported and oversized case files. `npm run check` passes for every app module.

## Browser checks with fictional data

| Check | Result |
| --- | --- |
| Synthetic full journey loads eight labelled, unreviewed records | Passed; all five cash-out roles remain gaps |
| Bank CSV with quoted reference and exchange CSV | Passed; imported unreviewed, selected roles preserved |
| Review → candidate → manual link with explanation | Passed; candidate did not automatically close a role |
| Evidence edit after linking | Passed; record becomes unreviewed/unlinked and role gap reopens |
| Invalid BTC hash | Rejected with a clear message |
| Guided BTC inputs/outputs | Saved exact integer satoshis and previous-output index |
| Guided EVM native transfer | Saved exact 1,000,000,000,000,000,000 wei and chain ID |
| Fiat deposit / crypto deposit / cash-out checklist | Correct required roles observed |
| Screenshot attachment | Added and inline preview displayed |
| PDF attachment | Added with original link and filename; original viewing restricted below |
| Case reopen from file chooser | Eight records restored, fresh review required, gaps reopened |
| Case-file download | Completed; downloaded JSON inspected: expected format, 8 records, no original bytes |
| Missing original on imported reviewed/linked record | Import reset trust; review blocked until reattachment, then available |
| Export while transaction changes pending | Blocked with save/cancel message |
| Responsive transaction form | Inspected at 390 px requested width; usable client width 375 px, document width 375 px; no horizontal overflow |
| Keyboard smoke check | Tab from case title focused amount |
| Desktop chronological report | Visually inspected; limitations and unresolved gaps retained |

## Remaining manual verification

- Opening the PDF original's blob URL was rejected by the browser tool's security policy. No bypass or alternate surface was attempted. A person must check original viewing in a normal local browser.
- The optional print/save-PDF action reached a system/browser print boundary where automation timed out. Its native dialog remains unverified. The independent Download report PDF action is now tested and visually verified (see below).
- This is a keyboard and responsive smoke check, not a complete accessibility audit, cross-browser certification or independent security assessment.

The PR remains draft pending original attachment viewing and optional native-print checks. The direct downloadable PDF is verified separately below. No merge or deployment was performed.

## BTC ingestion and downloadable PDF checks

The suite now also covers consent before network access, fixed GET endpoints, omitted credentials/referrers, provider errors, response limits, malformed/mismatched BTC data, exact satoshis, coinbase/missing-prevout handling, unconfirmed/inconsistent-tip states, explicit output selection, snapshot case-file round trips, and rejecting matches when entered fields differ from the preserved snapshot. PDF tests cover retained report content and exact PDF object/xref offsets. These are schema and behavior tests, not consensus or cryptographic verification.

Browser checks used the publicly known historical transaction `4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b` solely as an unrelated test reference. Consent rejection was observed before lookup. After explicit approval, the direct provider request returned one coinbase input, one output without an address string, fee zero, block metadata and observed confirmations. Adding evidence without choosing an output was rejected. Explicit selection added an unreviewed record and did not alter the fictional USD cash-out or close its role gaps. Manual note edits preserved the snapshot. Saving and reopening retained its input/output/fee/source/time metadata but changed acquisition to `case-file-unverified` and kept it unreviewed/unlinked. No customer transaction or document was used.

The **Download report PDF** path was exercised in the browser using the fictional case plus the clearly labelled unrelated public reference. The final four-page file was parsed with pypdf, all pages had 595 × 842 point dimensions and one embedded page image each, and every page was rendered with Poppler and visually inspected. Page numbers, full BTC source URL/hash/script wrapping, section/evidence grouping, unresolved gaps, Unicode `café`, `₹`, and `日本語`, and final transaction details were checked. No clipped or overlapping text was observed. The PDF is image-based and untagged: use report JSON for search, copyable data and machine processing. The optional system-print dialog remains outside this verified download path.

Provider documentation: [mempool.space REST API](https://mempool.space/docs/api/rest), [Esplora API](https://github.com/Blockstream/esplora/blob/master/API.md). The live response is a provider report; ownership, spendability, inclusion proofs and source of funds were not verified.

## Walkthrough assessment

The fictional journey is understandable from the narrative and chronological evidence list, but is not independently substantiated. The sale/receipt are potential exact-amount candidates after review. BTC intermediary records use a different asset and need manual explanations; no FX link is manufactured. The savings claim needs underlying income records, the ownership declaration needs stronger support, and chain authenticity/fees remain unresolved. Those are material gaps even if the role checklist is manually populated. A role being linked must never be read as a verification verdict.
