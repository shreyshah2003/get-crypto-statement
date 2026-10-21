# Crypto Passport MVP

Transaction-first evidence organizer for fiat deposits, crypto deposits and cash-outs. No paid services, runtime dependencies, uploads, external API calls, automatic OCR or verification.

## Run locally

Requires Node.js 22+. Run `npm start` in this directory, then open http://127.0.0.1:5173. Run `npm test` and `npm run check` for validation. The server binds only to the local computer.

## Workflow

1. Enter the transaction, source narrative and optional BTC or EVM structure. BTC inputs reference previous transaction output indices; outputs use integer satoshi strings. EVM uses a chain ID, transaction hash, from/to addresses and integer wei strings; optional token transfers include contract/from/to, rawAmount string and integer decimals. These are user supplied structures, not chain lookups or proof of validity.
2. Import canonical bank/exchange CSV (`date,amount,asset,reference,txid`; last two optional). ISO dates and positive unsigned amounts only; normalize debit signs before import and document direction in notes. Each row remains unreviewed. No exchange-specific format inference.
3. Add screenshots/PDF evidence with manual transcription, or manual source/ownership records. Open originals, review fields, then mark reviewed. Remove and re-enter a record to correct it.
4. Matching suggests reviewed rows with an exact decimal amount and asset within three calendar days. Conflicting hashes reject candidates. No inferred FX, fees, splitting, aggregation, ownership or authenticity. Link any reviewed evidence manually with a required explanation, including mismatch reasons. A candidate never links itself. Multiple candidates remain unresolved until manually assessed.
5. Review the role-based gap checklist and export JSON or print/save PDF. A linked role means reviewed evidence was supplied; it does not certify sufficiency, authenticity, ownership or compliance. Editing a saved transaction clears all links.

## Privacy and limits

Sensitive case data and files live only in browser memory. There is no account, persistence, analytics or server upload; refreshing/closing loses the session. Export before leaving. Original files are not included in reports. Exports contain entered personal data: review and redact them before sharing. The public repository must never contain customer evidence or real test fixtures. Untrusted text is rendered using textContent rather than HTML. PDF originals open through the browser viewer. CSV import is limited to 2 MB/5,000 rows; attachments to 10 MB each. No authentication or multi-user backend is provided in this local MVP.

Future storage integration requires explicit design for authentication, per-user access controls, encryption, retention/deletion and private object storage. Future blockchain ingestion needs explicit provider consent and provenance. Lovable is not invoked. Deployment is intentionally excluded and requires approval.

## Manual acceptance checks

Exercise each case type; save invalid/valid BTC and EVM hashes; import malformed and quoted CSV; add a screenshot and PDF; review/unreview/link/unlink/remove records; confirm transaction edits clear links; check report preview/JSON/print preserve missing roles and mismatch reasons; clear the session. Enter HTML-like text and confirm it displays literally. Check narrow-screen layout and keyboard focus. Automated tests cover the deterministic core; browser acceptance should be repeated before release.
