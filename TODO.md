# TODO

## more
- [x]  Use a datetimepicker for the edit workout screen
- [x] the sharecards should show the Minutes + seconds in <MM:SS> for GPS-tracked/cardio exercises, not minutes -> needs to pull the information from the GPX/set, not workout info
- [ ] expose importable shared calendar for the period tracker to be subscribable to. let the user who shared initial view who has access via such a shared calendar and revoke individual calendar subscriptions.
- [ ] Similarly, expose the vetus ordo and novus ordo calendars (customizable per region) as well, here, no permissions are required.
- [x] on the stats icon for the /fitness/stats route, color the three bars inside the graph a color instead of filling (does not work here)
- [x] likewise, for the exercises, color the horizontal lines in a color when selected

## Perf (audit 2026-04-23)

Order = impact. Font items + app.html preload intentionally skipped.

- [x] 1. Lucide subpath imports — convert `from '@lucide/svelte'` barrel imports to `@lucide/svelte/icons/<kebab-name>` so Vite tree-shakes per-icon (current 748 KB shared chunk)
- [x] 2. Chart.js dynamic import in `FitnessChart.svelte` (drop 244 KB from non-stats fitness routes)
- [x] 3. Recipe API endpoints — drop `JSON.parse(JSON.stringify(...))` double-serialize (9 endpoints). Client-side shuffle / cache headers deferred (would require rethinking hero preload + hydration)
- [x] 4. Favorites page — drop unnecessary `all_brief` fetch (verified Search uses `favoritesOnly` so `allRecipes` was redundant)
- [x] 5. Replace redundant `locals.auth()` with `locals.session` across all routes (68 files, 107 sites — loaders, actions, API endpoints)
- [x] 6. Stream fitness stats loader — muscleHeatmap, nutritionStats, periods, sharedPeriods now stream via `{#await}`. `stats` still awaited (too many chart $deriveds depend on it)
- [x] 7. Muscle-heatmap endpoint — add projection + O(1) bucket math. Overview already had a projection; set-subfield narrowing was attempted but reverted (returned malformed sets). Timeseries cap not feasible: totals are lifetime-scoped.
- [x] 8. Calendar payload trim — `yearDays` narrowed to `{iso, color}` (needle lookup only), new pre-filtered `feastDots` array carries feast-specific metadata. Also fixed a stray double `locals.session ?? (locals.session ?? …)` in both calendar page loaders.
- [x] 9. History sessions endpoint — projection narrowed to exactly what SessionCard reads (drops notes, templates, mode, endTime, session-level gpsPreview); added `.lean()`.
- [x] 10. `Cache-Control` headers: 8 h public on the shuffled recipe list endpoints (`all_brief`, `category/[c]`, `tag/[t]`, `icon/[i]`, `in_season/[m]`) — rand_array is seeded per UTC day, safe to share. 1 h public on distinct-value lists (`category`, `tag`, `icon`). 5 min public on recipe detail. `private 1h` on fitness `/exercises/filters`. Calendar page skipped (session serialised into layout HTML).
- [x] 11. Search — debounce was already 100 ms. Instead of a server-side `_searchKey` (would duplicate text over the wire), memoise per-recipe normalized string in a `WeakMap` on the client — built lazily, reused across every subsequent keystroke.

