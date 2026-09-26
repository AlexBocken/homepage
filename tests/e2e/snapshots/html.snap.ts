import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Page-HTML snapshots: a refactor safety net, NOT part of the normal suite.
//
// Each entry below is loaded as its role, hydrated, and serialised into a
// normalised, diff-friendly text form (one node per line, attributes and classes
// sorted, Svelte scoping hashes / asset hashes / ids / today's date stripped).
// That text is compared against a baseline with toMatchSnapshot. Record the
// baseline on the code BEFORE a refactor, then run again AFTER it: any change in
// rendered markup shows up as a line diff. See tests/e2e/README.md.
//
// Only runs in the `html-snapshots` Playwright project, which exists only when
// HTML_SNAPSHOT=1 (see playwright.config.ts). Baselines live in the gitignored
// tests/e2e/.tmp/html-snapshots/ — they depend on the cloned dev content and on
// the current day, so they are only meaningful within one before/after session.

type Entry = {
	url: string;
	/** Extra CSS selectors whose subtree is replaced by a <masked> placeholder
	 *  (for content that is legitimately volatile, e.g. a random hero). */
	mask?: string[];
};
type RoleSet = { role: string; entries: Entry[] };

// URLs use only seeded fixtures (scripts/e2e/seed.mjs), static content (faith,
// hikes) or fixed dates, so two runs on the same stack and day match exactly.
const PAGES: RoleSet[] = [
	{
		role: 'anon',
		entries: [
			{ url: '/' },
			// Faith: landing, catechesis, prayers in all three languages, calendar on a
			// fixed day (Easter 2026) so the selection does not follow the clock.
			{ url: '/glaube' },
			{ url: '/faith' },
			{ url: '/fides' },
			{ url: '/glaube/katechese' },
			{ url: '/faith/catechesis' },
			{ url: '/glaube/katechese/erstes-gebot' },
			{ url: '/glaube/katechese/kkk/1601' },
			{ url: '/glaube/gebete' },
			{ url: '/faith/prayers' },
			{ url: '/fides/orationes' },
			{ url: '/glaube/gebete/ave-maria' },
			{ url: '/faith/prayers/hail-mary' },
			{ url: '/fides/orationes/ave-maria' },
			{ url: '/glaube/rosenkranz' },
			{ url: '/glaube/kalender/novus/2026/04/05' },
			{ url: '/faith/calendar/novus/2026/04/05' },
			{ url: '/glaube/bibel/joh/3' },
			// Hikes: both list slugs and one hike (static generated data).
			{ url: '/wanderungen' },
			{ url: '/hikes' },
			{ url: '/wanderungen/2026-mattstock' },
			{ url: '/hikes/2026-mattstock' },
			// Recipes: landing (hero is picked with Math.random — masked), category,
			// tag, season and detail pages in both languages.
			{ url: '/rezepte', mask: ['.hero-layer', '.hero-featured', 'meta[property="og:image"]'] },
			{ url: '/recipes', mask: ['.hero-layer', '.hero-featured', 'meta[property="og:image"]'] },
			{ url: '/rezepte/category' },
			{ url: '/rezepte/category/Kuchen' },
			{ url: '/rezepte/tag' },
			{ url: '/rezepte/tag/schokolade' },
			{ url: '/rezepte/season/7' },
			{ url: '/rezepte/schokokuchen' },
			{ url: '/recipes/chocolate-cake' },
			{ url: '/rezepte/hefezopf' }
		]
	},
	{
		role: 'recipes',
		entries: [
			// The recipe editor, logged in (both editors, for an add/edit page merge).
			{ url: '/rezepte/schokokuchen' },
			{ url: '/rezepte/add' },
			{ url: '/rezepte/edit/hefezopf' }
		]
	},
	{
		role: 'cospend',
		entries: [
			{ url: '/cospend/dash' },
			{ url: '/cospend/payments' },
			{ url: '/cospend/payments/add' },
			{ url: '/expenses/dash' },
			{ url: '/cospend/settle' },
			{ url: '/cospend/recurring' }
		]
	},
	{
		role: 'fitness',
		entries: [
			{ url: '/fitness/workout' },
			{ url: '/fitness/exercises' },
			{ url: '/fitness/history' },
			{ url: '/fitness/stats' },
			// A fixed past day, so the diary does not follow the clock.
			{ url: '/fitness/nutrition/2026-01-15' },
			{ url: '/fitness/check-in' }
		]
	},
	{
		role: 'tasks',
		entries: [{ url: '/tasks' }, { url: '/tasks/rewards' }, { url: '/tasks/verlauf' }]
	}
];

