# MVP validation — updated 28 October 2026

## Download recovery regression — 28 October 2026

Reproduced both export buttons failing after changing only the date-reading preference on the old live app: the entire evidence form's change listener marked this unsaved, requireSaved blocked both formats, and the message was only in the top session section. With the fix, reader-only settings no longer mark saved evidence dirty. Errors/progress appear beside report buttons, and real pending evidence has visible go-to/discard recovery. Discarding the fabricated draft retained all eight saved example records. A real unsaved transaction still blocked export with transaction-specific guidance. Changing case/form data removed prepared links.

Local browser checks downloaded and parsed report JSON and generated a downloadable PDF after reader-setting changes and draft recovery. Prepared files have attached Save links with browser-managed filenames/MIME types, held until replacement or case changes instead of one-second/30-second revocation timers. PDF results are rejected if the case changes during preparation. The existing 54 behavior tests, syntax checks and 223-asset static packaging checks pass. No customer case was inspected or altered.

The download update is published at https://crypto-passport.lovable.app in the same verified info.shrey.shah@gmail.com account. Runtime source commit d4274073552dc3e83025bfac7e766a9ff1a538af corresponds to hosting commit 02c156f143ce9ae3c65656fb6d4fee21a1d29b19. All 15 hosted source files were independently compared, and live JS/CSS hashes, worker/WASM MIME types, English OCR model integrity, entry redirect and HTML policy passed. Database remains disabled. The minimal hosting update consumed 1.5 credits.

Fresh live-browser tests confirmed inline missing-transaction guidance, reader preference changes, recoverable unsaved evidence and preservation of all eight saved synthetic records after draft discard. Report JSON and PDF both downloaded; parsing confirmed eight records/three comparisons in JSON and a valid three-page PDF. Persistent Save JSON and Save PDF links successfully downloaded the files again; their contents have no original blob/data attachments. No console errors/warnings were captured. A screenshot of the live ready-file controls was saved as proof. Existing user tabs were left untouched.

## File-reading regression and cross-evidence comparison — 28 October 2026

The published reader was reproduced missing the scanned body of a PDF with a readable digital header: it returned the header's generated-on date but zero amounts. With automatic OCR fallback, the same labelled fabricated fixture returned the actual scanned 1250.75 INR transaction amount, separate 10 INR fee, 2026-10-23 transaction date, header date and source UTR. These remained separate explicit choices with PDF/OCR page/line provenance; no target value was invented. File selection automatically started reading, and saving selected fields left evidence unreviewed/unlinked.

A separate fabricated CSV record with the same UTR/amount/date produced a cross-file comparison naming both files and marked review required. After both records were reviewed, it remained candidate only and checklist gaps stayed open. Editing the reference produced conflicting fields and reset review. Reference preservation through save/reopen, weak amount/date matches, duplicate cautions, identifier conflicts, bounded repeated groups and report mapping are covered by tests. Missing MIME aliases, table rows, adjacent currency codes, explicit two-digit centuries and split PDF glyphs have regression coverage.

The reader now distinguishes page OCR failures, no readable text and readable text without supported fields. Corrected or pasted source text is labelled Manual transcript. A page's OCR failure keeps other readable pages; these diagnostics improve recoverability without asserting that every possible document layout will extract correctly. The test documents contain no real funds, identities or customer data.

## Published verification — 28 October 2026

The update is live at https://crypto-passport.lovable.app in the verified info.shrey.shah@gmail.com account, project 440620f0-1e8c-41a5-9c41-999e6860db28. GitHub runtime source commit: 703ccc13da04dd8258e193b07df723ae6bc18014. Hosted integration commit: b4680fbc0573c97bb447b7b6b27a11739909cefd. All 15 hosted source files were independently compared with the local/GitHub source. Published JS/CSS hashes, reader asset MIME types, complete English-model SHA-256, root redirect and HTML policy passed. The database remains disabled. The minimal hosting source update consumed 1.3 Lovable credits.

