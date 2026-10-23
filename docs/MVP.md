# Crypto Passport MVP guide

## Run

Node.js 22.13+: run `npm ci`, then `npm start` and open http://127.0.0.1:5173 in a modern browser with WebAssembly. Pinned dependencies install PDF.js, Tesseract.js and local English language data. No CDN/document API is needed for reading. `npm test` runs deterministic behavior tests; `npm run check` checks application modules. The server binds only to 127.0.0.1 and serves an explicit asset allowlist, including the required installed reader assets.

## Workflow

1. Choose fiat deposit, crypto deposit or cash-out, enter the transaction and explain the source. Save it before exporting.
2. Choose BTC or EVM for chain records. A hash is required for these networks. Optional guided details support multiple BTC previous-output references and recipient outputs, or EVM native transfers and token transfers. BTC values are whole satoshi strings; EVM values are whole wei/raw-token strings. These preserve exact integers. Addresses, hashes and structures are recorded as supplied, not independently authenticated or retrieved.
3. Add screenshots/PDFs and manual transcription, or import bank/exchange CSV. Every record starts unreviewed. Open the original and compare it with entered fields before marking reviewed. Editing evidence clears its review and link. Existing attachments are retained unless replaced.
4. Candidate matching requires reviewed evidence, identical asset and exact decimal amount within three calendar days. Conflicting hashes reject candidates. There is no inferred FX, fee adjustment, aggregation, ownership or authenticity. Manually link reviewed records with a written explanation; explicitly explain mismatches. A candidate never links itself. Changing the saved transaction clears prior links and current link explanations.
5. Review the role checklist and chronological evidence report. A linked role means reviewed evidence was manually attached to the explanation, not that its authenticity or sufficiency was established. Unresolved source, ownership, fees and intermediary questions belong in notes and the source narrative.
6. Export a report JSON, download a report PDF, or use the optional print action. PDF download is rendered locally as page images with Unicode text, page numbers, wrapping and evidence groups kept together where they fit. It supports up to 150 pages; use JSON for larger reports and searchable/machine-readable data. Original bytes are never embedded. Review and redact entered data before sharing.

## Read a PDF or screenshot locally

Select an attachment under Add evidence (or Edit evidence to use an existing original), then press **Read attachment locally**. PDF text and AcroForm widget values are read directly; pages with very little text are rendered locally for English OCR. For scans with an existing header/text layer, choose **Use OCR on every selected page**. PNG/JPEG/WebP screenshots also use local OCR. No attachment bytes, extracted text or document filename are sent to a document service.

The default range is pages 1–3, capped to the document's length. Each read accepts up to 10 pages and 10 MB; partial ranges are labelled explicitly, so relevant records on unread pages are not implied absent. Select another range for longer statements. Reading has a three-minute deadline, cancellation, an 8-million-pixel render cap per page and a 300,000-character extracted-text cap. An unlocked copy is needed for encrypted PDFs. English printed text is supported; handwriting, poor scans, complex layouts, non-English scripts and XFA forms can need manual entry.

Amount/date suggestions include page, extracted-line number, source snippet, method and actual page OCR score where available. The entered transaction amount/date are used only to label agreement; they never supply absent document values or select a record automatically. Fees, balances and multiple transaction rows are separate suggestions for manual assessment. A page OCR score is not a field-level accuracy guarantee or authenticity verdict. Dollar signs alone do not identify USD. Negative amounts are labelled for direction review and suggested as positive magnitudes, matching the MVP's positive-amount evidence model.

Choose **Numeric date order** when the document uses day/month/year or month/day/year. By default, `03/04/2026` shows both interpretations. Two-digit years are not guessed. Choose the explicit decimal-point or decimal-comma **Number format**; western and Indian thousands grouping is supported. Digits are never rounded through floating point or silently corrected from OCR lookalikes.

Select amount and/or date explicitly, then press **Use selected values in evidence form**. This replaces only selected evidence fields, fills currency only when identified, and appends source/page notes. The original case transaction, review and links are unchanged. Saving the evidence leaves it unreviewed/unlinked. Inspect the original/source context, then review and explain links normally. Applied source notes survive reports and case save/reopen; full extracted text is temporary and original reattachment rules still apply. Clear/cancel/edit/file changes discard pending suggestions and prevent stale reads from applying to another original.

