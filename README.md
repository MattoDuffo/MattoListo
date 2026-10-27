# MattoListo

A stripped-down Reminders clone: lists, the things in them, and nothing else.
React + TypeScript PWA, everything stored on the device.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the built bundle
npm run lint
```

## What it does

**Lists** — create, rename, recolour, pick a glyph, delete. Each row shows how many
reminders are still open.

**Reminders** — add with Enter (focus stays in the field, so you can type a whole list
in one go), tick off, add a note or a due date by tapping the row, delete.
Completed ones are hidden until you ask for them. Drag the handle on the right to
reorder, or focus it and use the arrow keys. Reordering while completed reminders are
hidden leaves them in the slots they already hold.

### Quality-of-life extras

| | |
|---|---|
| **Mark All as Completed / Incomplete** | One action for the whole list, in the ⋯ menu. |
| **Select Reminders** | Multi-select mode with **Select All** / **Deselect All**, then complete, uncomplete, move to another list, or delete the selection in one go. |
| **Export a list** | Share link, plain text, JSON, or a downloadable file — see below. |
| **Import a list** | Paste any of those formats, or open a file. Plain checklists work too, and the reminders can go into a new list or be appended to one you already have. |

## Sharing a list with someone else

There is no server and no account, so a list travels inside whatever you send.
Export offers:

- **Share link** — the entire list is base64-encoded into the URL fragment
  (`…/#list=…`). Opening it offers the list as an import; nothing is applied until
  the other person taps **Add to My Lists**. The fragment never leaves their browser.
  Long lists make long links, which are awkward to tap on a phone; for those, drop
  the JSON into `public/shared/<name>.json` and send `…/#import=<name>` instead,
  which the app fetches on open.
- **Plain text** — a readable `- [ ] …` checklist, paste it anywhere.
- **JSON** / **Download file** — exact copy including notes and dates, saved as
  `<name>.mattolisto.json`.

Import accepts all three, plus any rough checklist (`-`, `*`, `•`, `[x]` and a first
line as the list name). Pick **New list** or any existing list as the destination; an
imported list is an independent copy — editing it does not affect the sender's.

## Storage

Everything lives in `localStorage` under the key `mattolisto.v1`. No network calls, no
analytics. Clearing site data wipes the lists, so export anything you want to keep.

## Deployment

Pushing to `master` builds and publishes to GitHub Pages via
`.github/workflows/deploy.yml`:

**https://mattoduffo.github.io/MattoListo/**

The project subpath means `vite.config.ts` sets `base` in production builds; dev
still serves from the root.

## Installing it on a phone

It is a PWA: open the deployed URL in Safari or Chrome and use *Add to Home Screen*.
`sw-template.js` is emitted as `dist/sw.js` at build time with the real hashed
bundle filenames precached, so it opens and works with no network.

## Layout

```
src/
  App.tsx              screen state: which list, which sheet is open
  components/          Sidebar, ListDetail, ItemRow, sheets
  lib/
    store.ts           state + localStorage persistence
    share.ts           export/import encoding and parsing
    date.ts            local-day handling for due dates
    colors.ts          palette and glyphs
    types.ts
sw-template.js         service worker, precache list injected at build time
```
