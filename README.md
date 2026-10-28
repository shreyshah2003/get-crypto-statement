# Crypto Passport

A local-first, transaction-first MVP for organizing evidence behind fiat deposits, crypto deposits and cash-outs.

## Start

Requires Node.js 22.13 or later and a modern browser with WebAssembly. From the repository root:

```sh
npm ci
npm start
```

Open http://127.0.0.1:5173. Installation downloads pinned PDF.js, Tesseract.js and English OCR assets; document reading then runs locally without a CDN or document service. Run `npm test` and `npm run check` to validate the app.

`npm run build` packages the browser app and local reader assets into `dist/`; `npm run check:build` verifies the package and its content hashes. See [hosting notes](docs/DEPLOYMENT.md) for the Lovable handoff and hosted acceptance checks.

See [MVP guide](docs/MVP.md) for the workflow, CSV format, BTC/EVM structures, privacy model, limitations and acceptance checklist.

Save/reopen case files, guided BTC/EVM entry, editable evidence and a fictional end-to-end walkthrough are included. Optional consent-based Bitcoin mainnet lookup retrieves a provider snapshot; users select a specific output to add as unreviewed evidence. Ethereum mainnet lookup also retrieves receipt status, native values, ERC-20-shaped events, optional decimals and exact gas/blob fees through explicitly approved dRPC reads. Other EVM networks remain manual. Downloadable PDF reports render locally, with report JSON retained for searchable data. Case reopening resets review and links and requires reattachment of missing originals. See the [validation record](docs/VALIDATION.md) for tested behavior and remaining checks.

PDF text, filled form fields and English OCR now suggest amounts and dates with page/source notes. Choose the correct suggestion explicitly before applying it to evidence; ambiguous dates, fees/balances and OCR uncertainty need human review. The case transaction is never overwritten or independently verified.

Published UI: [Crypto Passport](https://crypto-passport.lovable.app). Lovable hosts a thin adapter around the browser app. Documents, extraction and case state stay local; no database or document-upload integration is enabled. Save a case before closing or refreshing. Exports contain entered data and selected source notes, not originals or full extracted documents. See the hosting notes for platform details.

File selection now starts local reading automatically. Missing PDF fields trigger OCR, including scanned bodies beneath readable headers. Diagnostics and labelled manual corrections explain failures. Cross-evidence comparisons retain hashes, references/UTRs, exact amounts and dates, flag conflicts/duplicates and never link records or close gaps automatically.