## Features
[x] on /fitness/measure, fill "Past measurements" in SSR only for the last 10 measurements. anything further should be fetched client side on mount to decreae initial page load time. use a "show more" button and paginate measurments.
[x] on /fitness/measure (resp. their associated logging API routes), consolidate measurements by day. If we want to log another measurement, overwriting an old one, show a warning to indicate this. disparate measurements (e.g., weight and bodyfat) should not show this warning but simply be merged into one log entry for that day.
[x] on /fitness/measure in the past measurments tab, show more than "Body measurements only" if we don't have Bodyweight logged. we can be a bit more elaborate in our syntax here tbh.
[x] add a button on /fitness/measure/body-parts for each measurement directly below to say "Same value", instead of having to hit +, then - to lock in same number
[x] BF graph (with trend line like weight graph) on /fitness/stats page. Emphasize relative changes, not absolute numbers in design (as we cannot trust those) (e.g., use start day of overview as 0% and then show +/- x % on the graph)
[x] Workshop better names than "Measure" for the /fitness/measure route. It's about body data points (i.e., non-food related). What's a better, short name than "Measure" to capture the logging of weight, body composition, body part measurements, and period tracking?
[x] on /fitness/stats/histoy/<part> for body measurement graphs, make the range reasonable. e.g., if we have 1 cm change, do not fill the entire y-height with 1 cm. Use reasonable padding for low ranges (i think we do something like htis already on the weight graph?)
[x] on /fitness/check-in, Make the Period ended button a lot more prominent in the period tracker component.
[x] swap heart emoji on recipe favorites to lucide icon
[x] coop and migros cards on shopping list for scanning
[x] login icon from lucide in header
[ ] Investigate self-hosting BRouter
[ ] Use the same color swisstopo map both for light and dark mode (currentyl only light mode)
[ ] pre-compute required map tiles for all tiles on the route (and adjacent enough to be visibile by default on sane screen sizes) and create a fetch instruction for the server. (separate step: create a swiss-topo caching service which smoothly interpolates with non-switzerland service tiles for spots outside of switzerland)
[ ] expand compatibility outside of switzerland with non-swiss topo map
[ ] align design better with swizterland mobility
[ ] allow for difficulty cardio, difficulty technique and T1-T6 labelling
[ ] allow for Switzerland Mobility like hike icons (with alpine blue white blue, red white red, and yellow hiking shields as a fallback alternative)
[ ] Add smoothing distance for elevation calculations on GPS-tracled workouts (3 meters? more?)

## Refactor Recipe Search Component

Refactor `src/lib/components/Search.svelte` to use the new `SearchInput.svelte` component for the visual input part. This will:
- Reduce code duplication between recipe search and prayer search
- Keep the visual styling consistent across the site
- Separate concerns: SearchInput handles the UI, Search.svelte handles recipe-specific filtering logic

Files involved:
- `src/lib/components/Search.svelte` - refactor to use SearchInput
- `src/lib/components/SearchInput.svelte` - the reusable input component












  1. $app/stores → $app/state (biggest, most mechanical)
  Old: import { page } from '$app/stores' + $page.url.pathname
  New: import { page } from '$app/state' + page.url.pathname (no $, it's a rune now).
  Runes-based, smaller bundle (no store wrapper), cleaner SSR. Codebase has dozens of $app/stores imports — same kind
  of codemod-able migration as hrefs. Available since 2.12. $app/stores is deprecated.

  2. Convert legacy stores to .svelte.ts rune state
  Files like $lib/stores/recipeTranslation.ts, $lib/stores/language.ts use writable(). Modern pattern: .svelte.ts files
   with $state() + exported getters/setters. Better TS inference, no $ prefix, no auto-subscription gotchas.

  3. Remote functions for new API code ($app/server, since 2.27)
  Replaces hand-rolled +server.ts + client fetch with type-safe server functions called like normal funcs. Major
  refactor for existing /api/** (lots of files), so probably only adopt for new endpoints — not worth churning the
  existing ~80 API routes.

  4. prerender = true audit
  Static-ish pages (faith catechesis, latin prayers, apologetics arguments) are great candidates. Skip-SSR for static
  content = faster cold loads + cheaper hosting. Currently nothing's prerendered — quick win where applicable.

  5. @sveltejs/enhanced-img
  Transparent image optimization (responsive srcset, AVIF/WebP, blur placeholders) at build time. Recipe hero images
  and saint-day cards would benefit visibly. Drop-in via <enhanced:img src="...">.

  6. {@attach} over use: (Svelte 5 attachments)
  Newer API for DOM-lifecycle hooks. Supports spread + library composition use: can't. Low urgency; only matters when
  writing new lifecycle code.

  7. Shallow routing for modals/galleries
  pushState + <a> flow lets modals participate in history without full navigation. Useful if you ever add a
  recipe-image lightbox or apologetics-arg overlay. Net-new feature, not a migration.
