# Repository Instructions
## Commits

- **Never** append `Co-Authored-By: Claude ...` (or any similar AI-attribution trailer) to commit messages. Do not add it even if a default template or prior convention suggests it.
- Do not include "Generated with Claude Code" footers or similar watermarks in commit messages, PR bodies, or any files in this repo.

### Versioning

When committing, bump version numbers as appropriate using semver:

- **patch** (x.y.Z): bug fixes, minor styling tweaks, small corrections
- **minor** (x.Y.0): new features, significant UI changes, new pages/routes
- **major** (X.0.0): breaking changes, major redesigns, data model changes

Version files to update:
- `package.json` — site version (bump on every commit)
- `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml` — Tauri/Android app version. Only bump these when the Tauri app codebase itself changes (e.g. `src-tauri/` files), NOT for website-only changes.

## Available MCP Tools:

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

## Common Svelte 5 Pitfalls

### `{@const}` placement
`{@const}` can ONLY be the immediate child of `{#snippet}`, `{#if}`, `{:else if}`, `{:else}`, `{#each}`, `{:then}`, `{:catch}`, `<svelte:fragment>`, `<svelte:boundary>` or `<Component>`. It CANNOT be used directly inside regular HTML elements like `<div>`, `<header>`, etc. Use `$derived` in the `<script>` block instead.

### Event modifiers removed
Svelte 5 removed event modifiers like `on:click|preventDefault`. Use inline handlers instead: `onclick={e => { e.preventDefault(); handler(); }}`.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## HEIC photos (sharp + libvips)

sharp's **prebuilt** binaries cannot read HEIC. HEVC is patent-encumbered, so
their bundled libheif is AV1-only — `sharp.format.heif.input.fileSuffix` is
`['.avif']` and an iPhone photo fails to decode. This is deliberate upstream and
no sharp release will change it.

The fix is to link sharp against the **system** libvips, which Arch builds with
libheif + libde265. `scripts/sharp-heic.mjs` does that and runs as
`postinstall`, because a plain `pnpm install` restores the prebuilt binary and
would silently take HEIC support away again. It is best-effort: without
pkg-config/libvips or a C++ toolchain it leaves the prebuilt binary in place and
says so, and sharp's own loader falls back to `@img/sharp-linux-x64` if the
from-source addon can't be loaded — so a server without libvips keeps working,
just without HEIC.

Verify with:

```sh
node -p "require('sharp').format.heif.input.fileSuffix"   # want ['.heic','.heif','.avif']
```

Consequences to keep in mind:

- `node-addon-api` and `node-gyp` are devDependencies purely for this build.
- `scripts/deploy.sh` rsyncs `node_modules/`, so the server runs whatever was
  built here. It needs `libvips` installed to use it; otherwise it silently
  falls back and `/api/hikes/route-builder/heic-preview` answers 501.
- `scripts/build-hikes.ts` refuses to build a hike whose `images/` holds a HEIC
  when sharp can't read it, naming the fix — rather than failing per photo with
  "Support for this compression format has not been built in".

# Theming Rules

## Semantic CSS Variables (ALWAYS use these, NEVER hardcode Nord values for themed properties)

| Purpose | Variable | Light resolves to | Dark resolves to |
|---|---|---|---|
| Page background | `--color-bg-primary` | white/light | dark |
| Card/section bg | `--color-surface` | nord6-ish | nord1-ish |
| Secondary bg | `--color-bg-secondary` | slightly darker | slightly lighter |
| Tertiary bg (inputs, insets) | `--color-bg-tertiary` | nord5-ish | nord2-ish |
| Hover/elevated bg | `--color-bg-elevated` | nord4-ish | nord3-ish |
| Primary text | `--color-text-primary` | dark text | light text |
| Secondary text (labels, muted) | `--color-text-secondary` | nord3 | nord4 |
| Tertiary text (descriptions) | `--color-text-tertiary` | nord2 | nord5 |
| Borders | `--color-border` | nord4 | nord2/3 |

