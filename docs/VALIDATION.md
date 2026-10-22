# MVP validation — 22 October 2026

## Automated

`npm test`: 11 tests pass. Coverage includes exact decimals; quoted/BOM/multiline CSV; bad dates, duplicate headers and precision limits; BTC/EVM hashes; precise BTC/EVM structures; cross-asset/amount/date/hash exclusions; role gaps; report omission of originals; save/reopen metadata round trips; imported trust reset; original reattachment requirements; hostile text as data; unsupported and oversized case files. `npm run check` passes for every app module.

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
- The print/save-PDF action reached a system/browser print boundary where the automation command timed out. No PDF was captured or visually verified. Check printed pagination, text, gaps, evidence order and omissions in a normal browser before release.
- This is a keyboard and responsive smoke check, not a complete accessibility audit, cross-browser certification or independent security assessment.

The PR remains draft while the two PDF checks remain unverified. No merge or deployment was performed.

## Walkthrough assessment

The fictional journey is understandable from the narrative and chronological evidence list, but is not independently substantiated. The sale/receipt are potential exact-amount candidates after review. BTC intermediary records use a different asset and need manual explanations; no FX link is manufactured. The savings claim needs underlying income records, the ownership declaration needs stronger support, and chain authenticity/fees remain unresolved. Those are material gaps even if the role checklist is manually populated. A role being linked must never be read as a verification verdict.
