import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env } from '$env/dynamic/private';

// requireSelf reaches Authentik and pulls in $env/static/private; the endpoint's
// contract is what it does with the identity, not how it resolves one.
vi.mock('$lib/server/authentik', () => ({
	requireSelf: vi.fn(async () => ({ pk: 42, nickname: 'alex' }))
}));

import { GET } from '../../../src/routes/api/anki/status/+server';

function event(groups: string[] = ['anki_users'], query = '') {
	return {
		locals: { auth: async () => ({ user: { nickname: 'alex', groups } }) },
		url: new URL(`http://localhost/api/anki/status${query}`)
	} as never;
}

const BRIDGE_OK = {
	provisioned: true,
	username: 'alex',
	sync_url: 'https://anki.example.org/',
	last_seen: '2026-08-01T10:00:00+00:00',
	collection_bytes: 12345
};

describe('/api/anki/status', () => {
	beforeEach(() => {
		for (const key of Object.keys(env)) delete env[key];
		env.ANKI_BRIDGE_URL = 'http://bridge.test:8092';
		env.ANKI_BRIDGE_TOKEN = 'shared-secret';
		env.ANKI_SYNC_PUBLIC_URL = 'https://anki.example.org/';
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('reports provisioning state from the bridge', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify(BRIDGE_OK), { status: 200 }))
		);

		const body = await (await GET(event())).json();
		expect(body).toMatchObject({
			available: true,
			hasGroup: true,
			provisioned: true,
			username: 'alex',
			syncUrl: 'https://anki.example.org/',
			lastSeen: '2026-08-01T10:00:00+00:00'
		});
	});

	it('asks the bridge about the session user, never a query parameter', async () => {
		// Otherwise anyone could read another user's sync state by asking for it.
		const fetchMock = vi.fn(async () => new Response(JSON.stringify(BRIDGE_OK), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		await GET(event(['anki_users'], '?username=someone-else'));

		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('username=alex');
		expect(url).not.toContain('someone-else');
		expect((init.headers as Record<string, string>)['x-bridge-token']).toBe('shared-secret');
	});

	it('degrades instead of erroring when the bridge is unreachable', async () => {
		// The settings card has to render on a host with no sync server at all.
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('ECONNREFUSED');
			})
		);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const res = await GET(event());
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.available).toBe(false);
		expect(body.provisioned).toBe(false);
		// Still enough for the card to show what to type into Anki.
		expect(body.syncUrl).toBe('https://anki.example.org/');
		expect(body.username).toBe('alex');
	});

	it('degrades on a bridge error response too', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('nope', { status: 403 }))
		);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const body = await (await GET(event())).json();
		expect(body.available).toBe(false);
	});

	it('reports a missing group without hiding the card', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ ...BRIDGE_OK, provisioned: false }), { status: 200 }))
		);

		const body = await (await GET(event(['fitness']))).json();
		expect(body.hasGroup).toBe(false);
		expect(body.available).toBe(true);
	});
});