Fresh live-browser tests reproduced the mixed-PDF result described above, including explicit OCR amount/date and PDF-text UTR application with source notes. PNG OCR returned the same transaction and separate fee. PDF/CSV comparisons progressed from review required to candidate only after review; unresolved bank/source gaps stayed open. Downloaded JSON retained three records, three comparison suggestions and zero linked records, without original bytes. A locked PDF returned the unlocked-copy message with reading enabled afterward. No browser errors/warnings were captured. Only visibly labelled fabricated fixtures were used.

## Automated packaging

Hosting preparation: `npm run build` packaged 223 explicitly selected app/PDF/OCR assets. `npm run check:build` verified all asset sizes and SHA-256 hashes, same-origin worker/model paths, generated HTML policy, and absence of unexpected/private/source files. This verifies packaging; hosted preview/production checks must still run against the target Lovable project.

`npm test`: 54 tests pass. Coverage includes exact decimals; quoted/BOM/multiline CSV; bad dates, duplicate headers and precision limits; BTC/EVM hashes; precise BTC/EVM structures; cross-asset/amount/date/hash exclusions; role gaps; report omission of originals; save/reopen metadata round trips; imported trust reset; original reattachment requirements; hostile text as data; unsupported and oversized case files. Reader tests cover explicit decimal formats, Indian grouping, date ambiguity, source page/line and actual OCR scores, no target-derived invented values, ID/date exclusions, bounds, already-aborted reads and source notes surviving exports/import trust reset. `npm run check` passes for every app module.

## Local PDF/OCR reader — 23 October 2026

Browser checks used generated, visibly labelled fabricated fixtures only, without customer documents or public transaction lookups:

- A two-page digital PDF yielded 50000 USD, fee 15 USD and closing balance 62500 USD as separate source-backed suggestions. The first-page ISO date agreed with the entered transaction; `03/04/2026` on page two displayed both interpretations. No suggestion was preselected. Applying without a choice was rejected. Explicit amount/date choices filled the evidence form and appended page/line/source notes; saving left the record unreviewed/unlinked and bank/source gaps open.
- An image-only PDF invoked local Tesseract OCR and returned 1250.75 INR and 2026-10-23 from `23/10/2026`, separately retaining the 10 INR fee. The actual page recognition score was 95/100 and was labelled as OCR, not verified field accuracy. Applying retained OCR method, score and source notes.
- The same receipt as a PNG exercised image decoding/rescaling and OCR, with the same values and uncertainty warning.
- An AcroForm PDF with widget values returned 750.25 USD and 2026-10-22 from its filled fields, without OCR. This checks data stored in form fields rather than relying solely on flattened page text.
- Attachment replacement cleared previous suggestions. An eleven-page range was rejected before reading; cancellation cleared results and allowed another read. An encrypted PDF returned an unlocked-copy message with no candidate values and left the read button available.

PDF text, OCR and form-field extraction run in browser workers/canvas using same-origin installed assets. Exact dependency versions/integrity are locked; worker, core and English model paths are explicit, with OCR cache disabled. The server allows only installed reader assets and app files and accepts no document uploads. Applied source notes are exported as evidence notes; full extracted document text remains temporary. Unit tests confirm no original bytes are serialized and reopening resets review/link status and requires the original.

Live local HTTP checks confirmed seven required reader asset routes/MIME types, denied package.json, arbitrary node_modules/source/private-file routes, and rejected POST with 405. `npm audit --omit=dev` reported zero known vulnerabilities on 23 October 2026; this is not an independent security assessment. Final browser smoke check after cancellation changes successfully cancelled/retried scanned-PDF OCR, retained the same 1250.75 INR / 2026-10-23 suggestions and correctly labelled agreement with the entered transaction.

These fixtures establish basic behavior, not general OCR accuracy on customer statements. English printed text, limited page ranges and explicit date/number formats are supported. Complex tables, handwriting, rotated/degraded scans, non-English scripts, inaccessible fonts and XFA may need manual transcription. Pages without supported amount/date fields now trigger automatic OCR; the explicit all-pages OCR option can also re-read pages whose digital text hides other scanned content. Cross-browser and independent security/accessibility assessments remain outstanding. The older original-blob and optional native-print gates below remain manual; they are separate from extraction.

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

## Acceptance follow-up — 22 October 2026

