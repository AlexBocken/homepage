// Valid prayer slugs (both languages), from the prayer registry.
// Used by the [prayer] route for validation, by the sitemap and by sync.ts for offline precaching
import { PRAYER_SLUGS } from '$lib/faith/prayers';

export const validPrayerSlugs = new Set(PRAYER_SLUGS);
