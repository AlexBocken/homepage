import { test, expect, request, type APIResponse } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';

// Exhaustive authorization matrix for every permission-gated route. Each
// group-gated route is checked with a user who has the right group, a user with
// a *different* group, a user with no groups, and a logged-out user. Login-only
// routes are checked with any logged-in user vs logged-out.
//
// Gates mirror src/hooks.server.ts. We drive each role through its own request
// context (its saved storageState) and assert on the raw HTTP outcome.

const BASE = 'http://localhost:4173';

// A single-group role to use as the "right" and "wrong" user for each group.
const RIGHT_ROLE: Record<string, string> = { rezepte_users: 'recipes', cospend: 'cospend', task_users: 'tasks' };
const WRONG_ROLE: Record<string, string> = { rezepte_users: 'cospend', cospend: 'recipes', task_users: 'recipes' };

async function fetchAs(role: string, path: string, method: 'get' | 'post' | 'patch' = 'get', form = false): Promise<APIResponse> {
	const ctx = await request.newContext({
		baseURL: BASE,
		storageState: role === 'anon' ? undefined : storageStateFor(role)
	});
	try {
		// A POST-only endpoint answers a GET with 405, which says nothing about who
		// is allowed to call it — the group check runs inside the handler. An empty
		// JSON body is enough: the guard runs before any validation of it.
		// A page's form action takes only form-encoded data; JSON is refused
		// before any guard runs.
		if (method === 'post') return await ctx.post(path, form ? { form: { _: '' }, maxRedirects: 0 } : { data: {}, maxRedirects: 0 });
		if (method === 'patch') return await ctx.patch(path, { data: [], maxRedirects: 0 });
		return await ctx.get(path, { maxRedirects: 0 });
	} finally {
		await ctx.dispose();
	}
}

function expectAllowed(res: APIResponse) {
	expect(res.status(), `expected access, got ${res.status()}`).not.toBe(403);
	expect(res.status()).not.toBe(401);
	expect(res.headers()['location'] ?? '').not.toContain('/login');
}
function expectForbidden(res: APIResponse) {
	expect(res.status(), `expected 403, got ${res.status()}`).toBe(403);
}
// Anonymous access must be denied — either a redirect to /login (hook-guarded
// routes) or a 401/403 (routes guarded in their own load, e.g. /einstellungen's
// requireSelf). Both are valid "blocked" outcomes.
function expectAnonBlocked(res: APIResponse) {
	const s = res.status();
	const loc = res.headers()['location'] ?? '';
	const redirectedToLogin = s >= 300 && s < 400 && loc.includes('/login');
	const denied = s === 401 || s === 403;
	expect(redirectedToLogin || denied, `expected anon to be blocked, got ${s} ${loc}`).toBe(true);
}

// Exact anonymous outcome of the gates in src/hooks.server.ts. The loose
// expectAnonBlocked above accepts any "blocked" answer, so a refactor of the
// hook (e.g. collapsing its if-chain into a table) could quietly change a 303
// into a 302, drop the callbackUrl, or turn an API 401 into a redirect. For any
// path the hook itself gates we therefore pin the precise response:
//   page → 303 to /login?callbackUrl=<encodeURIComponent(pathname + search)>
//   API  → 401
// This is a deliberate mirror of the hook's prefix list: if a gate is added,
// removed or re-scoped, update it here in the same change.
const HOOK_PAGE_PREFIXES = [
	'/rezepte/edit',
	'/rezepte/add',
	'/cospend',
	'/expenses',
	'/tasks',
	'/finances',
	'/admin',
	'/case-math',
	'/fitness',
	'/settings',
	'/einstellungen'
];
const HOOK_API_PREFIXES = [
	'/api/cospend',
	'/api/tasks',
	'/api/finances',
	'/api/admin',
	'/api/case-math',
	'/api/fitness',
	'/api/nutrition',
	'/api/user'
];
const HOOK_BIBLE_PLAN_PAGE = /^\/(glaube|faith|fides)\/(bibel|bible|biblia)\/plan(\/|$)/;
const HOOK_BIBLE_PLAN_API = /^\/api\/(glaube|faith|fides)\/bibel\/(plan|gelesen)(\/|$)/;
// Run map/share-card images self-authorize and are exempt from the fitness gate.
const HOOK_EXEMPT = /^\/api\/fitness\/sessions\/[^/]+\/(map|card)\.webp$/;