## What NOT to do
- **NEVER** use `var(--nord0)` through `var(--nord6)` for backgrounds, text, or borders — these don't adapt to theme
- **NEVER** write `@media (prefers-color-scheme: dark)` or `:global(:root[data-theme="dark"])` override blocks — semantic variables handle both themes automatically
- **NEVER** use `var(--font-default-dark)` or `var(--accent-dark)` — these are legacy

When a component colour must differ by theme and no semantic token fits, write
`light-dark(<light>, <dark>)` on the base rule (also fine as a custom property's
value) instead of an override block. It follows the root `color-scheme`, which
`app.css` sets for no `data-theme` (OS preference), `data-theme="light"` and
`data-theme="dark"`, and the build's Lightning CSS compiles it for browsers
without `light-dark()`. It only takes `<color>` values: a filter, a full shadow
or an opacity still needs an override, or build it from a `light-dark()` colour
variable.

## Primary interactive elements
- Background: `var(--color-primary)` (nord10 light / nord8 dark)
- Hover: `var(--color-primary-hover)`
- Active: `var(--color-primary-active)`
- Text on primary bg: `var(--color-text-on-primary)`

## Accent colors (OK to use directly, they work in both themes)
- `var(--blue)`, `var(--red)`, `var(--green)`, `var(--orange)` — named accent colors
- `var(--nord10)`, `var(--nord11)`, `var(--nord12)`, `var(--nord14)` — OK for hover states of accent-colored buttons only

## Chart.js theme reactivity
Charts, canvases and map tiles can't read CSS variables. Use
`$lib/js/darkMode.svelte`:
- `isDarkTheme()` — whether the page is dark right now (`data-theme`, else the
  OS preference).
- `onThemeChange(cb)` — calls `cb` when either changes; returns the unsubscribe.
  Rebuild the chart from it.
- `createDarkMode()` — reactive `.dark` flag for a component (call during init).

```js
import { isDarkTheme, onThemeChange } from '$lib/js/darkMode.svelte';
const textColor = isDarkTheme() ? '#D8DEE9' : '#2E3440';
$effect(() => onThemeChange(rebuildChart));
```

## Form inputs
- Background: `var(--color-bg-tertiary)`
- Border: `var(--color-border)`
- Text: `var(--color-text-primary)`
- Label: `var(--color-text-secondary)`

## Toggle component
Use `Toggle.svelte` (iOS-style) instead of raw `<input type="checkbox">` for user-facing boolean switches.

## Site-Wide Design Language

## Layout & Spacing
- Max content width: `1000px`–`1200px` with `margin-inline: auto`
- Card/grid gaps: `2rem` desktop, `1rem` tablet, `0.5rem` mobile
- Breakpoints: `410px` (small mobile), `560px` (tablet), `900px` (rosary), `1024px` (desktop)

## Border Radius Tokens
- `--radius-pill: 1000px` — nav bar, pill buttons
- `--radius-card: 20px` — major cards (recipe cards)
- `--radius-lg: 0.75rem` — medium rounded elements
- `--radius-md: 0.5rem` — standard rounding
- `--radius-sm: 0.3rem` — small elements

## Shadow Tokens
- `--shadow-sm` / `--shadow-md` / `--shadow-lg` / `--shadow-hover` — use these, don't hardcode
- Shadows are spread-based (`0 0 Xem Yem`) not offset-based

## Hover & Interaction Patterns
- Cards/links: `scale: 1.02` + shadow elevation on hover
- Tags/pills: `scale: 1.05` with `--transition-fast` (100ms)
- Standard transitions: `--transition-normal` (200ms)
- Nav bar: glassmorphism — see below

## Glassmorphism

Frosted panels (nav bar, the popovers anchored to it) all share one recipe.
**Never hardcode the tint or the blur radius** — use the `--glass-*` tokens from
`app.css`, which already resolve per theme:

```css
background: var(--glass-bg);
backdrop-filter: blur(var(--glass-blur));
border: 1px solid var(--glass-border);
box-shadow: 0 4px 24px var(--glass-shadow);
```

### Nothing that needs blur may sit inside a backdrop root

An element becomes a **backdrop root** — meaning descendants can only sample what
is painted *inside* it, which is nothing — when it has any of:

