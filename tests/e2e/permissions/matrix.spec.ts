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
	{ path: '/cospend/settings', group: 'cospend', kind: 'page' },
	{ path: '/expenses/settings', group: 'cospend', kind: 'page' },
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

// Owner-only: the private /finances area is gated on a specific Authentik
// username (see hooks.server.ts), not a group. No e2e user is that person, so
// every logged-in role — even the all-groups `full` user — must be forbidden,
// and anonymous access blocked. Guards against the gate being accidentally
// loosened to a group or login-only check.
const OWNER_ONLY_ROUTES: Route[] = [
	{ path: '/finances', kind: 'page' },
	{ path: '/finances/spending', kind: 'page' },
	{ path: '/finances/investments', kind: 'page' },
	{ path: '/finances/budget', kind: 'page' },
	{ path: '/finances/account', kind: 'page' },
	{ path: '/finances/account/Expenses:Food', kind: 'page' },
	{ path: '/finances/payee/Cospend', kind: 'page' },
	{ path: '/finances/query', kind: 'page' },
	{ path: '/api/finances/meta', kind: 'api' },
	{ path: '/api/finances/budget', kind: 'api' },
	{ path: '/api/finances/investments', kind: 'api' },
	{ path: '/api/finances/account?account=Assets', kind: 'api' },
	{ path: '/api/finances/payee?payee=Cospend', kind: 'api' },
	{ path: '/api/finances/query?q=SELECT%20account', kind: 'api' },
	// Specific (non-proxy) owner-gated API route backing the BQL console.
	{ path: '/api/finances/saved-queries', kind: 'api' }
];

for (const r of OWNER_ONLY_ROUTES) {
	test.describe(`${r.path} [owner-only]`, () => {
		test('most-privileged user (full) → 403', async () => expectForbidden(await fetchAs('full', r.path)));
		test('no permissions → 403', async () => expectForbidden(await fetchAs('none', r.path)));
		test('logged out → blocked', async () => expectAnonBlocked(await fetchAs('anon', r.path)));
	});
}

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