function hookAnonOutcome(path: string): 'login-redirect' | 401 | null {
	const { pathname } = new URL(path, BASE);
	if (HOOK_EXEMPT.test(pathname)) return null;
	if (HOOK_API_PREFIXES.some((p) => pathname.startsWith(p)) || HOOK_BIBLE_PLAN_API.test(pathname)) return 401;
	if (HOOK_PAGE_PREFIXES.some((p) => pathname.startsWith(p)) || HOOK_BIBLE_PLAN_PAGE.test(pathname)) {
		return 'login-redirect';
	}
	return null;
}

// Loose check for every row, plus the exact hook answer when the hook owns the gate.
function expectAnonBlockedExactly(res: APIResponse, path: string) {
	expectAnonBlocked(res);
	const outcome = hookAnonOutcome(path);
	if (outcome === 401) {
		expect(res.status(), `hook should answer 401 for ${path}`).toBe(401);
	} else if (outcome === 'login-redirect') {
		const { pathname, search } = new URL(path, BASE);
		expect(res.status(), `hook should 303 ${path} to login`).toBe(303);
		expect(res.headers()['location']).toBe(`/login?callbackUrl=${encodeURIComponent(pathname + search)}`);
	}
}

type Route = { path: string; kind: 'page' | 'api'; method?: 'get' | 'post' | 'patch'; form?: boolean };
type GroupRoute = Route & { group: keyof typeof RIGHT_ROLE };

