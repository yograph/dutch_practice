# flashcards

Flashcards for language learning, living at
**[flashcards.nomomon.xyz](https://flashcards.nomomon.xyz)**.

There is no backend. The app is a static React SPA on GitHub Pages, and the decks
are plain JSON files in this repo. Pronunciation audio is generated once by a
GitHub Actions workflow and committed next to the decks, so the running app never
calls an API and never needs a key.

## Layout

```
.
├── frontend/        Vite + React + TypeScript SPA (the whole app)
├── data/            decks, and generated audio — the "database"
│   ├── library.json     authored: deck metadata
│   ├── banks/*.tsv      authored: one word per line
│   ├── manifest.json    generated: the above, plus derived fields
│   └── audio/           generated: clips + lookup index
├── tools/
│   ├── data-tools/  validate decks, rebuild the manifest
│   └── audio-gen/   generate missing pronunciation audio via Gemini TTS
└── docs/
    ├── ARCHITECTURE.md   how the frontend is layered, and why
    └── DATA_CONTRACT.md  the exact shape of everything in data/
```

`data/` is copied into the build output, so the deployed site serves its own data
same-origin at `/data/...`. Editing a deck and pushing is the entire publishing
workflow.

## Getting started

Requires Node 20+ and [pnpm](https://pnpm.io) (the repo pins a version via
`packageManager`, so `corepack enable` is enough).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

The dev server serves the repo's real `data/` folder at `/data`, so development
and production read data through identical URLs.

| Command              | What it does                                            |
| -------------------- | ------------------------------------------------------- |
| `pnpm dev`           | Frontend dev server                                     |
| `pnpm build`         | Type-check, build to `frontend/dist`, copy `data/` in    |
| `pnpm preview`       | Serve the production build locally                      |
| `pnpm check`         | Biome — format, lint and organize imports, with fixes    |
| `pnpm ci:check`      | Biome in CI mode (no writes)                             |
| `pnpm typecheck`     | `tsc --noEmit`                                           |
| `pnpm data:validate` | Check `data/` against the contract                       |
| `pnpm data:manifest` | Rebuild `data/manifest.json` from `library.json` + banks  |
| `pnpm data:audio`    | Generate missing pronunciation audio (needs a Gemini key)|

Biome replaces both Prettier and ESLint here; a Husky pre-commit hook runs it on
staged files. Nothing bumps `package.json`'s version: the deployed build is
identified by the commit it was built from, shown in the app's footer.

## Adding or editing a deck

Word banks are tab-separated, one word per line, with a header row:

```tsv
id	front	back	tags
ik	ik	I	introduction
de-man	de man	the man	introduction
```

1. Append rows to a file under `data/banks/`, or add a new bank plus an entry in
   `data/library.json`. See [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md).
2. Give each word a stable `id` (a slug of its front text). **Never change or
   renumber an existing one** — it is the key a learner's saved progress is
   stored under, so editing it silently resets that word.
3. `pnpm data:manifest && pnpm data:validate`.
4. Commit and push to `main`.

There is no `revision` to bump: it is a content hash of the bank file, computed
by `data:manifest`, so a browser notices a stale cache on its own.

`front` and `back` accept a little inline formatting — `**bold**`, `*italic*`,
`__underline__` — which is stripped before text-to-speech, so adding emphasis
never regenerates audio.

Tabs are the separator because commas are everywhere in this content ("well,
fine", tag lists, `alsjeblieft (a.u.b.)`) and tabs are nowhere, which means no
quoting rules to get wrong. One word is one line, so diffs stay readable and
appending is safe.

Pushing then does two things on its own: the site redeploys, and the audio
workflow generates clips for any words that do not have one yet and commits them
back. Deleting `data/audio/` and re-running the workflow repopulates it from
scratch.

## The grammar course

`data/exercises/grammar-{a1,a2,b1,b2,c1}.json` are grammar sets that also
carry `lessons`, which makes each one a level of the **Grammar course**: A1 to
C1, every topic as a lesson page (rule, tables, examples with audio, common
mistakes, tips) followed by a practice round of that lesson's exercises. Each
exercise names its lesson in `tags`. The format is in
[`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md#grammar-lessons-optional-grammar-sets-only);
`pnpm data:validate` checks it. Two supporting decks,
`dutch-strong-verbs` and `dutch-fixed-prepositions`, drill verb principal
parts and fixed prepositions as flashcards.

## How progress is stored

Per-device, in `localStorage`, under `flashcards:progress:v1:<deckId>` — one
`known` flag and a seen-count per word. Nothing is uploaded and there are no
accounts, so progress does not follow you between devices. That is a deliberate
trade for having no backend to run.

Deck data fetched from the network is cached through TanStack Query and persisted
to `localStorage`, which is what lets the app open and work offline once a deck
has been visited.

## Deployment

`main` → GitHub Actions → GitHub Pages, on the custom domain
`flashcards.nomomon.xyz`. `frontend/public/CNAME` and the repo's Pages setting
both record that domain. The SPA is served with a `404.html` copy of
`index.html`, which is how client-side routes survive a hard refresh.

## Audio generation

`tools/audio-gen` asks Gemini TTS for each word it has not voiced yet, encodes
the result to Opus in Ogg (mono, ~16 kbps — a few KB per word) and records it in
`data/audio/index.json`. It is incremental and idempotent: existing clips are
skipped, missing files are regenerated, and clips whose text no longer appears in
any deck are pruned. Running it needs a `GEMINI_API_KEY`; the deployed app does
not. See [`tools/audio-gen/README.md`](tools/audio-gen/README.md).

## License

MIT
