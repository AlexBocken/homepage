/**
 * The vitest config has no alias for SvelteKit's virtual `$app/*` modules and
 * `vi.mock` cannot rescue an import vite fails to resolve. So for tests that
 * must render real cospend components/pages, we copy the *current* source to a
 * temp dir with `$app/state` / `$app/navigation` pointed at local stubs and
 * relative imports made absolute, then import that copy. The source is read at
 * test time, so any refactor of the originals is exercised automatically.
 * The copies are removed again in afterAll via cleanupPatched().
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const STUB_STATE = resolve(__dirname, 'stubs/appState.ts');
const STUB_NAV = resolve(__dirname, 'stubs/appNavigation.ts');
// Must live under the project root for vite to serve it (a /tmp path is not
// found), and in a gitignored dir; .svelte-kit is generated output anyway.
const OUT_BASE = resolve(ROOT, '.svelte-kit/cospend-characterization');
mkdirSync(OUT_BASE, { recursive: true });
const OUT = mkdtempSync(join(OUT_BASE, 'run-'));

/** Source files (repo-relative) that import `$app/*` and so need patching too. */
const NEEDS_PATCH = new Set(['src/lib/components/cospend/SplitMethodSelector.svelte']);

const written = new Map<string, string>();
let n = 0;

function patch(repoRel: string): string {
	const cached = written.get(repoRel);
	if (cached) return cached;
	const abs = resolve(ROOT, repoRel);
	let src = readFileSync(abs, 'utf8');
	src = src
		.replace(/(['"])\$app\/state\1/g, JSON.stringify(STUB_STATE))
		.replace(/(['"])\$app\/navigation\1/g, JSON.stringify(STUB_NAV))
		.replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/g, (_m, _q, rel) => `from ${JSON.stringify(resolve(dirname(abs), rel))}`);
	for (const dep of NEEDS_PATCH) {
		if (dep === repoRel) continue;
		const alias = dep.replace(/^src\/lib\//, '$lib/');
		if (src.includes(alias)) {
			src = src.split(`'${alias}'`).join(JSON.stringify(patch(dep)));
		}
	}
	const out = join(OUT, `${n++}-${basename(abs).replace(/[[\]=+]/g, '_')}`);
	writeFileSync(out, src);
	written.set(repoRel, out);
	return out;
}

/** Import a patched copy of a repo .svelte file; returns its default export. */
export async function loadPatched(repoRel: string) {
	const mod = await import(/* @vite-ignore */ patch(repoRel));
	return mod.default;
}

/** Remove this run's patched copies. */
export function cleanupPatched() {
	rmSync(OUT, { recursive: true, force: true });
}