const GROUP_ROUTES: GroupRoute[] = [
	// rezepte_users
	{ path: '/rezepte/add', group: 'rezepte_users', kind: 'page' },
	{ path: '/rezepte/edit/schokokuchen', group: 'rezepte_users', kind: 'page' },
	// The nutrition review queue and one recipe of its walk. Both language slugs
	// are listed: the guard runs before the German redirect, so /recipes/* must
	// answer a stranger exactly as /rezepte/* does.
	{ path: '/rezepte/admin/nutrition/review', group: 'rezepte_users', kind: 'page' },
	{ path: '/recipes/admin/nutrition/review', group: 'rezepte_users', kind: 'page' },
	{ path: '/rezepte/admin/nutrition/review/e2e_mapping', group: 'rezepte_users', kind: 'page' },
	{ path: '/recipes/admin/nutrition/review/e2e_mapping', group: 'rezepte_users', kind: 'page' },
	// POST-only: re-matches one ingredient for the editor's triage list. Writes
	// nothing, but it reads a recipe and runs the matcher, so it is gated like the
	// editor that calls it.
	// An empty body reaches the guard and then fails validation with a 400, which
	// expectAllowed accepts and which writes nothing. (cache-per100g is gated the
	// same way but is deliberately absent: its allowed-path call would rebuild
	// every recipe's cached figures and disturb the specs that read them.)
	{ path: '/api/rezepte/nutrition/match-one', group: 'rezepte_users', kind: 'api', method: 'post' },
	// The per-recipe nutrition writes (manual mapping edits, regenerate). They
	// were once ungated; a recipe that doesn't exist gets past the guard to a 404,
	// so the allowed path writes nothing.
	{ path: '/api/rezepte/nutrition/e2e-no-such-recipe', group: 'rezepte_users', kind: 'api', method: 'patch' },
	// Deletion is gated inside the handler. The empty body stops at its 400
	// ("old_short_name missing") on the allowed path, so nothing is deleted.
	{ path: '/api/rezepte/delete', group: 'rezepte_users', kind: 'api', method: 'post' },
	{ path: '/api/rezepte/nutrition/generate/e2e-no-such-recipe', group: 'rezepte_users', kind: 'api', method: 'post' },
	// Hook-gated editor page for a second recipe (the hook matches the whole
	// /rezepte/edit prefix; the English /recipes/* aliases are pinned below).
	{ path: '/rezepte/edit/pfannkuchen', group: 'rezepte_users', kind: 'page' },
	// Recipe maintenance pages. Not in the hook: each load checks the group
	// itself (302 to login, 403 otherwise), under both language slugs.
	{ path: '/rezepte/administration', group: 'rezepte_users', kind: 'page' },
	{ path: '/recipes/administration', group: 'rezepte_users', kind: 'page' },
	{ path: '/rezepte/admin/untranslated', group: 'rezepte_users', kind: 'page' },
	{ path: '/recipes/admin/untranslated', group: 'rezepte_users', kind: 'page' },
	{ path: '/rezepte/admin/image-blurs', group: 'rezepte_users', kind: 'page' },
	{ path: '/recipes/admin/image-blurs', group: 'rezepte_users', kind: 'page' },
	{ path: '/rezepte/admin/alt-text-generator', group: 'rezepte_users', kind: 'page' },
	{ path: '/recipes/admin/alt-text-generator', group: 'rezepte_users', kind: 'page' },
	// cospend
	{ path: '/cospend/dash', group: 'cospend', kind: 'page' },
	{ path: '/cospend/payments', group: 'cospend', kind: 'page' },
	{ path: '/cospend/settle', group: 'cospend', kind: 'page' },
	{ path: '/cospend/recurring', group: 'cospend', kind: 'page' },
	{ path: '/expenses/dash', group: 'cospend', kind: 'page' },
	{ path: '/cospend/settings', group: 'cospend', kind: 'page' },
	{ path: '/expenses/settings', group: 'cospend', kind: 'page' },
	// Both slugs of the [cospendRoot] matcher, for every section, so a hook table
	// that forgets /expenses (or a sub-path) is caught.
	{ path: '/cospend', group: 'cospend', kind: 'page' },
	{ path: '/expenses', group: 'cospend', kind: 'page' },
	{ path: '/expenses/payments', group: 'cospend', kind: 'page' },
	{ path: '/cospend/payments/add', group: 'cospend', kind: 'page' },
	{ path: '/expenses/payments/add', group: 'cospend', kind: 'page' },
	{ path: '/expenses/settle', group: 'cospend', kind: 'page' },
	{ path: '/expenses/recurring', group: 'cospend', kind: 'page' },
	// The shopping list: session-gated like the rest unless a valid share token is
	// presented (see the share-token block below).
	{ path: '/cospend/list', group: 'cospend', kind: 'page' },
	{ path: '/expenses/list', group: 'cospend', kind: 'page' },
	{ path: '/api/cospend/list', group: 'cospend', kind: 'api' },
	{ path: '/api/cospend/balance', group: 'cospend', kind: 'api' },
	{ path: '/api/cospend/debts', group: 'cospend', kind: 'api' },
	{ path: '/api/cospend/monthly-expenses', group: 'cospend', kind: 'api' },
	{ path: '/api/cospend/recurring-payments', group: 'cospend', kind: 'api' },
	{ path: '/api/cospend/payments', group: 'cospend', kind: 'api' },
	// Session+group management of beancount export tokens (mint/list). The
	// token-authenticated /api/cospend/export endpoint is covered separately
	// below (it rejects sessions without a token).
	{ path: '/api/cospend/export/tokens', group: 'cospend', kind: 'api' },
	// task_users
	{ path: '/tasks', group: 'task_users', kind: 'page' },
	{ path: '/tasks/new', group: 'task_users', kind: 'page' },
	{ path: '/tasks/rewards', group: 'task_users', kind: 'page' },
	{ path: '/tasks/verlauf', group: 'task_users', kind: 'page' },
	{ path: '/api/tasks', group: 'task_users', kind: 'api' },
	{ path: '/api/tasks/stats', group: 'task_users', kind: 'api' },
	// The hook gates the whole prefix, so even a path no task matches must be
	// refused before the route runs (a stranger never learns what exists).
	{ path: '/tasks/000000000000000000000000', group: 'task_users', kind: 'page' }
];

