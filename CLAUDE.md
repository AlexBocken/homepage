You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

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

## Theming Rules

### Semantic CSS Variables (ALWAYS use these, NEVER hardcode Nord values for themed properties)

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

### What NOT to do
- **NEVER** use `var(--nord0)` through `var(--nord6)` for backgrounds, text, or borders — these don't adapt to theme
- **NEVER** write `@media (prefers-color-scheme: dark)` or `:global(:root[data-theme="dark"])` override blocks — semantic variables handle both themes automatically
- **NEVER** use `var(--font-default-dark)` or `var(--accent-dark)` — these are legacy

### Primary interactive elements
- Background: `var(--color-primary)` (nord10 light / nord8 dark)
- Hover: `var(--color-primary-hover)`
- Active: `var(--color-primary-active)`
- Text on primary bg: `var(--color-text-on-primary)`

### Accent colors (OK to use directly, they work in both themes)
- `var(--blue)`, `var(--red)`, `var(--green)`, `var(--orange)` — named accent colors
- `var(--nord10)`, `var(--nord11)`, `var(--nord12)`, `var(--nord14)` — OK for hover states of accent-colored buttons only

### Chart.js theme reactivity
Charts don't use CSS variables. Use the `isDark()` pattern from `FitnessChart.svelte`:
```js
function isDark() {
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
const textColor = isDark() ? '#D8DEE9' : '#2E3440';
```
Re-create the chart on theme change via `MutationObserver` on `data-theme` + `matchMedia` listener.

### Form inputs
- Background: `var(--color-bg-tertiary)`
- Border: `var(--color-border)`
- Text: `var(--color-text-primary)`
- Label: `var(--color-text-secondary)`

### Toggle component
Use `Toggle.svelte` (iOS-style) instead of raw `<input type="checkbox">` for user-facing boolean switches.

## Site-Wide Design Language

### Layout & Spacing
- Max content width: `1000px`–`1200px` with `margin-inline: auto`
- Card/grid gaps: `2rem` desktop, `1rem` tablet, `0.5rem` mobile
- Breakpoints: `410px` (small mobile), `560px` (tablet), `900px` (rosary), `1024px` (desktop)

### Border Radius Tokens
- `--radius-pill: 1000px` — nav bar, pill buttons
- `--radius-card: 20px` — major cards (recipe cards)
- `--radius-lg: 0.75rem` — medium rounded elements
- `--radius-md: 0.5rem` — standard rounding
- `--radius-sm: 0.3rem` — small elements

### Shadow Tokens
- `--shadow-sm` / `--shadow-md` / `--shadow-lg` / `--shadow-hover` — use these, don't hardcode
- Shadows are spread-based (`0 0 Xem Yem`) not offset-based

### Hover & Interaction Patterns
- Cards/links: `scale: 1.02` + shadow elevation on hover
- Tags/pills: `scale: 1.05` with `--transition-fast` (100ms)
- Standard transitions: `--transition-normal` (200ms)
- Nav bar: glassmorphism (`backdrop-filter: blur(16px)`, semi-transparent bg)

### Typography
- Font stack: Helvetica, Arial, "Noto Sans", sans-serif
- Size tokens: `--text-sm` through `--text-3xl`
- Headings in grids: `1.5rem` desktop → `1.2rem` tablet → `0.95rem` mobile

### Surfaces & Cards
- Use `--color-surface` / `--color-surface-hover` for card backgrounds
- Use `--color-bg-elevated` for hover/active states
- Recipe cards: 300px wide, `--radius-card` corners
- Global utility classes: `.g-icon-badge` (circular), `.g-pill` (pill-shaped)

## Versioning

When committing, bump version numbers as appropriate using semver:

- **patch** (x.y.Z): bug fixes, minor styling tweaks, small corrections
- **minor** (x.Y.0): new features, significant UI changes, new pages/routes
- **major** (X.0.0): breaking changes, major redesigns, data model changes

Version files to update:
- `package.json` — site version (bump on every commit)
- `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml` — Tauri/Android app version. Only bump these when the Tauri app codebase itself changes (e.g. `src-tauri/` files), NOT for website-only changes.
