# Cleanup plan

Simplify the codebase without changing behaviour. Phases 1, 0 and 2 are done
(see `git log` from `6dc2d9e2`, up to v2.145.46). This file tracks what is left.

## How to verify every step

- `pnpm check`: no new errors. There are 37 errors that predate this cleanup;
  compare against them.
- `pnpm test:units`: only `tests/unit/server/helvetisms.test.ts` fails, and it
  failed before the cleanup started.
- The characterization snapshots must not move unless the change is meant to
  change behaviour. They are:
  - `tests/unit/params/slugs.test.ts`
  - `tests/unit/recipes/translation.test.ts`
  - `tests/unit/cospend/*.characterization.test.ts`
- E2E (needs Docker):
  - `pnpm test:e2e`, especially `permissions/matrix.spec.ts`.
  - Page-HTML diff: before a refactor, record a baseline with
    `HTML_SNAPSHOT=1 pnpm test:e2e --project html-snapshots --update-snapshots`.
    After the refactor, run it again without the flag and compare. See
    `tests/e2e/README.md`.
  - The recipe form payloads are pinned by `tests/e2e/recipes/form-payload.spec.ts`.
- Run the Svelte autofixer on every `.svelte` file you touch.

## Baseline (recorded 2026-09-28, v2.146.3)

The reference to compare every later step against.

- **Type check:** `pnpm check` reports 24 errors (was 37; your own commits
  fixed some).
- **Unit tests:** all pass except `tests/unit/server/helvetisms.test.ts`.
- **E2E suite** (`pnpm test:e2e`): 653 passed, 58 failed, 5 did not run.
  - 48 of the failures also fail at `745a9340`, the commit before the cleanup
    started, so they predate it (list below).
  - The other 10 were:
    - 8 flakes that pass when run serially (`--workers=1`); they break when
      parallel workers share the same seeded users;
    - the 2 hike reset specs, which were wrong and are now fixed.
  - `hikes/filters.spec.ts` passes in full since the listing URL-sync fix.
    `filter-rail:181` and `travel-estimate:33` pass too.
- **Page HTML:** 57 pages across 5 roles, recorded with
  `HTML_SNAPSHOT=1 pnpm exec playwright test --project html-snapshots --update-snapshots=all`.
  - Two consecutive runs match exactly.
  - Before each phase-3 item, re-record on a freshly seeded stack. After the
    item, run without the flag; a failure is a real change.
  - Baselines live in `tests/e2e/.tmp/html-snapshots/` (gitignored).
- **Recipe form payloads:** committed in
  `tests/e2e/recipes/form-payload.spec.ts-snapshots/`.

To iterate without re-provisioning:
1. Start the stack once with `KEEP_UP=1 pnpm test:e2e`.
2. Then run `set -a; source .env.test; set +a; node scripts/e2e/seed.mjs` and
   `pnpm exec playwright test <spec>`.

Provisioning can fail with "Token invalid/expired" if it runs before
Authentik's worker has created the bootstrap token. Rerun
`node scripts/e2e/provision-authentik.mjs`.

### E2E failures that predate the cleanup (48)

These fail both at `745a9340` and at HEAD. Worth fixing, but they are not
regressions. Counts per spec:

| Spec | Failing | Spec | Failing |
|---|---|---|---|
| recipes/filter-rail | 7 (6 since the URL-sync fix) | fitness/workout, workout-edit | 1 each |
| faith/commentary | 5 | fitness/pr | 1 |
| faith/reading-plan | 4 | fitness/nutrition-source-filter | 1 |
| faith/fathers-bio | 3 | fitness/nutrition-portions | 1 |
| faith/bible | 3 | fitness/nutrition-hot-drink | 1 |
| faith/magisterium | 2 | fitness/nutrition-add-food | 1 |
| fitness/stats | 2 | fitness/nudges | 1 |
| fitness/nutrient-contributions | 2 | fitness/gps-reattach | 1 |
| fitness/fat-composition | 2 | faith/rosary | 1 |
| fitness/exercises-nojs | 2 | faith/catechism | 1 |
| recipes/nutrition-mapping | 1 | recipes/facets | 1 |
| recipes/browse | 1 | hikes/travel-estimate:46 | 1 |

What some of them show:
- The faith ones mostly time out on a commentary disc or peek, or can't find
  Bible and commentary content that the cloned e2e DB may not have.