// Login-only: any authenticated user is allowed; no group differentiates.
const LOGIN_ONLY_ROUTES: Route[] = [
	// The Bible reading plan and log are one reader's own. The page sits under the
	// [faithLang]/[bible] matchers, so two slugs are checked; the API answers 401.
	{ path: '/glaube/bibel/plan', kind: 'page' },
	{ path: '/faith/bible/plan', kind: 'page' },
	{ path: '/fides/biblia/plan', kind: 'page' },
	{ path: '/api/glaube/bibel/plan?today=2026-01-01', kind: 'api' },
	{ path: '/api/glaube/bibel/gelesen?today=2026-01-01', kind: 'api' },
	{ path: '/api/faith/bibel/plan?today=2026-01-01', kind: 'api' },
	{ path: '/api/fides/bibel/gelesen?today=2026-01-01', kind: 'api' },
	{ path: '/api/glaube/bibel/gelesen', kind: 'api', method: 'post' },
	// The chapter page's own "read" form action, for a reader without script.
	// Unmarking a chapter nobody marked leaves no trace behind.
	{ path: '/glaube/bibel/joh/3?/unread', kind: 'page', method: 'post', form: true },
	{ path: '/faith/bible/joh/3?/unread', kind: 'page', method: 'post', form: true },
	// The hikes route builder sits behind the [hikesLang] matcher; both slugs
	// must gate identically.
	{ path: '/wanderungen/route-builder', kind: 'page' },
	{ path: '/hikes/route-builder', kind: 'page' },
	{ path: '/fitness/check-in', kind: 'page' },
	{ path: '/fitness/nutrition', kind: 'page' },
	{ path: '/fitness/exercises', kind: 'page' },
	{ path: '/fitness/history', kind: 'page' },
	{ path: '/fitness/stats', kind: 'page' },
	{ path: '/fitness/stats/nutrients', kind: 'page' },
	// The per-nutrient contribution breakdown reads one user's food log, so it must be
	// gated exactly like the diary it is reached from.
	{ path: '/fitness/nutrition/nutrient/vitaminA', kind: 'page' },
	// Calorie balance, adherence and body trends: one user's intake, weight and goal,
	// day by day.
	{ path: '/fitness/stats/deficit', kind: 'page' },
	{ path: '/fitness/stats/adherence', kind: 'page' },
	{ path: '/fitness/stats/body', kind: 'page' },
	// Protein per kg of bodyweight, day by day: the same food log divided by the
	// same weight history, so it is gated like both.
	{ path: '/fitness/stats/protein', kind: 'page' },
	// Fitness is login-only in the hook (no `fitness` group check). The root
	// redirects to the workout page; every section also has a German slug that
	// must gate identically to the English one.
	{ path: '/fitness', kind: 'page' },
	{ path: '/fitness/workout', kind: 'page' },
	{ path: '/fitness/training', kind: 'page' },
	{ path: '/fitness/erfassung', kind: 'page' },
	{ path: '/fitness/ernaehrung', kind: 'page' },
	{ path: '/fitness/uebungen', kind: 'page' },
	{ path: '/fitness/verlauf', kind: 'page' },
	{ path: '/fitness/statistik', kind: 'page' },
	{ path: '/fitness/segmente', kind: 'page' },
	{ path: '/api/fitness/sessions', kind: 'api' },
	{ path: '/api/fitness/exercises', kind: 'api' },
	{ path: '/api/fitness/templates', kind: 'api' },
	{ path: '/api/fitness/stats/protein-per-kg', kind: 'api' },
	// Per-workout cardio progress. One athlete's own templates and sessions — there is
	// no shared-scope variant, so every caller must at least be logged in. The detail
	// routes are checked with an id nobody has run: a permitted user gets a 404 (which
	// is "allowed" here), an anonymous one must still be bounced to /login.
	{ path: '/fitness/segments', kind: 'page' },
	{ path: '/fitness/segments/template/000000000000000000000000', kind: 'page' },
	{ path: '/api/fitness/stats/workout-templates', kind: 'api' },
	{ path: '/api/fitness/stats/workout-templates/000000000000000000000000', kind: 'api' },
	{ path: '/api/fitness/stats/daily-balance', kind: 'api' },
	{ path: '/api/fitness/goal', kind: 'api' },
	{ path: '/api/fitness/stats/micronutrients', kind: 'api' },
	// The nutrition API is login-only rather than group-gated: it is consumed both by
	// the fitness food diary and by the recipe editor, which sit behind different
	// groups. Query params are real ones so a permitted user gets a 200, not a 400
	// that would pass the gate assertion without exercising the endpoint.
	{ path: '/api/nutrition/search?q=chicken', kind: 'api' },
	{ path: '/api/nutrition/lookup?source=usda&id=2646170', kind: 'api' },
	{ path: '/api/nutrition/overwrites', kind: 'api' },
	{ path: '/api/nutrition/barcode?code=0000000000000', kind: 'api' },
	// Barcode → BLS/USDA mappings are global and any logged-in user may set them,
	// so this is login-only like the rest of /api/nutrition.
	{ path: '/api/nutrition/barcode-override?code=0000000000000', kind: 'api' },
	{ path: '/settings', kind: 'page' },
	{ path: '/einstellungen', kind: 'page' },
	// Self-service account API, gated by the same hook block as /settings.
	{ path: '/api/user/profile', kind: 'api' },
	// Anki sync provisioning state. Login-only, not gated on `anki_users`: the
	// settings card has to render for someone who does not have the group yet so
	// it can point them at the request form. Access to syncing itself is enforced
	// by anki-bridge, not here. The endpoint only ever reports on the session
	// user, and degrades to `available: false` when the bridge is absent — which
	// it is in the e2e stack.
	{ path: '/api/anki/status', kind: 'api' },
	// HEIC → JPEG preview for the route-builder's photo dropzone. POST-only, and
	// login-only like the builder page it serves: it decodes whatever it is
	// handed, so it must never answer a stranger. An empty body reaches the auth
	// guard and then fails form parsing with a 400, which expectAllowed accepts.
	{ path: '/api/hikes/route-builder/heic-preview', kind: 'api', method: 'post' }
];

