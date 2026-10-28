# Hosting the existing app

## Current release — 28 October 2026

Published app: https://crypto-passport.lovable.app. Verified owner: info.shrey.shah@gmail.com (workspace 5dd488614e368ef9d9d5, project 440620f0-1e8c-41a5-9c41-999e6860db28). Runtime source commit in the user repository: 703ccc13da04dd8258e193b07df723ae6bc18014; hosting wrapper commit: b4680fbc0573c97bb447b7b6b27a11739909cefd. The source branch remains codex/crypto-passport-mvp; draft PR #1 is unmerged.

The wrapper copies 15 runtime files from passport-source into public, renaming index.html to passport.html. Include evidence-map.js in both source/build allowlists when updating. The English model exceeds Lovable's per-file limit, so preparation splits it into eng.part0 and eng.part1, and a fixed same-origin GET route joins the original bytes at /vendor/tessdata/eng.traineddata.gz. The complete published model hash and JS/CSS hashes were verified. Preserve this route and the pinned dependency versions.

The latest source copy/build update used 1.3 Lovable credits; the initial hosting adapter used 1.9. Feature work is implemented outside Lovable. No database or document storage was enabled. Live synthetic PDF, image, comparison and JSON checks are recorded in VALIDATION.md.

## Build the browser assets

Run `npm ci`, `npm run build`, then `npm run check:build` with Node.js 22.13 or newer. The build writes `dist/` from an explicit allowlist of app modules and installed PDF/OCR assets. It includes PDF.js, Tesseract workers/cores, English language data, font maps and library licenses. It does not package server code, environment files, case files, attachments, tests or developer fixtures. The manifest records every asset's size and SHA-256 hash, and check:build verifies the complete output.

The generated HTML carries the reader's content policy and no-referrer metadata so static hosting preserves those protections. `_headers` supplies additional headers on hosts that support that format. Verify the actual deployed headers and module/WebAssembly MIME types before release. Client modules and workers retain their same-origin `/vendor/` paths; do not replace them with a CDN or OCR service.

## Lovable handoff

Verify the requested Lovable account and workspace before creating or publishing a project. Never infer identity from workspace display names alone.

New Lovable projects use TanStack Start. Integrating this app therefore needs a small hosting adapter around the existing browser app. Keep the transaction/evidence logic and local OCR code intact: copy the built files into the host's public static directory, expose the original HTML under a dedicated static filename, and route the site's entry to that file. Keep `/app.js`, `/style.css`, module imports and `/vendor/` available from the same origin. Avoid replacing the default framework package/build commands with the local development server. The final adapter must be checked against the actual generated host scaffold.

Git sync starts from a Lovable-created repository; it cannot attach an arbitrary existing repository. Once linked, external commits on the synced branch flow into Lovable. Keep the original GitHub repository as the reviewed source. Lovable also offers a code-ZIP import that can rebuild the app and consume credits; use the smallest required platform integration and preserve existing functionality.

## Release checks

Check the target project owner/workspace, published URL and source version. In the hosted preview and published site, exercise a synthetic case, local PDF/scan reading, manual application of a source-backed amount/date, unreviewed/unlinked evidence, gap preservation and report export. Confirm no document-upload/database/analytics integration was introduced. Existing original-view and native-print manual checks remain separate from the extraction tests.

Hosting the UI does not add accounts or durable storage. Case data stays in browser memory/downloads and originals remain local. Do not add a database or upload customer evidence as part of hosting setup.

References: [Lovable Git sync](https://docs.lovable.dev/integrations/git-sync-overview), [project import](https://docs.lovable.dev/features/projects/import-project), [publishing](https://docs.lovable.dev/features/publish).
