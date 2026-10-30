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
- Nutrition: ingredients are mapped to BLS/USDA entries by a learned ranker
  (see "Machine learning"), and checked through a triage list.
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
  build-time-generated loyalty-card barcodes. Items are sorted into aisles and
  given icons by a learned classifier (see "Machine learning").
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

## Machine learning

Two learned models do work on every request they touch: one sorts shopping-list
items into aisles, the other maps recipe ingredients to nutrition entries. Both
run in the Node process through transformers.js (ONNX Runtime) on the CPU, with
no GPU and no separate inference service. Training data comes from LLM agents
following a written labelling guide, plus the site's own manual corrections.
Each model is measured on those corrections, which the agents never saw.

(Other ML on the site, not covered here: receipt OCR with PP-OCR in
`ocr-service/`, alt text through Ollama, and the fitness rep counter's
pose/motion classifier.)

### Shopping list: item → category and icon

`src/lib/server/shoppingCategorizer.ts`, `shoppingClassifier.ts`

**What runs**
1. A manual label for the item (set in the edit dialog) wins outright.
2. Otherwise a **one-vs-rest linear SVM** picks the category. It is an
   L2-regularised squared hinge with C = 1, solved by liblinear's dual
   coordinate descent in pure TypeScript. Its features are two blocks side by
   side:
   - character n-grams, 2–5 characters within word boundaries, sublinear TF-IDF;
   - the item's **multilingual-e5-large** embedding (int8), reduced by PCA from
     1024 to 64 dimensions.
3. The icon is the first of these that applies:
   - an exact or alias match in the icon catalogue;
   - the longest catalogue name contained in the item, but only among icons of
     the predicted category;
   - the nearest icon by e5 similarity within that category (cosine ≥ 0.8);
   - the category's default icon.

**Training:** 27,425 generated items (`shoppingTrainingItems.json`, embeddings
precomputed) plus every manual label, each counted twice. The SVM trains at
server startup in about 4 s, and again 5 s after any override.

**Accuracy:** 95.8% on the manual overrides, 91.3% on 829 held-out generated
items.

**Why this design**
- **No LLM at request time.** Latency per item was too high for typing a list.
- **No hand-written German rules** (compound suffixes and the like). They are
  brittle, and every new product needed a new rule.
- **Two feature blocks, because they do different jobs.**
  - The n-grams carry most of the accuracy (93.7% alone): word parts like
    "-quark", "tk " or "setzling" generalise to unseen items.
  - The embedding adds names whose spelling says nothing about them, such as
    "tahini" or "prosecco".
  - A linear model on the embedding alone was clearly weaker.
- **A linear model trained in-process**, so a correction takes effect within
  seconds, with no training job and no deploy. The solver matches sklearn's
  `LinearSVC`, so offline experiments carry over unchanged.
- **PCA to 64 dimensions** kept accuracy level (slightly higher, even) and made
  the solve about 10× cheaper.
- **e5-large rather than e5-base:** 95.8% vs 92.6% on the overrides.
- **No fine-tuning.** A cross-fitted, GPU-fine-tuned e5-large scored 94.7%: next
  to the n-grams it added nothing.

### Recipe nutrition: ingredient → BLS/USDA entry

`src/lib/server/nutritionMatcher.ts`, `nutritionReranker.ts`, training in
`scripts/nutrition-model/`

The task is to map an ingredient line such as "Zwiebeln, fein gehackt" to one
of 14,582 entries: 7,140 from BLS and 7,442 from USDA.

**What runs (retrieve, then rerank)**
1. A global overwrite for the normalised name wins outright.
2. **Candidates**, about 55 per ingredient, merged from:
   - the top 30 by cosine under a **fine-tuned multilingual-e5-small**, over the
     entries' German names;
   - the top 30 by German char-n-gram TF-IDF;
   - the top 10 by English n-grams of the recipe's translated name.