for (const r of GROUP_ROUTES) {
	test.describe(`${r.path} [needs ${r.group}]`, () => {
		test('right permissions → allowed', async () => expectAllowed(await fetchAs(RIGHT_ROLE[r.group], r.path, r.method, r.form)));
		test('different permissions → 403', async () => expectForbidden(await fetchAs(WRONG_ROLE[r.group], r.path, r.method, r.form)));
		test('no permissions → 403', async () => expectForbidden(await fetchAs('none', r.path, r.method, r.form)));
		test('logged out → blocked', async () => expectAnonBlockedExactly(await fetchAs('anon', r.path, r.method, r.form), r.path));
	});
}

for (const r of LOGIN_ONLY_ROUTES) {
	test.describe(`${r.path} [login-only]`, () => {
		test('logged in (no groups) → allowed', async () => expectAllowed(await fetchAs('none', r.path, r.method, r.form)));
		test('logged out → blocked', async () => expectAnonBlockedExactly(await fetchAs('anon', r.path, r.method, r.form), r.path));
	});
}

// Owner-only: the private /finances area is gated on a specific Authentik
// username (see hooks.server.ts), not a group. Every other logged-in role —
// even the all-groups `full` user — must be forbidden, and anonymous access
// blocked. Guards against the gate being accidentally loosened to a group or
// login-only check. The `owner` role is that username with no groups at all;
// it's checked below on the routes that work without outside services.
const OWNER_ONLY_ROUTES: Route[] = [
	{ path: '/finances', kind: 'page' },
	{ path: '/finances/spending', kind: 'page' },
	{ path: '/finances/investments', kind: 'page' },
	{ path: '/finances/budget', kind: 'page' },
	{ path: '/finances/account', kind: 'page' },
	{ path: '/finances/account/Expenses:Food', kind: 'page' },
	{ path: '/finances/payee/Cospend', kind: 'page' },
	{ path: '/finances/query', kind: 'page' },
	{ path: '/finances/categorize', kind: 'page' },
	{ path: '/api/finances/meta', kind: 'api' },
	{ path: '/api/finances/budget', kind: 'api' },
	{ path: '/api/finances/investments', kind: 'api' },
	{ path: '/api/finances/account?account=Assets', kind: 'api' },
	{ path: '/api/finances/payee?payee=Cospend', kind: 'api' },
	{ path: '/api/finances/query?q=SELECT%20account', kind: 'api' },
	// Specific (non-proxy) owner-gated API route backing the BQL console.
	{ path: '/api/finances/saved-queries', kind: 'api' },
	// Categorizer store + its export-token management (both owner-session gated).
	{ path: '/api/finances/overrides', kind: 'api' },
	{ path: '/api/finances/export/tokens', kind: 'api' },
	// Site-wide maintenance tools. Gated on the same username as /finances,
	// because they act across every user's data (regenerating everyone's
	// pre-rendered run maps and share cards).
	{ path: '/admin/fitness-images', kind: 'page' },
	{ path: '/api/admin/fitness-images', kind: 'api' },
	// The admin/finances gates cover their whole prefix, including paths no
	// route serves: the hook must refuse them before routing can 404.
	{ path: '/admin', kind: 'page' },
	{ path: '/api/admin/e2e-no-such-endpoint', kind: 'api' },
	{ path: '/finances/e2e-no-such-page', kind: 'page' },
	// Private case-interview math trainer, gated on the same username.
	{ path: '/case-math', kind: 'page' },
	{ path: '/case-math/daily', kind: 'page' },
	{ path: '/case-math/drill/squares', kind: 'page' },
	{ path: '/case-math/drill/mixed', kind: 'page' },
	{ path: '/case-math/learn', kind: 'page' },
	{ path: '/case-math/progress', kind: 'page' },
	{ path: '/case-math/e2e-no-such-page', kind: 'page' },
	{ path: '/api/case-math/stats', kind: 'api' },
	{ path: '/api/case-math/sessions', kind: 'api', method: 'post' }
];

