# Crypto Passport

A local-first, transaction-first MVP for organizing evidence behind fiat deposits, crypto deposits and cash-outs.

## Start

Requires Node.js 22 or later. From the repository root:

```sh
npm start
```

Open http://127.0.0.1:5173. No dependencies or installation step is required. Run `npm test` and `npm run check` to validate the app.

See [MVP guide](docs/MVP.md) for the workflow, CSV format, BTC/EVM structures, privacy model, limitations and acceptance checklist.

Save/reopen case files, guided BTC/EVM entry, editable evidence and a fictional end-to-end walkthrough are included. Optional consent-based Bitcoin mainnet lookup retrieves a provider snapshot; users select a specific output to add as unreviewed evidence. EVM ingestion remains manual. Downloadable PDF reports render locally, with report JSON retained for searchable data. Case reopening resets review and links and requires reattachment of missing originals. See the [validation record](docs/VALIDATION.md) for tested behavior and remaining checks.

No Lovable usage, paid integrations or deployment is configured. All transaction details and files remain in browser memory; closing or refreshing loses the session unless a case file was saved. Case/report JSON and print/PDF exports contain entered data, but do not embed originals. This MVP organizes user-supplied evidence and does not independently extract, authenticate or verify it.