3. **Reranker:** a linear conditional logit (softmax over each ingredient's
   candidates) on 61 features:
   - the three similarities;
   - where the ingredient's words sit in the entry name, and how much of each
     name the other covers;
   - raw/spice/database flags and the entry's category;
   - how often labelled lines chose the entry, and how similar the closest such
     line is. Manual overwrites and recipe edits are fed into these two live,
     so a correction also steers similar names, not only the exact one.
4. The winner's softmax probability is stored as the match confidence. Triage
   flags anything below 0.6.

**The embedding model**
- Trained with InfoNCE: in-batch negatives, plus 3 hard negatives per line taken
  from the wrong entries of its shortlist. Equivalent entries are masked out
  instead of being pushed apart.
- Settings: 8 epochs, lr 3e-5, temperature 0.05, batch 64, vocabulary
  embeddings frozen, bf16, gradient caching.
- Shipped as dynamically quantised int8 ONNX (118 MB). It is served from
  `bocken.org/static/models/` and sha256-pinned in
  `scripts/download-models.ts`, which puts it into transformers.js's cache.

**Data**
- 3,605 lines labelled by agents in two rounds: about 2,100 everyday lines, then
  about 1,500 hard cases (ambiguous names, regional and brand terms, state and
  form, noisy lines with notes). Agents saw a 20-candidate shortlist and searched
  the full table when it lacked the food.
- 302 manual choices from production: the test set, joined to training only for
  the final fit.

**Results on the manual choices.** "Usable" means the chosen entry, or one with
practically the same kcal, protein and fat.

| | usable | exact entry |
|---|---|---|
| previous matcher (substring heuristics, BLS first, then USDA) | 53.6% | 37% |
| reranker + untuned e5-small (round-1 data) | 77.8% | 41% |
| reranker + fine-tuned e5-small (round-1 data) | 81.5% | 49% |
| reranker + fine-tuned e5-small, rounds 1+2, int8 (shipped) | 83.4% | 50% |

**Why this design**
- **Ranking, not classification:** 14,582 targets against a few hundred real
  labels.
- **One table for both databases.** The old BLS-first cascade never let "Spices,
  cinnamon" compete with a BLS dish that merely contains cinnamon. Many of the
  manual corrections had moved spices and herbs to USDA by hand.
- **Learned weights instead of hand-tuned bonuses.** The old substring scoring
  sent "rote Zwiebel" to Rote Grütze and "Topfen" to Rumtopf.
- **Linear rather than gradient-boosted trees.** LightGBM's LambdaRank was no
  better, and a dot product is trivial to port to TypeScript and to inspect.
- **Fine-tuning pays here, unlike for the shopping list.** The hard part is
  synonyms and translation (Topfen → Quark, Zimtstange → "Spices, cinnamon",
  Marillen → Aprikose), where n-grams can't help.
  - Fine-tuning is worth about 4 points of usable matches and 8 of exact
    entries.
  - The reranker trains on cross-fitted similarities, from fold models that
    never saw the line, so it doesn't over-trust an embedding tuned on the same
    data.
- **Generated data rather than the production labels alone.**
  - Trained on generated data only: 77.8%. On the 302 labels only: 63.9%.
  - The second, targeted round fixed spirits named after fruit (Kirsch), Grana
    Padano, canned tomatoes, yolks and dried herbs: 81.5% → 84.1%.
- **e5-small rather than larger models.** A fine-tuned e5-base was 0.3 points
  better at 2.4× the size and slower. Untuned, e5-large beat e5-small by about 1
  point.
- **Settings are not the bottleneck.** A 14-run sweep (epochs 8–24, lr 2e-5 to
  1e-4, temperature, negatives, batch size) stayed within 80.5–81.8% on the
  round-1 data: the model is data-limited.
- **int8 rather than fp32.** It costs 2 of 302 items (84.1% → 83.4%) at a
  quarter of the size. The fp32 ONNX export matches PyTorch exactly.

**Known weak spots:**
- typos and rare words: "maccaroni" → Mascarpone, "msg";
- notes that name another food: "Stärke, in etwas Wasser aufgelöst" → water;
- plain herb names, where fresh vs dried is a guess.

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