- `filter-rail` and `browse` fail on `getByRole('link', { name: /^Suppe\b/ })`,
  which now matches two links: a selector made ambiguous by the cloned data.

## Left over from phase 2

- [ ] **The auth gates in `hooks.server.ts` as a table.** The nine
  near-identical blocks at about lines 247–418 would become one `GATES: Gate[]`
  list and a loop:
  - Each entry has `match`, `api`, and optionally `allowed`, `bypass` and a
    401 message.
  - The two token bypasses (cospend and finances) run before the session check.
  - Every status code, message and redirect stays the same.

  Blocked in auto mode (the edit was flagged as weakening security); it needs
  your explicit go-ahead. Once it is in:
  - use `FINANCE_OWNER` from `$lib/config/users` in place of the literal
    `'alexander'`;
  - use `SLUGS` from `$lib/js/slugs` for the prefixes and regexes in the
    noindex patterns and the gates. The language detection already uses
    `pathLang()`.

  Check it with `matrix.spec.ts`, which pins each gate's exact logged-out
  answer.
- [ ] **CLAUDE.md, "Chart.js theme reactivity":** point it at
  `$lib/js/darkMode.svelte` (`isDarkTheme`, `onThemeChange`, `createDarkMode`)
  instead of the old `isDark()` pattern.

## Phase 3 – merge components (medium risk)

Record the HTML-snapshot baseline before each item.

### Cospend (done: f24ca382..6e5adce4, about 700 lines removed)
- [x] `AmountCurrencyField.svelte` plus an exchange-rate rune, replacing the
  three copies in `payments/add`, `payments/edit/[id]` and
  `recurring/edit/[id]`. Their CSS is byte-identical.
- [x] `CategoryPills.svelte` and `PayerPills.svelte`, each with `bind:value`,
  for the same three pages.
- [x] `PaymentDetails.svelte`, shared by `PaymentModal` and
  `payments/view/[id]`. Props cover the real differences:
  - CHF only, or the original currency plus CHF;
  - signed or absolute amounts;
  - how a zero split is labelled.
- [x] A pure `computeSplits()` / `buildSplitPayload()` in
  `$lib/utils/cospendSplits.ts`, replacing `SplitMethodSelector` and the edit
  page's `recalculateSplits`. It is guarded by the cospend characterization
  tests.
- [x] Validation constants shared by the payment and recurring APIs, e.g.
  `SPLIT_METHODS` and `assertPersonalWithinTotal()`.
- [x] Remove the dead no-JS scaffolding on `payments/add`: its form has no
  action, so `form` is always null.

### Recipes (done: cd966e59..6d4f3726, about 820 lines removed)
- [x] `RecipeForm.svelte`, shared by `add` and `edit/[name]`. The edit page
  keeps its extras (image card, `EditRecipeNote`, `NutritionMapper`, hidden
  fields, change detection).
  - Decide first: add uses `contenteditable="plaintext-only"` with a
    placeholder, edit uses plain `contenteditable`.
  - Guarded by `form-payload.spec.ts`.
- [x] `CreateIngredientList` and `CreateStepList`:
  - move the roughly 166 shared CSS lines to `$lib/css/recipe_list_editor.css`;
  - move the reference, sublist and remove-with-confirm logic into a factory
    next to `list_dnd.svelte.ts`.
- [x] `translation.ts`: collapse the 8 collect → translate → map-back loops
  into shared helpers, and extract `postDeepL()`. Guarded by the translation
  snapshot.
- [x] Share the add and edit server-action boilerplate:
  `requireRecipeEditor`, `saveUploadedImage`, `mapDbError`, and `isRedirect()`
  in place of the hand-written redirect rethrow.
- [x] `RecipeFilterRail`: snippets for the facet control (6 copies) and the
  collapsible section header (4 copies).
- [x] `TranslationApproval`: a `mergeRefs()` for the doubled ingredients and
  instructions code, and a nested-object accessor for `englishAddInfo`.

### Faith (about 950 lines)
- [ ] A `KatecheseArticle.svelte` wrapper for the 7 catechesis pages (head,
  JSON-LD, hero, lang notice, series, disclaimer). Keep the JSON-LD key order
  so the HTML stays byte-identical.
- [ ] One prayer registry in `$lib/faith/prayers.ts`: one entry per prayer
  (component, slugs, name, bilingual flag, categories, search terms). It
  replaces the 7 parallel tables and the two long `{#if}` chains, and
  `prayerSlugs.ts` and the sitemap derive from it.
