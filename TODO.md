# TODO

## Perf (audit 2026-04-23)

Order = impact. Font items + app.html preload intentionally skipped.

- [x] 1. Lucide subpath imports — convert `from '@lucide/svelte'` barrel imports to `@lucide/svelte/icons/<kebab-name>` so Vite tree-shakes per-icon (current 748 KB shared chunk)
- [x] 2. Chart.js dynamic import in `FitnessChart.svelte` (drop 244 KB from non-stats fitness routes)
- [x] 3. Recipe API endpoints — drop `JSON.parse(JSON.stringify(...))` double-serialize (9 endpoints). Client-side shuffle / cache headers deferred (would require rethinking hero preload + hydration)
- [x] 4. Favorites page — drop unnecessary `all_brief` fetch (verified Search uses `favoritesOnly` so `allRecipes` was redundant)
- [x] 5. Replace redundant `locals.auth()` with `locals.session` across all routes (68 files, 107 sites — loaders, actions, API endpoints)
- [ ] 6. Stream fitness stats loader — return promises for slow panels
- [ ] 7. Overview endpoint — add `.select(...)` projection, cap timeseries window
- [ ] 8. Calendar payload trim — drop `name` from `yearDays`, pre-filter `feastDots` server-side
- [ ] 9. History sessions endpoint — slim exercise payload for list view
- [ ] 10. `Cache-Control` headers on stable API endpoints (all_brief, calendar, exercises metadata)
- [ ] 11. Search — debounce 200 ms + server-side pre-normalized `_searchKey`

## Features
[x] on /fitness/measure, fill "Past measurements" in SSR only for the last 10 measurements. anything further should be fetched client side on mount to decreae initial page load time. use a "show more" button and paginate measurments.
[x] on /fitness/measure (resp. their associated logging API routes), consolidate measurements by day. If we want to log another measurement, overwriting an old one, show a warning to indicate this. disparate measurements (e.g., weight and bodyfat) should not show this warning but simply be merged into one log entry for that day.
[x] on /fitness/measure in the past measurments tab, show more than "Body measurements only" if we don't have Bodyweight logged. we can be a bit more elaborate in our syntax here tbh.
[x] add a button on /fitness/measure/body-parts for each measurement directly below to say "Same value", instead of having to hit +, then - to lock in same number
[x] BF graph (with trend line like weight graph) on /fitness/stats page. Emphasize relative changes, not absolute numbers in design (as we cannot trust those) (e.g., use start day of overview as 0% and then show +/- x % on the graph)
[x] Workshop better names than "Measure" for the /fitness/measure route. It's about body data points (i.e., non-food related). What's a better, short name than "Measure" to capture the logging of weight, body composition, body part measurements, and period tracking?
[x] on /fitness/stats/histoy/<part> for body measurement graphs, make the range reasonable. e.g., if we have 1 cm change, do not fill the entire y-height with 1 cm. Use reasonable padding for low ranges (i think we do something like htis already on the weight graph?)
[ ] Make the Period ended button a lot more prominent
[ ] swap heart emoji on recipe favorites to lucide icon
[ ] coop and migros cards on shopping list for scanning
[ ] login icon from lucide in header

## Refactor Recipe Search Component

Refactor `src/lib/components/Search.svelte` to use the new `SearchInput.svelte` component for the visual input part. This will:
- Reduce code duplication between recipe search and prayer search
- Keep the visual styling consistent across the site
- Separate concerns: SearchInput handles the UI, Search.svelte handles recipe-specific filtering logic

Files involved:
- `src/lib/components/Search.svelte` - refactor to use SearchInput
- `src/lib/components/SearchInput.svelte` - the reusable input component
