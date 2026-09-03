# Agent Notes

This is a public, statically rendered RhyDB query and learning app built with Astro, React islands,
TypeScript, Tailwind CSS, and daisyUI. Keep the setup simple and static-host friendly; do not introduce
a backend or server adapter unless explicitly requested.

## Commands

```sh
npm install
npm run dev
npm run check
npm test
npm run check-format
npm run build
npm run preview
```

Run `npm run format` before committing formatting-sensitive changes. The default development and
preview port is 5001.

## Architecture

- Routes live in `src/pages/` and Astro renders them to directory-style static HTML.
- Static layouts, navigation, and page content use `.astro` files. React is reserved for the
  client-only Console and exercise query-runner islands.
- Documentation is a typed MDX content collection under `src/content/docs/`; its frontmatter drives
  routes, metadata, ordering, and navigation.
- Exercise routes are generated from `src/data/exercises.ts`; changing an exercise slug changes the
  generated static route through `getStaticPaths()`.
- Checked-in static assets live in `public/`. `scripts/prepare-public.mjs` assembles them, together with
  the optional WASM build, into `.generated-public/`, which is Astro's `publicDir`.
- `PUBLIC_BASE_PATH` controls sub-path deployments; use `withBase()` for internal links.
- `PUBLIC_RHYDB_DEFAULT_SERVER` sets the Console's initial server. `PUBLIC_RHYDB_EXERCISE_SERVER` is the
  separate, non-editable exercise target. Both fall back to the GenSpectrum staging RhyDB.

## RhyDB Query Behavior

- `rhydb-version.txt` records the RhyDB release this app is currently optimized against, and the `@rhydb/rhydb-wasm` dependency is pinned to the same version. When updating them, review the language reference, editor highlighting, examples, and exercises against the matching RhyDB `documentation/query_documentation.md`.
- Browser-local RhyDB is disabled by default. Enabled builds require `PUBLIC_RHYDB_WASM_ENABLED=true` plus cross-origin-isolation response headers. `scripts/prepare-public.mjs` copies `rhydb_wasm.js` and `rhydb_wasm.wasm` out of `@rhydb/rhydb-wasm` into the generated public directory; the Emscripten loader spawns its pthread workers from its own served URL, so both files stay unbundled static assets.
- `src/lib/runQuery.ts` sends plain-text RhyDB queries to `POST <server>/query` with
  `Accept: application/x-ndjson`.
- `runBounded()` appends `.limit(100)` on its own line unless the query already has a limit, and does
  not retry a rejected query without it.
- Staging schema examples used by exercises include `country`, `region`, `division`, `date`,
  `pangoLineage`, `strain`, `main`, `unaligned_main`, and amino acid columns such as `S`, `N`, and
  `E`.
- Comparison operators (`=`, `<>`, `<`, `<=`, `>`, `>=`) take a column on either side and a non-null
  literal on the other. They never match null cells, `<>` included, while `!` is a set complement
  that does keep null rows. `column = null` is a query error; use `isNull()` / `isNotNull()`.

## Tutorial Dataset

- `data/sars-cov-2-1000/source.ndjson.zst` is the 1000-sequence dump. `npm run example-data` reduces it
  to the tutorial columns and writes it, together with the database config, lineage definitions and
  preprocessing config, into `public/example-data/sars-cov-2-1000/`. The generated files are committed;
  change the dump or the rules in the script rather than editing them by hand.
- Tutorial metadata columns are snake_case. Sequence columns keep the segment and gene names that
  `reference_genomes.json` defines.
- `src/lib/tutorialDatabase.ts` keeps one browser-local database per tab and shares it across the
  tutorial islands on a page, so a page can hold several consoles behind a single load step.

## Exercises

- Exercises are `{ slug, title, question, explanation, documentation, answer }` objects in
  `src/data/exercises.ts`.
- The answer checker compares user rows to reference rows order-independently as a multiset.
- Reference answers should be bounded, deterministic when possible, non-empty, and small enough for
  browser use. Validate changed answers against the default staging server.
- Questions that ask for a top-N result should include an explicit `.limit(...)` in the reference
  answer so users cannot accidentally pass by relying on the automatic `.limit(100)`.

## Sequence And Alignment UI

- Sequence detection is heuristic in `src/lib/sequences.ts`: uppercase biological symbols plus
  gap/stop characters, with a minimum length.
- Aligned sequence columns offer the table-header `align` action only when all non-null values share
  one length.
- `src/components/MsaView.tsx` uses Nightingale custom elements. Keep imports as used value imports;
  side-effect-only imports can be tree-shaken from production builds.
- `QueryEditor.tsx` registers Cmd/Ctrl+Enter with `Prec.highest`; otherwise CodeMirror's default
  key binding can win.

## Public Repository Hygiene

Do not commit local machine paths, private workflow notes, generated `dist/` output, `node_modules/`,
credentials, personal access tokens, or deployment state. Keep repository instructions useful to any
contributor or agent working from a normal clone.
