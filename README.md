# bocken.org

My personal homepage, [bocken.org](https://bocken.org): a SvelteKit 2 / Svelte 5
app with MongoDB, signed in through Authentik, plus a few small sidecar services
and a Tauri Android shell. Most sections come in German and English; the faith
section also comes in Latin.

## Sections

Each section has one URL per language. The slugs all come from one table in
`src/lib/js/slugs.ts`.

### Recipes: `/rezepte` · `/recipes`
- Bilingual recipe collection. Translations go through DeepL with delta
  re-translation, and out-of-date fields are flagged for approval.
- Seasonal ranking that knows the liturgical year, a filter rail that works
  without JavaScript, similar recipes at the foot of each recipe, and a pantry
  search ("Was kann ich kochen?").
- Nutrition: ingredients are mapped to BLS/USDA entries through a triage list.
  A recipe can be logged straight into the fitness diary.
- Editor with drag-and-drop ingredients and steps, base-recipe references and a
  client-side image editor. Images get blurred placeholders.
- Readable offline in the PWA and the app.

### Hikes: `/wanderungen` · `/hikes`
- Hike reports written in mdsvex (`src/content/hikes/<slug>/`) and built by
  `scripts/build-hikes.ts`. Each report ships with GPX, photos, alt text and a
  translation.
- Interactive Leaflet/MapLibre maps where the map and the prose follow each
  other. Photo markers, an elevation profile, an aerial view and nearby hikes.
- Filter bar (region, country, tags, altitude zone, SAC grade, ranges with
  histograms) that also works without JavaScript.
- Estimated public-transport travel time for each reader, and multi-day
  itineraries.
- **Route builder** (`/api/hikes/route-builder`): plans routes on swisstopo,
  imports and re-exports GPX, matches dropped photos (HEIC included) to
  waypoints and searches places through Photon.
- Map tiles come from `tile-proxy/`: swisstopo inside CH/LI, a global provider
  everywhere else.

### Faith: `/glaube` · `/faith` · `/fides`
- **Prayers** and an interactive **Rosary**: a scroll-synced SVG of the beads,
  mystery artworks (a sticky column on desktop, a draggable PiP on mobile),
  streaks and Eastertide variants. The **Angelus** has its own counter.
- **Bible reader**: Allioli, Vulgate and Douay-Rheims, with commentaries from
  Allioli, Challoner and the Church Fathers. Each commentator has a portrait and
  a life. It also has full-text search, reading plans, a reading log, streaks,
  and shows the Catechism paragraphs that cite each verse.
- **Catechesis**: a course on the Ten Commandments. The **Catechism**
  (`kkk`/`ccc`/`cce`) is in three languages, with a thematic register, a
  glossary and citation peeks.
- **Councils**, the **Code of Canon Law** and **papal documents**
  (`lehrschreiben`), all cross-linked from the citations.
- **Liturgical calendar** (vetus and novus ordo), with ring and hills views and
  subscribable ICS feeds.
- **Apologetics** articles.

### Fitness: `/fitness` (login required)
- Workout templates, set logging with RPE, rest timers, PRs, and live sync
  between devices over SSE. Workouts can be queued offline.
- Cardio with native GPS tracking in the Android app, including a background
  foreground service and a live notification. Route maps, weather, splits,
  **segments** with best-effort history, and shareable sessions (`/r/<id>`).
- Nutrition diary: food search across BLS, USDA and Open Food Facts, barcodes,
  portions, custom meals, micronutrients and amino acids with upper-limit
  warnings, and suggestions for finishing a day.
- Body measurements and trends: weight smoothing, TDEE, a goal projection and
  per-body-part history.
- A rep counter driven by a pose and motion classifier.
- Cycle tracking with a subscribable ICS feed (`/period` · `/periode`).

### Cospend: `/cospend` · `/expenses` (group `cospend`)
- Shared expenses with several split methods, recurring payments,
  multi-currency amounts, balances and debts, and faceted search with an amount
  histogram.
- Receipt OCR (`ocr-service/`, PP-OCR via RapidOCR) with highlight pens for
  splitting line items between people. Camera capture on phones.
- **Shopping list**: shareable by token, editable on a phone, with
  build-time-generated loyalty-card barcodes.
- An API token and a beancount JSON export feed the ledger.

### Tasks: `/tasks` (group `task_users`)
Household chores with a reward system: a vinyl sticker album, a fridge
calendar, drop chances and a paper logbook.

### Finances: `/finances` (owner only)
Dashboards over a beancount ledger: net worth, balance sheet, income statement,
holdings, journal and payees. They are read through `finance-service/`, and
uncategorised transactions can be categorised from the web.

### Anki
- `anki-bridge/`: Anki sync for desktop and AnkiDroid, signed in with Bocken
  (Authentik) credentials.
- `anki-web/`: Anki's own reviewer and editor in the browser at
  `study.bocken.org`, one process per user, in the site's theme.

### Account and the rest
- Self-service registration and settings (`/registrieren`, `/einstellungen`)
  proxied to Authentik, with email-change verification and group-access
  requests.
- Owner-only admin tools (`/admin`), themed error pages that quote a Bible
  verse, a sitemap, and SEO metadata.
- Links to the other self-hosted services (Gitea, Jellyfin, Immich, SearxNG,
  Jitsi, Webtrees and others), all behind Authentik SSO.

## Technical notes

- **Auth**: Auth.js with Authentik OIDC. Route gates are one table in
  `src/hooks.server.ts` (`GATES`): groups `rezepte_users`, `cospend`,
  `task_users`, owner-only areas, and token bypasses for exports
  and share links.
- **Progressive enhancement**: filters, check-ins, the Bible reader's settings,
  the header popovers and most forms work without JavaScript.
- **PWA/offline**: a service worker caches app shells for recipes, faith,
  fitness, tasks and cospend. Caching is limited to the installed PWA and the
  app.
- **Theming**: Nord palette, light/dark through `light-dark()` and semantic CSS
  variables, glassmorphism tokens (see `CLAUDE.md`).
- **Images**: sharp, linked against the system libvips for HEIC
  (`scripts/sharp-heic.mjs`, run at `postinstall`). Blurred placeholders, and AI
  alt text through Ollama.
- **Android app**: Tauri v2 in `src-tauri/`, with native GPS, a workout
  notification and the motion gate. [Download the APK](https://bocken.org/static/Bocken.apk).

## Repository layout

| Path | What |
|---|---|
| `src/routes/` | SvelteKit routes, with language params like `[recipeLang=recipeLang]` |
| `src/lib/` | Components, `js/` runes and helpers, `server/` code, i18n |
| `src/content/` | Hikes (mdsvex), Bible, Catechism, Code of Canon Law, councils, magisterium data |
| `scripts/` | Build, import, deploy and e2e tooling |
| `src-tauri/` | Android app (Tauri v2) |
| `tile-proxy/` | Rust map-tile router (swisstopo / global) |
| `ocr-service/` | Receipt OCR (FastAPI + RapidOCR) |
| `finance-service/` | Read-only beancount JSON API |
| `anki-bridge/`, `anki-web/` | Anki sync and browser study client |
| `tests/unit/`, `tests/e2e/` | Vitest and Playwright suites |

## Development

```sh
pnpm install          # also builds sharp against the system libvips (HEIC)
cp .env.example .env  # MONGO_URL, AUTHENTIK_*, DEEPL_*, OLLAMA_URL, OCR_SERVICE_URL, …
pnpm dev
pnpm check            # svelte-check
```

The `prebuild` step generates the derived assets: emoji font subset, mystery
verses, ML models, loyalty cards, error quotes, hikes and static blurs. Other
content pipelines:

```sh
pnpm hikes:build | hikes:translate | hikes:travel | hikes:alt
pnpm photos:push | photos:pull       # hike photos live outside git
pnpm bible:import | commentary:import | bible:fathers
pnpm ccc:import | council:import | cic:import | magisterium:import
```

A git pre-commit hook (`.githooks/`, set up by `prepare`) corrects the altitudes
in hike GPX files using swissALTI3D, and refuses newly added `ß` in German text <!-- ß-ok -->
(Swiss spelling).

## Tests

```sh
pnpm test:units   # Vitest
pnpm test:e2e     # Playwright against a throwaway Mongo + real Authentik
pnpm e2e:up / e2e:down
```

The e2e stack exercises auth for real. A permission matrix checks every gated
route. See `tests/e2e/README.md`.

## Deploy

```sh
pnpm deploy       # build locally, rsync to the server, restart homepage.service
pnpm deploy:dry
pnpm android:build | android:deploy
```

## License

See [LICENSE](LICENSE).