// The owner gets in on the username alone. (/finances needs the ledger service,
// which the e2e stack doesn't run, so it's left to the forbidden checks above.)
for (const r of OWNER_ONLY_ROUTES.filter((r) => r.path.startsWith('/case-math') || r.path.startsWith('/api/case-math'))) {
	test(`${r.path} [owner-only] owner (no groups) → allowed`, async () =>
		expectAllowed(await fetchAs('owner', r.path, r.method)));
}

for (const r of OWNER_ONLY_ROUTES) {
	test.describe(`${r.path} [owner-only]`, () => {
		test('most-privileged user (full) → 403', async () => expectForbidden(await fetchAs('full', r.path, r.method)));
		test('no permissions → 403', async () => expectForbidden(await fetchAs('none', r.path, r.method)));
		test('logged out → blocked', async () => expectAnonBlockedExactly(await fetchAs('anon', r.path, r.method), r.path));
	});
}

// English recipe-editor aliases. The hook only matches /rezepte/edit and
// /rezepte/add; the [recipeLang] matcher also serves /recipes/*, whose loads
// 301 to the German editor for EVERY caller (the group check then happens on
// the German URL, and the form actions re-check it themselves). Pinned per role
// so a refactor that starts gating — or stops redirecting — the aliases shows up.
const ENGLISH_EDITOR_ALIASES = [
	{ path: '/recipes/add', location: '/rezepte/add' },
	{ path: '/recipes/edit/chocolate-cake', location: '/rezepte/edit/schokokuchen' }
];
for (const a of ENGLISH_EDITOR_ALIASES) {
	test.describe(`${a.path} [English alias → German editor]`, () => {
		for (const role of ['recipes', 'cospend', 'none', 'anon']) {
			test(`${role} → 301 ${a.location}`, async () => {
				const res = await fetchAs(role, a.path);
				expect(res.status()).toBe(301);
				expect(res.headers()['location']).toBe(a.location);
			});
		}
	});
}

