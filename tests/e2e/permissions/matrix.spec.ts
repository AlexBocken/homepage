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

async function fetchAs(role: string, path: string): Promise<APIResponse> {
	const ctx = await request.newContext({
		baseURL: BASE,
		storageState: role === 'anon' ? undefined : storageStateFor(role)
	});
	try {
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

type Route = { path: string; kind: 'page' | 'api' };
type GroupRoute = Route & { group: keyof typeof RIGHT_ROLE };

const GROUP_ROUTES: GroupRoute[] = [
	// rezepte_users
	{ path: '/rezepte/add', group: 'rezepte_users', kind: 'page' },
	{ path: '/rezepte/edit/schokokuchen', group: 'rezepte_users', kind: 'page' },
	// cospend
	{ path: '/cospend/dash', group: 'cospend', kind: 'page' },
	{ path: '/cospend/payments', group: 'cospend', kind: 'page' },
	{ path: '/cospend/settle', group: 'cospend', kind: 'page' },
	{ path: '/cospend/recurring', group: 'cospend', kind: 'page' },
	{ path: '/expenses/dash', group: 'cospend', kind: 'page' },
	{ path: '/api/cospend/payments', group: 'cospend', kind: 'api' },
	// task_users
	{ path: '/tasks', group: 'task_users', kind: 'page' },
	{ path: '/tasks/new', group: 'task_users', kind: 'page' },
	{ path: '/tasks/rewards', group: 'task_users', kind: 'page' },
	{ path: '/tasks/verlauf', group: 'task_users', kind: 'page' },
	{ path: '/api/tasks', group: 'task_users', kind: 'api' }
];

// Login-only: any authenticated user is allowed; no group differentiates.
const LOGIN_ONLY_ROUTES: Route[] = [
	{ path: '/fitness/check-in', kind: 'page' },
	{ path: '/fitness/nutrition', kind: 'page' },
	{ path: '/fitness/exercises', kind: 'page' },
	{ path: '/fitness/history', kind: 'page' },
	{ path: '/fitness/stats', kind: 'page' },
	{ path: '/api/fitness/goal', kind: 'api' },
	{ path: '/settings', kind: 'page' },
	{ path: '/einstellungen', kind: 'page' },
	{ path: '/hikes/route-builder', kind: 'page' }
];

for (const r of GROUP_ROUTES) {
	test.describe(`${r.path} [needs ${r.group}]`, () => {
		test('right permissions → allowed', async () => expectAllowed(await fetchAs(RIGHT_ROLE[r.group], r.path)));
		test('different permissions → 403', async () => expectForbidden(await fetchAs(WRONG_ROLE[r.group], r.path)));
		test('no permissions → 403', async () => expectForbidden(await fetchAs('none', r.path)));
		test('logged out → blocked', async () => expectAnonBlocked(await fetchAs("anon", r.path)));
	});
}

for (const r of LOGIN_ONLY_ROUTES) {
	test.describe(`${r.path} [login-only]`, () => {
		test('logged in (no groups) → allowed', async () => expectAllowed(await fetchAs('none', r.path)));
		test('logged out → blocked', async () => expectAnonBlocked(await fetchAs("anon", r.path)));
	});
}

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