- `backdrop-filter`
- **`view-transition-name`** ← the non-obvious one; it bit this repo twice
- `filter`, `opacity < 1`, `mask`, `mix-blend-mode`, `contain: paint`

A `backdrop-filter` under any of those renders as a flat translucent panel. No
error, no warning — it silently does nothing. `position: fixed` does **not**
escape it; only leaving the DOM subtree does. (A background colour with an alpha
channel is fine — that is not `opacity`.)

**This is why the header is shaped the way it is.** `Header.svelte` is:

```
.header-shell     ← sticky + z-index. Plain box: NO filter, NO view-transition-name
  .glass          ← the frosted pane: background + backdrop-filter + view-transition-name
  nav             ← plain flex row, position: relative
      … .header-right, popovers, everything that needs its own blur …
```

The frosted pane is a **sibling** of the bar's content, never its ancestor, so a
popover inside `nav` still blurs the page behind it. Do not move
`backdrop-filter` or `view-transition-name` onto `nav` or `.header-shell` —
either flattens every popover in the bar.

`.header-right` is the one exception, and it shows the general escape hatch. It
*needs* `view-transition-name: nav-right`, or the theme toggle, language picker
and avatar drop out of the morph and just fade in place. It also *contains* the
profile menu, which needs to blur. Both are satisfied because the two are never
required at the same time — the bar only morphs during navigation, and the menu
is closed then — so the name is dropped exactly while the menu is open:

```css
.header-right { view-transition-name: nav-right; }
.header-right:has(:global(#pfp-menu-toggle:checked)) { view-transition-name: none; }
```

Reach for that pattern when an element genuinely needs both: scope the
backdrop-root-creating property to the state where the blur isn't showing.

Popovers in the bar use a **CSS-only checkbox disclosure** so they work with
JavaScript disabled — a visually-hidden-but-focusable `<input type="checkbox">`,
a `<label>` as the visible trigger, and `:checked ~ .panel { display: block }`.
JS is only a progressive enhancement for click-outside-to-close. See
`UserHeader.svelte` and `OfflineSyncIndicator.svelte`.

### Never hand-write `-webkit-backdrop-filter`

Lightning CSS auto-prefixes when the build minifies CSS. Its targets there are
Vite's `build.cssTarget`, which defaults to `build.target`
(`baseline-widely-available`: chrome111 / firefox114 / safari16.4), **not**
`css.lightningcss.targets` in `vite.config.ts` — Vite's `minifyCSS` overrides
those, and they would only apply with `css.transformer: 'lightningcss'`, which
this repo doesn't set. Writing both by hand makes it dedupe them down to **only** the
`-webkit-` property, silently dropping the standard one and breaking blur in
Firefox. The sole exception is the offline page's inline CSS string in
`service-worker.ts`, which never passes through Lightning CSS.

## Typography
- Font stack: Helvetica, Arial, "Noto Sans", sans-serif
- Size tokens: `--text-sm` through `--text-3xl`
- Headings in grids: `1.5rem` desktop → `1.2rem` tablet → `0.95rem` mobile

## Surfaces & Cards
- Use `--color-surface` / `--color-surface-hover` for card backgrounds
- Use `--color-bg-elevated` for hover/active states
- Recipe cards: 300px wide, `--radius-card` corners
- Global utility classes: `.g-icon-badge` (circular), `.g-pill` (pill-shaped)

# Custom Components

Prefer these existing components over rolling your own or reaching for a library.
Most take `$bindable` props and small callbacks; check the source for the exact
prop list before using.

## Shared (`$lib/components/`)
- `DatePicker.svelte` — themed date picker. `bind:value` (YYYY-MM-DD), `lang`,
  `min`/`max` (YYYY-MM-DD strings), `fontSize`, `onchange()`. Use this for ALL
  date inputs — never a raw `<input type="date">`.
- `SearchInput.svelte` — pill search box. `bind:value`, `placeholder`,
  `clearTitle`, `onClear()`, `oninput(e)`. Styled for a hero by default; override
  `:global(.search)` when embedding inline.
- `Toggle.svelte` — iOS-style switch. Use instead of a raw checkbox for
  user-facing booleans.