A fresh browser pass exercised the eight-record synthetic cash-out through review, rejected linking without explanation, manual bank linking, and edit-driven review/link reset. A separately entered fictional fiat deposit linked a reviewed receipt while source remained missing. Changing 50000 USD to 50001 blocked JSON export before transaction save; saving cleared the prior link and rejected the amount match. The downloaded JSON retained transaction 50001 versus evidence 50000, reviewed/unlinked status, candidate false, both bank/source gaps and no original bytes. No application defect was found in these checks. No application code changed; prior automated and direct-PDF validation results remain applicable. The two restricted manual checks below were not repeated or represented as passed. See [the acceptance checklist](ACCEPTANCE.md) for exact steps and required results.

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

## Ethereum mainnet ingestion checks

The 34-test suite includes native and ERC-20-shaped event normalization; exact uint256 units and 0–255 token decimals; chain/hash/receipt/block/log consistency; pending, failed, missing-receipt and unavailable-status behavior; NFT exclusion; unknown metadata; execution/blob fees and legacy paid-price fallback; contract creation; imported snapshot reconstruction and trust reset; chain/contract-aware matching; consent enforcement; fixed read-only RPC methods; malformed/oversized/rate-limited responses; and retained PDF report blocks. Tests do not establish token authenticity, consensus, ownership or finality.

Browser tests used only unrelated public transaction references through explicitly approved dRPC requests:

- Native transfer: `0xc41809233598537383592b3ef7928c736070d2366bd1bf0ef4b74c21743707ca` returned 261209063614970 wei, displayed exactly as 0.00026120906361497 ETH, with execution fee 25677103242000 wei.
- Token events: `0x724136cbce3df935e56ca570dc4ad8ff2bbd4b5b47558979f45bdb7b19344ee5` returned native value and two eligible events. Explicitly selecting log 150 retained contract `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`, raw amount 458423805, provider decimals 6 and exact scaled amount 458.423805. The ticker remained the manual label TOKEN. Execution fee was 183232725083577 wei.
- Status-only: the historical transaction `0x85d995eba9763907fdf35cd2034144dd9d53ce32cbec21349d4b12823c6860c5` had no eligible positive transfer. Only a status record was available, with no completed amount claimed.

Adding without a selection was rejected. Selected records were unreviewed/unlinked, left the fictional cash-out unchanged and closed no gaps. Editing notes preserved the snapshot. The fixed network was Ethereum mainnet, chain ID 1. No wallet, signing or broadcast operation was used.

The committed `examples/ethereum-synthetic.case.json` is clearly labelled fabricated offline test data. Reopening preserved native/token raw units, fees, status and unknown decimals, labelled acquisition `case-file-unverified`, and reset review/links. In the browser, reviewing its token record produced an exact candidate; changing the case token contract rejected that candidate even when amount/date/hash agreed. Restoring the contract and returning the record to unreviewed left every gap open. The downloaded three-record case JSON retained selected records, decimal metadata and exact fees, with no original bytes.

The app exported a four-page PDF from fabricated token, failed-transaction and unknown-decimal examples. pypdf confirmed four 595 × 842 point pages with one page image each. All four pages were rendered with Poppler and visually inspected: source/time/acquisition, contract/hash wrapping, raw units, known decimals, unknown-scaled-amount wording, failed status without a completed amount, exact fees, page numbers and unresolved gaps were retained without clipping or overlap. This validates the direct download path; the original-view/native-print manual checks above remain open.

Primary references: [Ethereum JSON-RPC](https://ethereum.org/developers/docs/apis/json-rpc/), [ERC-20](https://eips.ethereum.org/EIPS/eip-20), [block-hash RPC parameters](https://eips.ethereum.org/EIPS/eip-1898), [blob fee fields](https://eips.ethereum.org/EIPS/eip-4844), and [dRPC Ethereum endpoint](https://drpc.org/docs/ethereum-api).

## Walkthrough assessment

The fictional journey is understandable from the narrative and chronological evidence list, but is not independently substantiated. The sale/receipt are potential exact-amount candidates after review. BTC intermediary records use a different asset and need manual explanations; no FX link is manufactured. The savings claim needs underlying income records, the ownership declaration needs stronger support, and chain authenticity/fees remain unresolved. Those are material gaps even if the role checklist is manually populated. A role being linked must never be read as a verification verdict.
