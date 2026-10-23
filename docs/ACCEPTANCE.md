# Local acceptance checklist

Use fabricated data only for this walkthrough. The app remains local; no deployment is required.

## Start

Run `npm ci` once with Node.js 22.13 or newer, then `npm start` and open http://127.0.0.1:5173 in a modern browser. Reader assets are installed locally. If the preview is already running, just open the address. Save a case file before closing a session you want to keep.

## Checks completed on 22 October 2026

- Loaded the synthetic cash-out: eight unreviewed/unlinked records and five missing roles.
- Reviewed its bank receipt: exact amount/date produced a candidate only.
- Attempted linking without an explanation: rejected; gaps stayed open.
- Supplied an explanation and linked: only the bank role changed to Linked.
- Edited that evidence: review/link reset and the bank gap reopened.
- Entered a fresh fictional fiat deposit: 50000 USD on 2026-10-21. A manually entered same-amount/date receipt started unreviewed.
- Reviewed and manually linked the receipt: source remained missing.
- Changed the case amount to 50001: JSON export was blocked until transaction save. Saving cleared the receipt's link and rejected it as an amount match.
- Exported and inspected report JSON: transaction amount 50001, receipt amount 50000, reviewed but unlinked, no candidate, bank/source both missing, no original file bytes.

The existing validation record covers crypto-deposit rules, Bitcoin/Ethereum ingestion, CSV imports, screenshots, save/reopen and visually checked PDF downloads. No application code changed during this acceptance pass, so the prior 34 passing tests and module checks remain the applicable automated result.

## Two checks for a person in a normal browser

These are still pending. Do not interpret this checklist as a completed sign-off.

1. **View an original PDF attachment.** Load the synthetic walkthrough. Under Add evidence, choose Bank record, use the label `SYNTHETIC PDF attachment check`, attach a harmless fabricated PDF, and press Add evidence. Click its **Open original** link. Confirm the correct PDF opens and is readable; return to the case and confirm the record remains unreviewed/unlinked. Do not mark a fabricated attachment as real evidence.
2. **Check optional native printing.** In the report section, click **Print / save PDF**. Confirm a print preview opens with the report, uncertainty labels and gaps, without the transaction/evidence editing forms. Cancel the dialog; no physical printing is needed. The separate **Download report PDF** action has already passed automated parsing and visual inspection.

Record browser name/version and pass/fail for each check. If either fails, include what appeared and the steps that triggered it. Original blob viewing was blocked by the automation tool's URL policy and the print dialog exceeded its supported boundary; neither restriction was bypassed.

## After both pass

Update the validation record with the person's results and mark PR #1 ready for review. Review and merge are separate steps. Do not deploy without explicit approval.
