# Crypto Passport MVP guide

## Run

Node.js 22+: `npm start`, then open http://127.0.0.1:5173. There are no runtime packages to install. `npm test` runs the deterministic core and case-file tests; `npm run check` checks all application modules. The server binds only to 127.0.0.1 and serves an explicit asset allowlist.

## Workflow

1. Choose fiat deposit, crypto deposit or cash-out, enter the transaction and explain the source. Save it before exporting.
2. Choose BTC or EVM for chain records. A hash is required for these networks. Optional guided details support multiple BTC previous-output references and recipient outputs, or EVM native transfers and token transfers. BTC values are whole satoshi strings; EVM values are whole wei/raw-token strings. These preserve exact integers. Addresses, hashes and structures are recorded as supplied, not independently authenticated or retrieved.
3. Add screenshots/PDFs and manual transcription, or import bank/exchange CSV. Every record starts unreviewed. Open the original and compare it with entered fields before marking reviewed. Editing evidence clears its review and link. Existing attachments are retained unless replaced.
4. Candidate matching requires reviewed evidence, identical asset and exact decimal amount within three calendar days. Conflicting hashes reject candidates. There is no inferred FX, fee adjustment, aggregation, ownership or authenticity. Manually link reviewed records with a written explanation; explicitly explain mismatches. A candidate never links itself. Changing the saved transaction clears prior links and current link explanations.
5. Review the role checklist and chronological evidence report. A linked role means reviewed evidence was manually attached to the explanation, not that its authenticity or sufficiency was established. Unresolved source, ownership, fees and intermediary questions belong in notes and the source narrative.
6. Export a report JSON or print/save PDF for sharing. The report includes gaps, reasons, transaction structure, evidence IDs, source filenames and uncertainty. Original bytes are never embedded. Review and redact entered data before sharing.

## Save and reopen

**Save case file** creates a `crypto-passport-case` version 1 JSON file, distinct from the report export. It contains entered fields and prior review/link metadata but no attachment bytes or browser blob URLs. Keep the original files separately and store the case file privately. No encryption is applied to downloaded files.

Use **Reopen saved case** in an empty session. The importer validates and whitelists fields, caps files at 5 MB/5,000 records, and rejects unsupported formats. Review/link flags are never trusted on import: every record becomes unreviewed and unlinked, with the previous rationale retained only for reassessment. Records previously backed by attachments require reattachment before review. Export is blocked while transaction/evidence edits are pending. Reopening a report JSON is intentionally unsupported.

There is no browser persistence or account. Refreshing/closing loses session data. Clear the session before loading another case or the demo to avoid overwriting saved work.

## CSV format

Required headers: `date,amount,asset`. Optional: `reference,txid`. ISO calendar dates (`YYYY-MM-DD`) and positive unsigned decimals with at most 18 fractional digits. Select the CSV source explicitly. Quoted fields, commas, multiline fields, CRLF and a BOM are supported. Invalid dates, duplicate headers, missing columns or malformed rows reject the entire import. Limits: 2 MB/5,000 rows and 5,000 records per case. Normalize debit signs first and document direction in notes. No exchange-specific format inference.

## Synthetic walkthrough

**Load synthetic walkthrough** illustrates savings → bank transfer → exchange purchase → wallet withdrawal → exchange return → sale → bank receipt. All eight records are conspicuously fictional, unreviewed and unlinked. Hashes/addresses are not queried. Cross-asset conversions are expressed in notes, never inferred by matching. The ownership self-declaration is deliberately insufficient, underlying income evidence is absent and fees are unspecified. The report should preserve those limitations even if a reviewer manually links some supporting records. Example case/CSV files are in `examples/`.

## Privacy and limits

No uploads, telemetry, external API calls, OCR, independent verification, accounts or database. Case data and files live in browser memory. PNG/JPEG/WebP/PDF attachments are limited to 10 MB each. Untrusted text is rendered with textContent; imported JSON is treated as data, never instructions. A self-hosted local server sends a restrictive CSP and does not accept file uploads. Downloads contain personal data entered by the user and must be protected separately. Do not put customer evidence in this public repository.

No Lovable tools/credits or deployment are configured. Future authentication, private storage, retention/deletion and blockchain provider ingestion require separate implementation. Deployment requires explicit approval. This MVP makes no financial, legal, tax or compliance determination.

See [validation record](VALIDATION.md) for checked behavior and remaining environment-limited checks.