- [ ] A `SeasonPanel.svelte` and `calendarWindow.ts` shared by the calendar's
  `RingView` and `HillsView`.
- [ ] Shared prayer-page chrome: `usePrayerLanguage`, `parseLatinParam`, and a
  `ScrollTopButton.svelte`.
- [ ] `createSyncedStreak()` for the rosary and Angelus streak stores, plus a
  shared API handler. Write merge and day-rollover unit tests first.
- [ ] `$lib/css/apologetik.css` for the styles the contra and pro detail and
  index pages share.

### Hikes (about 375 lines)
- [ ] Shared Leaflet map chrome for `HikeMap`, `HikesOverviewMap` and
  `EditMap`: `makeBaseLayers`, `watchUserLocation`, `LayerMenu.svelte` and
  `MapLocateButton.svelte`. Per-map parameters: maxZoom, first layer, canvas
  renderer, `.gps-error` offset.
- [ ] `HikesFilterBar`:
  - build the five range chips from a `RANGES` table;
  - one `toggleIn()` instead of four toggle functions;
  - reset through `emptyFilter()`.

### Fitness (about 650 lines)
- [ ] `RunDetailView` (`/r/[id]`) reuses the history page's pieces:
  `KcalEstimatePill`, `SessionSetsTable` and `GpsTrackPanel`.
  - Decide first: the share page has no timed-set formatting and no cycling
    speed on best efforts.
  - Add a smoke e2e for `/r/` first.
- [ ] A `SnapToPathsPanel.svelte` for the active-workout and history pages,
  with an `onsaved` callback for the one real difference. Add an e2e that
  mocks the snap POST.
- [ ] Nutrition page: fold the 4 near-identical log functions into
  `postFoodLog()`, `logFood()` and `logMeal()`, and drop `previousDay()` and
  `nextDay()` in favour of the existing `prevDate` and `nextDate`.
- [ ] Move custom-meal aggregation (`aggregateMealPer100g` and friends) to
  `$lib/fitness/customMeal.ts`, with tests. Don't switch it to
  `entriesCalories`.
- [ ] Measurement saving:
  - one `postMeasurementWithOverwrite()`;
  - the body-parts page uses `BODY_PART_CARDS`;
  - the edit form loops over `BODY_PART_CARDS`.
- [ ] Segment pages: a shared `EffortHistoryTable.svelte` and shared styles.

### Shared (about 250 lines)
- [ ] Date pickers: a pure `monthGrid()` and a `clickOutside` attachment
  shared by `DatePicker`, `DateTimePicker` and `TimePicker`.
- [ ] Theming-rule violations:
  - drop the manual theme blocks in `Toggle`, `Symbol`, `Header`,
    `UserHeader`, `OfflineSyncIndicator` and `LanguageSelector`;
  - use semantic colour tokens in `SearchInput`.

  The semantic tokens are close to the Nord values but not identical, so these
  are visual changes and need screenshots.
- [ ] Consider `light-dark()` in `app.css`, where the dark palette is declared
  twice. Check browser support first.
- [ ] Optionally collapse `AddButton`, `EditButton` and `SaveFab` into
  `<ActionButton icon=…>`.

## Bugs

All fixed, each in its own `fix(...)` commit:

- [x] The add-payment form offered quarterly and yearly, which the API
  rejected. Both are now supported, and custom crons more than 6 hours away
  work too.
- [x] Editing a proportional payment debited the payer twice.
- [x] Paces and split times could read `M:60`.
- [x] The hike filter's "clear all" kept the travel-time range.
- [x] The service worker and offline sync skipped `/fides`.
- [x] The no-JS Angelus and rosary actions dated prayers in UTC.
- [x] An unscoped `.run-hover-pin` rule hid the history page's hover pin.
- [x] A failed recurring-payment setup on the add page was silent.
- [x] The html `lang` attribute and the error-page language disagreed about
  the path's language.
- [x] Recipe translation:
  - `Öl`/`Olivenöl` matching;
  - an empty step counted as edited;
  - reference items were always re-sent;
  - an edited reference label was never re-translated.

## Needs a decision from you

- Delete the uncalled recipe `api/[recipeLang]/delete` endpoint? It is the
  only way to delete a recipe.
- The dormant `Image.svelte` and private-images pipeline: keep it or remove
  it?
- The one-off codemod and migration scripts in `scripts/` (about 800 lines):
  keep or remove?
