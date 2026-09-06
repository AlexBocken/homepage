/**
 * Display names for exercise ids, fetched in batches.
 *
 * `<ExerciseName>` appears many times on a page (every set of every session).
 * Rather than one request per name, each mount registers its id here; the
 * pending ids go out together in one `/api/fitness/exercises/names` call a
 * tick later, and the answers land in a reactive cache every instance reads.
 *
 * `undefined`: not asked yet or in flight. `null`: the catalogue has no such id.
 */
import { browser } from '$app/environment';

type Lang = 'en' | 'de';

const cache = $state<Record<Lang, Record<string, string | null>>>({ en: {}, de: {} });
const pending: Record<Lang, Set<string>> = { en: new Set(), de: new Set() };
let timer: ReturnType<typeof setTimeout> | null = null;

export function exerciseName(id: string, lang: Lang): string | null | undefined {
	return cache[lang][id];
}

export function requestExerciseName(id: string, lang: Lang): void {
	if (!browser || !id) return;
	if (id in cache[lang] || pending[lang].has(id)) return;
	pending[lang].add(id);
	if (timer === null) timer = setTimeout(flush, 20);
}

async function flush(): Promise<void> {
	timer = null;
	for (const lang of ['en', 'de'] as const) {
		const ids = [...pending[lang]];
		pending[lang].clear();
		if (ids.length === 0) continue;
		try {
			const res = await fetch(
				`/api/fitness/exercises/names?lang=${lang}&ids=${ids.map(encodeURIComponent).join(',')}`
			);
			const names: Record<string, string> = res.ok ? ((await res.json()) as { names: Record<string, string> }).names : {};
			for (const id of ids) cache[lang][id] = names[id] ?? null;
		} catch {
			// Leave them unresolved; the next mount asks again.
			for (const id of ids) delete cache[lang][id];
		}
	}
}