// Shopping-list share tokens: the cospend hook lets an anonymous caller through
// to /cospend/list, /expenses/list and /api/cospend/list only with a VALID
// ?token=. A bogus token must fall through to the normal anonymous answer (and
// the token must survive in the login callbackUrl). No valid share token is
// seeded, so the happy path is left to the shopping-list specs.
test.describe('shopping list [invalid share token]', () => {
	for (const path of ['/cospend/list?token=e2e-bogus', '/expenses/list?token=e2e-bogus', '/api/cospend/list?token=e2e-bogus']) {
		test(`logged out ${path} → blocked`, async () => expectAnonBlockedExactly(await fetchAs('anon', path), path));
	}
	test('a share token does not bypass the group check for a wrong-group user', async () => {
		expectForbidden(await fetchAs('recipes', '/cospend/list?token=e2e-bogus'));
	});
});

// Run map / share-card images are exempt from the fitness hook gate so they can
// be fetched for OG previews with a per-run token. The endpoint then authorizes
// on its own (owner session or token). The distinguishing statuses below are
// what prove the exemption: the hook would answer an anonymous caller 401, the
// endpoint answers 400 (malformed id) or 403 (not yours, no token).
test.describe('/api/fitness/sessions/:id/{map,card}.webp [hook-exempt, self-authorizing]', () => {
	for (const img of ['map.webp', 'card.webp']) {
		test(`logged out, malformed id → 400 from the endpoint (${img})`, async () => {
			expect((await fetchAs('anon', `/api/fitness/sessions/not-an-id/${img}`)).status()).toBe(400);
		});
		test(`logged out, unknown session → 403 from the endpoint (${img})`, async () => {
			expect((await fetchAs('anon', `/api/fitness/sessions/000000000000000000000000/${img}`)).status()).toBe(403);
		});
		test(`logged out, bogus share token → 403 (${img})`, async () => {
			expect(
				(await fetchAs('anon', `/api/fitness/sessions/000000000000000000000000/${img}?token=e2e-bogus`)).status()
			).toBe(403);
		});
		test(`logged in non-owner → 403 (${img})`, async () => {
			expect((await fetchAs('none', `/api/fitness/sessions/000000000000000000000000/${img}`)).status()).toBe(403);
		});
	}
	// Anything else under the session id is NOT exempt.
	test('logged out, sibling endpoint (gpx) → 401 from the hook', async () => {
		expect((await fetchAs('anon', '/api/fitness/sessions/000000000000000000000000/gpx')).status()).toBe(401);
	});
});

// Token-only: /api/cospend/export is authenticated by a CospendApiToken (see
// src/lib/server/cospendApiAuth.ts), NOT a session. Without a valid token every
// caller must be rejected — including a logged-in cospend user, who clears the
// hooks group gate but is then refused by the endpoint for lack of a token.
// Guards against the export being loosened to plain session/group access.
test.describe('/api/cospend/export [token-only]', () => {
	test('cospend user without token → 401', async () => {
		expect((await fetchAs('cospend', '/api/cospend/export')).status()).toBe(401);
	});
	test('wrong-group user → blocked', async () => {
		expect([401, 403]).toContain((await fetchAs('recipes', '/api/cospend/export')).status());
	});
	test('no-groups user → blocked', async () => {
		expect([401, 403]).toContain((await fetchAs('none', '/api/cospend/export')).status());
	});
	test('logged out → 401', async () => {
		expect((await fetchAs('anon', '/api/cospend/export')).status()).toBe(401);
	});
	test('invalid bearer token → 401', async () => {
		const ctx = await request.newContext({ baseURL: BASE });
		try {
			const res = await ctx.get('/api/cospend/export', {
				headers: { authorization: 'Bearer not-a-real-token' },
				maxRedirects: 0
			});
			expect(res.status()).toBe(401);
		} finally {
			await ctx.dispose();
		}
	});

	// Valid token (seeded in scripts/e2e/seed.mjs) → 200 with the full ledger,
	// proving the gate isn't merely "always deny". No session cookie is sent.
	test('valid bearer token (no session) → 200 with payments', async () => {
		const ctx = await request.newContext({ baseURL: BASE });
		try {
			const res = await ctx.get('/api/cospend/export', {
				headers: { authorization: 'Bearer e2e-cospend-export-token' },
				maxRedirects: 0
			});
			expect(res.status()).toBe(200);
			const body = await res.json();
			expect(Array.isArray(body.payments)).toBe(true);
			expect(body.payments.length).toBeGreaterThan(0);

			// Per-user net balances must reconcile with the exported splits.
			expect(Array.isArray(body.balances)).toBe(true);
			const expected = new Map<string, number>();
			for (const p of body.payments) {
				for (const s of p.splits ?? []) {
					expected.set(s.username, (expected.get(s.username) ?? 0) + s.amount);
				}
			}
			expect(body.balances.length).toBe(expected.size);
			for (const { username, netBalance } of body.balances) {
				expect(netBalance).toBeCloseTo(expected.get(username) as number, 2);
			}
		} finally {
			await ctx.dispose();
		}
	});
});