- `confirm()` from `$lib/js/confirmDialog.svelte` — themed confirm dialog.
  `await confirm(message, { title?, confirmText?, cancelText?, destructive? })`
  returns `Promise<boolean>`. Use this for ALL confirmations — never the native
  `confirm()`/`alert()`/`prompt()`. The `<ConfirmDialog />` host is already
  mounted in the root layout, so just import and call.
- `ImageUpload.svelte` — receipt/image dropzone + preview + camera capture
  (touch). `bind:imageFile`/`imagePreview`/`uploading`, `currentImage`, callbacks
  `onimageSelected`/`onimageRemoved`/`oncurrentImageRemoved`/`onerror`.
- `AddButton.svelte` / `EditButton.svelte` / `SaveFab.svelte` — floating action
  buttons (add / edit / save).
- `hikes/RangeSlider.svelte` — dual-thumb numeric range. `bind:low`/`high`,
  `min`/`max`/`step`, `format()`, optional `histogram: number[]` (distribution
  bars over the track), `oncommit()` (fires on drag-end / key, not every move).
  Generic despite its folder — reused outside hikes.

## Cospend (`$lib/components/cospend/`)
- `ProfilePicture.svelte` — user avatar from `bocken.org/static/user/...`,
  initials fallback. `username`, `size`.
- `CospendFilterBar.svelte` — collapsible search + filter panel (category/payer
  pills, date-range pickers, amount `RangeSlider` with histogram). URL-driven via
  `onChange(filters)`; modeled on `hikes/HikesFilterBar.svelte`.
- `ReceiptScanner.svelte` — auto-scans an uploaded receipt (server OCR), lets you
  tap/draw to correct the total and assign line items to people (highlight pens).
- `ReceiptOverlay.svelte` — read-only replay of stored receipt highlight
  selections over the image.
- `SplitMethodSelector.svelte` — split-method cards + live per-person ledger.

## Conventions
- Receipt image URL: build with `receiptUrl()` from `$lib/utils/cospendImage`
  (never reference the stored filename directly).
- Cospend categories/colours: `$lib/js/cospendI18n` (`PAYMENT_CATEGORIES`,
  `getCategoryOptionsI18n`) and `$lib/utils/receiptColors` (`penColor`).

# End-to-End Tests (Playwright)

The e2e suite lives in `tests/e2e/` and runs the app against a disposable stack
(throwaway Mongo + a real Authentik OIDC provider), so **auth and permissions are
exercised for real — never bypass auth**. Run with `pnpm test:e2e` (up →
provision → seed → run → teardown); `pnpm e2e:up` / `pnpm e2e:down` manage the
stack for iterating. See `tests/e2e/README.md` for the full picture.

Key pieces: seven test users in `tests/e2e/users.json` (`full`, `none`,
`recipes`, `cospend`, `tasks`, `fitness`, `anna`) whose saved logins are picked
with `storageStateFor('<role>')` (or `ANONYMOUS`) from `helpers/auth.ts`; use
`gotoHydrated()` from `helpers/nav.ts` before the first interaction (a click
before hydration is a silent no-op). Realistic content is cloned from the dev DB
(`scripts/e2e/clone-dev.mjs`); deterministic fixtures tests key on are upserted
by `scripts/e2e/seed.mjs`.

**When you add or change routes, update the tests in the same change:**
- **New route / user-facing flow** → add an e2e spec under the matching
  `tests/e2e/<domain>/` covering its real interactions (prefer stable ids /
  `aria-label` / roles over translated text; card names live in `aria-label`).
  Round-trip create→verify→delete so specs stay idempotent; own any needed
  fixtures on the `e2e_*` users in `seed.mjs`.
- **New permission-gated route** (a group check in `src/hooks.server.ts`, or a
  page/endpoint guarded in its own load) → add it to
  `tests/e2e/permissions/matrix.spec.ts`. Every group-gated route must be checked
  with a user who has the **right** group, a user with a **different** group, a
  user with **no** groups, and a **logged-out** user; login-only routes with a
  logged-in user vs logged-out. Keep both language slugs behaving identically.
