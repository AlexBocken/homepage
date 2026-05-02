/**
 * Shared/top-level UI strings used across the site (homepage, auth header,
 * offline sync button, date picker, error view).
 *
 * Per-locale tables live in `$lib/i18n/common/{de,en}.ts`. Use
 * `m[lang].key` (or `m[lang][expr]` for dynamic keys) directly:
 *
 *   import { m } from '$lib/js/commonI18n';
 *   const t = $derived(m[lang]);
 *   ... t.login ...
 */

import { de } from '$lib/i18n/common/de';
import { en } from '$lib/i18n/common/en';

export const m = { de, en } as const;

export type CommonLang = keyof typeof m;
export type CommonKey = keyof typeof de;