// Token-only: /api/finances/export (the ledger repo's categorization pull) is
// authenticated by a FinanceApiToken (src/lib/server/financeApiAuth.ts), NOT a
// session. The rest of /api/finances is owner-only, so without a token every
// caller — including a logged-in user — must be rejected. Guards against the
// export being loosened to session access.
test.describe('/api/finances/export [token-only]', () => {
	test('logged-in non-owner without token → blocked', async () => {
		expect([401, 403]).toContain((await fetchAs('full', '/api/finances/export')).status());
	});
	test('no-groups user → blocked', async () => {
		expect([401, 403]).toContain((await fetchAs('none', '/api/finances/export')).status());
	});
	test('logged out → 401', async () => {
		expect((await fetchAs('anon', '/api/finances/export')).status()).toBe(401);
	});
	test('invalid bearer token → 401', async () => {
		const ctx = await request.newContext({ baseURL: BASE });
		try {
			const res = await ctx.get('/api/finances/export', {
				headers: { authorization: 'Bearer not-a-real-token' },
				maxRedirects: 0
			});
			expect(res.status()).toBe(401);
		} finally {
			await ctx.dispose();
		}
	});

	// Valid token (seeded in scripts/e2e/seed.mjs) → 200 with the overrides CSV
	// header, proving the gate isn't merely "always deny". No session cookie.
	test('valid bearer token (no session) → 200 with CSV header', async () => {
		const ctx = await request.newContext({ baseURL: BASE });
		try {
			const res = await ctx.get('/api/finances/export', {
				headers: { authorization: 'Bearer e2e-finance-export-token' },
				maxRedirects: 0
			});
			expect(res.status()).toBe(200);
			expect(res.headers()['content-type']).toContain('text/csv');
			expect(await res.text()).toContain('key,account,date,amount,payee,narration');
		} finally {
			await ctx.dispose();
		}
	});
});

// Browser-level spot-checks: the request matrix above proves the status codes
// for every route; these confirm a user actually SEES the right thing in the UI
// (the page, the 403 verse page, or the login flow) for a representative gate.
test.describe('authorization is visible in the UI (cospend gate)', () => {
	test('a permitted user sees the page', async ({ browser }) => {
		const ctx = await browser.newContext({ storageState: storageStateFor('cospend') });
		const page = await ctx.newPage();
		await page.goto(`${BASE}/cospend/dash`);
		await expect(page.getByRole('heading', { name: 'Cospend' })).toBeVisible();
		await ctx.close();
	});

	for (const role of ['recipes', 'none']) {
		test(`a ${role === 'none' ? 'no-groups' : 'wrong-group'} user sees the 403 page`, async ({ browser }) => {
			const ctx = await browser.newContext({ storageState: storageStateFor(role) });
			const page = await ctx.newPage();
			await page.goto(`${BASE}/cospend/dash`);
			await expect(page.getByText(/Zugriff verweigert/i)).toBeVisible();
			await ctx.close();
		});
	}

	test('a logged-out user is sent to the login flow', async ({ browser }) => {
		const ctx = await browser.newContext(); // anonymous
		const page = await ctx.newPage();
		await page.goto(`${BASE}/cospend/dash`);
		await expect(page).toHaveURL(/\/login|localhost:9100/);
		await ctx.close();
	});
});