// Pin everything the browser contributes, so only the app can change the output.
test.use({
	locale: 'de-CH',
	timezoneId: 'Europe/Zurich',
	colorScheme: 'light',
	viewport: { width: 1280, height: 900 }
});

/** Serialise the live DOM into sorted, whitespace-normalised, one-node-per-line
 *  text. Runs in the page. */
async function serialise(page: Page, masks: string[]): Promise<string> {
	return page.evaluate((masks) => {
		const root = document.documentElement.cloneNode(true) as HTMLElement;

		// Form state lives in DOM properties, not attributes; the clone lost it.
		const liveControls = document.querySelectorAll('input, select, textarea');
		const cloneControls = root.querySelectorAll('input, select, textarea');
		liveControls.forEach((el, i) => {
			const c = cloneControls[i];
			if (!c) return;
			const live = el as HTMLInputElement;
			if (live.type === 'file') return;
			c.setAttribute('data-snap-value', live.value ?? '');
			if (live.type === 'checkbox' || live.type === 'radio') {
				c.setAttribute('data-snap-checked', String(live.checked));
			}
		});

		for (const sel of masks) {
			for (const el of Array.from(root.querySelectorAll(sel))) {
				const m = document.createElement('masked');
				m.setAttribute('selector', sel);
				el.replaceWith(m);
			}
		}

		const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'VITE-ERROR-OVERLAY']);
		// Attributes whose value is a per-build / per-request artefact.
		const DROP_ATTRS = new Set(['nonce', 'data-svelte-h', 'data-vite-dev-id']);
		// Classes that only reflect the current day (calendar grid highlights).
		const DROP_CLASSES = new Set(['today', 'is-today']);

		const lines: string[] = [];
		const attrsOf = (el: Element) =>
			Array.from(el.attributes)
				.filter((a) => !DROP_ATTRS.has(a.name))
				.map((a) => {
					let v = a.value;
					if (a.name === 'class') {
						v = v
							.split(/\s+/)
							// Svelte's scoped-CSS hash (svelte-1abc2de) changes with any
							// edit to the component's <style>, not with the markup.
							.filter((c) => c && !/^svelte-[a-z0-9]+$/.test(c) && !DROP_CLASSES.has(c))
							.sort()
							.join(' ');
						if (!v) return null;
					} else if (a.name === 'style') {
						v = v.replace(/\s+/g, ' ').trim();
					}
					return `${a.name}="${v}"`;
				})
				.filter((x): x is string => x !== null)
				.sort();

		const walk = (node: Node, depth: number) => {
			const pad = '  '.repeat(depth);
			if (node.nodeType === Node.TEXT_NODE) {
				const t = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
				if (t) lines.push(`${pad}${t}`);
				return;
			}
			if (node.nodeType !== Node.ELEMENT_NODE) return; // comments = hydration markers
			const el = node as Element;
			if (DROP_TAGS.has(el.tagName)) return;
			const attrs = attrsOf(el);
			lines.push(`${pad}<${el.tagName.toLowerCase()}${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
			for (const child of Array.from(el.childNodes)) walk(child, depth + 1);
		};

		// Head: only what a refactor must preserve (title, meta, canonical, hreflang).
		const head = root.querySelector('head');
		lines.push('# head');
		if (head) {
			const keep = head.querySelectorAll('title, meta[name], meta[property], link[rel="canonical"], link[rel="alternate"], masked');
			for (const el of Array.from(keep)) {
				if (el.tagName === 'LINK') {
					const attrs = attrsOf(el);
					lines.push(`<link ${attrs.join(' ')}>`);
				} else {
					walk(el, 0);
				}
			}
		}
		lines.push('# body');
		const body = root.querySelector('body');
		if (body) for (const child of Array.from(body.childNodes)) walk(child, 0);
		return lines.join('\n') + '\n';
	}, masks);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Scrub what varies between two runs of unchanged code. */
function normalise(html: string, now = new Date()): string {
	let out = html;

	// Build / dev-server asset hashes and cache busters.
	out = out.replace(/([?&])(v|t|ts)=[0-9a-zA-Z]+/g, '$1$2=<hash>');
	out = out.replace(/(\/_app\/immutable\/[^\s"']*?)[.-][A-Za-z0-9_-]{8}(\.(?:js|css|woff2?|png|svg|webp|jpg))/g, '$1$2');
	out = out.replace(/\/_app\/version\.json\?[^\s"']*/g, '/_app/version.json');

	// Random / generated identifiers.
	out = out.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>');
	out = out.replace(/\b[0-9a-f]{24}\b/g, '<oid>');

	// Wall-clock times inside ISO timestamps (dates are kept, see below).
	out = out.replace(/(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?/g, '$1T<time>');

	// Today (and its neighbours, for prev/next links) in the formats the app uses.
	// Other dates stay: a fixture's or a fixed URL's date is part of the contract.
	for (const [offset, label] of [
		[0, 'today'],
		[-1, 'today-1'],
		[1, 'today+1']
	] as const) {
		const d = new Date(now);
		d.setDate(d.getDate() + offset);
		const y = d.getFullYear();
		const m = pad2(d.getMonth() + 1);
		const day = pad2(d.getDate());
		const forms = [`${y}-${m}-${day}`, `${y}/${m}/${day}`, `${day}.${m}.${y}`, `${d.getDate()}.${d.getMonth() + 1}.${y}`];
		for (const f of forms) {
			// Digit guards, so 5.4.2026 does not eat the tail of 15.4.2026.
			out = out.replace(new RegExp(`(?<!\\d)${f.replace(/[./]/g, '\\$&')}(?!\\d)`, 'g'), `<${label}>`);
		}
	}
	return out;
}

/** 'anon', '/glaube/gebete/ave-maria' → ['anon', 'glaube__gebete__ave-maria.html']
 *  (an array so Playwright makes a per-role subdirectory). */
function snapshotName(role: string, url: string): string[] {
	const slug = url.replace(/^\//, '').replace(/[/?&=#]+/g, '__') || 'root';
	return [role, `${slug}.html`];
}

for (const { role, entries } of PAGES) {
	test.describe(`HTML snapshot as ${role}`, () => {
		test.use({ storageState: role === 'anon' ? { cookies: [], origins: [] } : storageStateFor(role) });

		for (const entry of entries) {
			test(entry.url, async ({ page }) => {
				// Seed the client-side Math.random so anything the browser randomises
				// (shuffles, generated ids) is identical between runs. Server-side
				// randomness is handled by masks.
				await page.addInitScript(() => {
					let a = 0x2f6b1c3d;
					Math.random = () => {
						a = (a + 0x6d2b79f5) | 0;
						let t = Math.imul(a ^ (a >>> 15), a | 1);
						t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
						return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
					};
				});
				await gotoHydrated(page, entry.url);
				// The final URL heads the snapshot, so a new/removed redirect is a diff too.
				const { pathname, search } = new URL(page.url());
				const html = `# url ${pathname}${search}\n` + normalise(await serialise(page, entry.mask ?? []));
				expect(html).toMatchSnapshot(snapshotName(role, entry.url));
			});
		}
	});
}