Implementation references: [PDF.js](https://mozilla.github.io/pdf.js/), [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), [local asset paths](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md). Library licenses remain in installed npm packages; exact dependency versions and integrity hashes are in package-lock.json.

For optional developer reproduction, `scripts/make-reader-fixtures.py` uses Python Pillow, reportlab and pypdf to create labelled fabricated digital, scanned, form and encrypted PDFs plus a screenshot under the ignored `scripts/reader-fixtures/` directory. Those Python packages are not needed to run the app. Keep real customer documents out of fixtures and Git history.

## Bitcoin mainnet lookup

Enter a transaction ID under **Retrieve a Bitcoin mainnet transaction**, explicitly approve disclosure to mempool.space, then press **Fetch from mempool.space**. The direct HTTPS GET sends the transaction ID in its URL; the provider sees the IP address and connection metadata. Browser credentials and referrers are omitted. No document, narrative or other case data is transmitted. There is no automatic lookup, refresh, retry, signing or broadcasting. This feature uses a public service and may be unavailable or rate limited.

The app reads `/api/tx/:txid` and optionally `/api/blocks/tip/height` from a fixed provider origin. Responses are size-bounded and checked before adding evidence. A 15-second request deadline applies. Missing/inconsistent tip height means confirmations are unavailable; unconfirmed transactions have no block date. Provider snapshots may be stale or affected by chain reorganization. The app does not independently verify consensus, inclusion proofs, wallet ownership, source of funds, output spendability or address control.

Inspect inputs (including coinbase/missing previous outputs), outputs, fees in exact satoshis, block details, source URL and retrieval time. **Choose a specific positive output** before adding it. Output totals are never treated as a payment or wallet balance. No recipient/change classification, input-owner inference or FX matching is performed. Zero-value outputs remain in the snapshot but cannot be selected as an amount. Transactions with over 1,000 inputs or outputs, or responses over 2 MB, are rejected explicitly. The selected output is added as unreviewed chain evidence; it never changes the case transaction or closes gaps automatically.

The immutable snapshot survives manual evidence edits, report export and case save/reopen. Entered amounts/notes can differ from it and must be assessed explicitly. Automatic candidates are rejected for unconfirmed snapshots or when asset, amount, transaction ID or date differs from the preserved output/block snapshot; such differences require a manual explanation. Reopened snapshots are labelled `case-file-unverified`, not as a fresh lookup, and all review/link flags reset. Saved source URLs/timestamps are retained claims, not signed authenticity attestations. Bitcoin mainnet lookup is described above; Ethereum mainnet lookup is described below. Other EVM networks remain manual.

Provider/API references: [mempool.space REST API](https://mempool.space/docs/api/rest), [Esplora transaction format and endpoints](https://github.com/Blockstream/esplora/blob/master/API.md).

## Ethereum mainnet lookup

Choose **Ethereum mainnet — chain ID 1**, enter a transaction hash and explicitly approve disclosure to **dRPC** at `https://eth.drpc.org`, then press **Fetch from dRPC**. The provider receives the hash, related contract/block identifiers and IP/connection metadata. Credentials and referrers are omitted. No case narrative, documents, signing request, private key or wallet connection is used. The app does not automatically refresh, retry or switch providers. Other EVM networks remain available for manual entry only.

The read-only RPC allowlist is `eth_chainId`, `eth_getTransactionByHash`, `eth_getTransactionReceipt`, `eth_getBlockByHash`, `eth_getBlockByNumber`, `eth_blockNumber` and `eth_call` for the fixed decimals selector. The provider chain ID is checked first; transaction/receipt/block hashes, heights, from/to fields and log identities must agree. A separately retrieved canonical block hash is compared when available. Inconsistent responses or changed blocks are rejected. A successful provider observation is not an independently verified inclusion proof or finality guarantee.

Statuses are **pending**, **receipt-unavailable**, **succeeded**, **failed**, or **status-unavailable** (including older receipts without a status flag). Only successful receipts produce selectable completed transfers. A status-only record is available with no amount claim, including failed or pending transactions. The attempted top-level value stays separately labelled as attempted. Neither retrieval nor selection overwrites the case transaction or links evidence.

Native ETH covers the top-level transaction value only, including successful value-bearing contract creation. ERC-20-shaped events require the Transfer signature, three topics, padded from/to addresses and a 32-byte amount. ERC-721-style four-topic events and ERC-1155 events are not decoded. Arbitrary contracts can emit these shapes: authenticity, ownership, internal transfers, traces, net wallet changes, mint/burn economics and source of funds are not verified.

The chain plus contract address identifies a token. The `TOKEN` ticker label is intentionally manual; no token symbol is guessed. Optional `decimals()` metadata is requested for up to ten distinct token contracts at the receipt block hash using EIP-1898. Missing, unsupported or invalid metadata remains unknown; it never defaults to 18. Raw integer amounts are always retained. Known decimals from 0–255 are formatted and compared as exact strings without floating point or rounding. Unknown decimals mean no scaled amount is inferred, and the record cannot become a deterministic candidate.

Execution fee is `receipt.gasUsed × receipt.effectiveGasPrice`. Only legacy type 0/1 transactions may fall back to their paid gasPrice; type 2/3 fee caps are never substituted. Blob gas fees are added where applicable and present. Missing fee components remain unknown and the total stays incomplete. No L2 fee model is claimed: ingestion currently supports Ethereum mainnet only.

Limits: a 20-second overall request deadline, 2 MB per RPC response, 6 MB aggregate response data, 1,000 receipt logs and metadata calls for at most ten contracts. No requests are made on case reopening. Snapshots retain source/time, raw receipt logs, exact values, fees, transfers and limitations; reopening labels them `case-file-unverified` and resets review/link status. Matching additionally requires a successful, canonically observed snapshot, correct chain, exact token contract/native ETH identity, known decimals and unchanged entered values/date/hash. Matching remains a candidate, not verification.

The clearly fabricated `examples/ethereum-synthetic.case.json` demonstrates native/token records, failed/pending states and unknown decimals without any network request or real funds. Provider/API references: [dRPC Ethereum public endpoint](https://drpc.org/docs/ethereum-api), [Ethereum JSON-RPC](https://ethereum.org/developers/docs/apis/json-rpc/), [ERC-20](https://eips.ethereum.org/EIPS/eip-20), [EIP-1898](https://eips.ethereum.org/EIPS/eip-1898), [EIP-4844](https://eips.ethereum.org/EIPS/eip-4844).

## Save and reopen

**Save case file** creates a `crypto-passport-case` version 1 JSON file, distinct from the report export. It contains entered fields and prior review/link metadata but no attachment bytes or browser blob URLs. Keep the original files separately and store the case file privately. No encryption is applied to downloaded files.

Use **Reopen saved case** in an empty session. The importer validates and whitelists fields, caps files at 5 MB/5,000 records, and rejects unsupported formats. Review/link flags are never trusted on import: every record becomes unreviewed and unlinked, with the previous rationale retained only for reassessment. Records previously backed by attachments require reattachment before review. Export is blocked while transaction/evidence edits are pending. Reopening a report JSON is intentionally unsupported.

There is no browser persistence or account. Refreshing/closing loses session data. Clear the session before loading another case or the demo to avoid overwriting saved work.

## CSV format

Required headers: `date,amount,asset`. Optional: `reference,txid`. ISO calendar dates (`YYYY-MM-DD`) and positive unsigned decimals with at most 255 fractional digits. Select the CSV source explicitly. Quoted fields, commas, multiline fields, CRLF and a BOM are supported. Invalid dates, duplicate headers, missing columns or malformed rows reject the entire import. Limits: 2 MB/5,000 rows and 5,000 records per case. Normalize debit signs first and document direction in notes. No exchange-specific format inference.

## Synthetic walkthrough

**Load synthetic walkthrough** illustrates savings → bank transfer → exchange purchase → wallet withdrawal → exchange return → sale → bank receipt. All eight records are conspicuously fictional, unreviewed and unlinked. Hashes/addresses are not queried. Cross-asset conversions are expressed in notes, never inferred by matching. The ownership self-declaration is deliberately insufficient, underlying income evidence is absent and fees are unspecified. The report should preserve those limitations even if a reviewer manually links some supporting records. Example case/CSV files are in `examples/`.

## Privacy and limits

No document uploads, telemetry, independent verification, accounts or database. PDF/OCR reads installed same-origin assets; external network calls occur only for explicitly approved BTC/Ethereum lookups. The CSP permits same-origin assets, named blockchain providers and local WebAssembly compilation. The server exposes a fixed asset allowlist and rejects non-GET/HEAD methods; it provides no document-upload endpoint. Case data, files and extracted text live in browser memory. OCR language caching is disabled. PNG/JPEG/WebP/PDF attachments are limited to 10 MB each. Untrusted text is rendered with textContent; imported JSON is data, never instructions. Downloads contain entered personal data and selected extraction source notes and must be protected separately. No remote font/PDF/OCR service receives data. Do not put customer evidence in this public repository.

No Lovable tools/credits or deployment are configured. Future authentication, private storage, retention/deletion and additional-network ingestion require separate implementation. Deployment requires explicit approval. This MVP makes no financial, legal, tax or compliance determination.

See [validation record](VALIDATION.md) for checked behavior and remaining environment-limited checks.
