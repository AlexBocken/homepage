# TODO

## Refactor Recipe Search Component

Refactor `src/lib/components/Search.svelte` to use the new `SearchInput.svelte` component for the visual input part. This will:
- Reduce code duplication between recipe search and prayer search
- Keep the visual styling consistent across the site
- Separate concerns: SearchInput handles the UI, Search.svelte handles recipe-specific filtering logic

Files involved:
- `src/lib/components/Search.svelte` - refactor to use SearchInput
- `src/lib/components/SearchInput.svelte` - the reusable input component
