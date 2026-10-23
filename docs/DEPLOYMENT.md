# Hosting the existing app

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
