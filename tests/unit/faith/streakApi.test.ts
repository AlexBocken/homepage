import { beforeEach, describe, expect, it, vi } from 'vitest';

// Pins GET/POST of /api/glaube/{rosary,angelus}-streak: auth, validation
// messages, the fields written and the response shape.

const calls: { model: string; op: string; args: unknown[] }[] = [];
let doc: Record<string, unknown> | null = null;
let fail = false;

function model(name: string) {
	const lean = (op: string, args: unknown[]) => ({
		lean: async () => {
			calls.push({ model: name, op, args });
			if (fail) throw new Error('db down');
			return doc;
		}
	});
	return {
		findOne: (...args: unknown[]) => lean('findOne', args),
		findOneAndUpdate: (...args: unknown[]) => lean('findOneAndUpdate', args)
	};
}

vi.mock('$models/RosaryStreak', () => ({ RosaryStreak: model('RosaryStreak') }));
vi.mock('$models/AngelusStreak', () => ({ AngelusStreak: model('AngelusStreak') }));
vi.mock('$utils/db', () => ({ dbConnect: async () => {} }));

const rosary = await import('../../../src/routes/api/glaube/rosary-streak/+server');
const angelus = await import('../../../src/routes/api/glaube/angelus-streak/+server');

const loggedIn = { auth: async () => ({ user: { nickname: 'anna' } }) };
const loggedOut = { auth: async () => null };

type Handler = (e: never) => Promise<Response>;
async function call(handler: Handler, locals: object, body?: unknown) {
	const request = new Request('http://x/api', { method: body === undefined ? 'GET' : 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
	try {
		const res = await handler({ locals, request } as never);
		return { status: res.status, body: await res.json() };
	} catch (e) {
		const err = e as { status?: number; body?: { message?: string } };
		return { status: err.status, message: err.body?.message };
	}
}

beforeEach(() => {
	calls.length = 0;
	doc = null;
	fail = false;
});

describe('rosary streak API', () => {
	it('needs a login', async () => {
		expect((await call(rosary.GET as Handler, loggedOut)).status).toBe(401);
		expect((await call(rosary.POST as Handler, loggedOut, { length: 1, lastPrayed: null })).status).toBe(401);
	});

	it('GET answers defaults without a document, and the stored fields with one', async () => {
		expect(await call(rosary.GET as Handler, loggedIn)).toEqual({ status: 200, body: { length: 0, lastPrayed: null, lastPrayedTs: null } });
		expect(calls[0]).toEqual({ model: 'RosaryStreak', op: 'findOne', args: [{ username: 'anna' }] });
		doc = { length: 4, lastPrayed: '2026-09-10', lastPrayedTs: 5, extra: 1 };
		expect(await call(rosary.GET as Handler, loggedIn)).toEqual({ status: 200, body: { length: 4, lastPrayed: '2026-09-10', lastPrayedTs: 5 } });
	});

	it('GET reports a database failure', async () => {
		fail = true;
		expect(await call(rosary.GET as Handler, loggedIn)).toEqual({ status: 500, message: 'Failed to fetch rosary streak' });
	});

	it('POST validates', async () => {
		expect(await call(rosary.POST as Handler, loggedIn, { length: -1, lastPrayed: null })).toEqual({ status: 400, message: 'Valid streak length required' });
		expect(await call(rosary.POST as Handler, loggedIn, { length: '1', lastPrayed: null })).toEqual({ status: 400, message: 'Valid streak length required' });
		expect(await call(rosary.POST as Handler, loggedIn, { length: 1, lastPrayed: 5 })).toEqual({ status: 400, message: 'Invalid lastPrayed format' });
		expect(calls).toEqual([]);
	});

	it('POST upserts, writing the timestamp only when it is a number', async () => {
		doc = { length: 2, lastPrayed: '2026-09-10' };
		expect(await call(rosary.POST as Handler, loggedIn, { length: 2, lastPrayed: '2026-09-10', lastPrayedTs: null })).toEqual({
			status: 200,
			body: { length: 2, lastPrayed: '2026-09-10', lastPrayedTs: null }
		});
		await call(rosary.POST as Handler, loggedIn, { length: 3, lastPrayed: '2026-09-11', lastPrayedTs: 9 });
		expect(calls.map((c) => c.args)).toEqual([
			[{ username: 'anna' }, { length: 2, lastPrayed: '2026-09-10' }, { upsert: true, returnDocument: 'after' }],
			[{ username: 'anna' }, { length: 3, lastPrayed: '2026-09-11', lastPrayedTs: 9 }, { upsert: true, returnDocument: 'after' }]
		]);
	});

	it('POST reports a database failure', async () => {
		fail = true;
		expect(await call(rosary.POST as Handler, loggedIn, { length: 1, lastPrayed: null })).toEqual({ status: 500, message: 'Failed to update rosary streak' });
	});
});

describe('Angelus streak API', () => {
	const valid = { streak: 1, lastComplete: '2026-09-10', todayPrayed: 7, todayDate: '2026-09-10' };

	it('needs a login', async () => {
		expect((await call(angelus.GET as Handler, loggedOut)).status).toBe(401);
		expect((await call(angelus.POST as Handler, loggedOut, valid)).status).toBe(401);
	});

	it('GET answers defaults without a document, and the stored fields with one', async () => {
		expect(await call(angelus.GET as Handler, loggedIn)).toEqual({
			status: 200,
			body: { streak: 0, lastComplete: null, lastCompleteTs: null, todayPrayed: 0, todayDate: null }
		});
		expect(calls[0]).toEqual({ model: 'AngelusStreak', op: 'findOne', args: [{ username: 'anna' }] });
		doc = { ...valid, lastCompleteTs: 3, extra: true };
		expect(await call(angelus.GET as Handler, loggedIn)).toEqual({ status: 200, body: { ...valid, lastCompleteTs: 3 } });
	});

	it('GET reports a database failure', async () => {
		fail = true;
		expect(await call(angelus.GET as Handler, loggedIn)).toEqual({ status: 500, message: 'Failed to fetch angelus streak' });
	});

	it('POST validates, in order', async () => {
		const bad = async (patch: object) => call(angelus.POST as Handler, loggedIn, { ...valid, ...patch });
		expect(await bad({ streak: -1 })).toEqual({ status: 400, message: 'Valid streak required' });
		expect(await bad({ streak: -1, todayPrayed: 9 })).toEqual({ status: 400, message: 'Valid streak required' });
		expect(await bad({ lastComplete: 1 })).toEqual({ status: 400, message: 'Invalid lastComplete format' });
		expect(await bad({ todayPrayed: 8 })).toEqual({ status: 400, message: 'Invalid todayPrayed bitmask' });
		expect(await bad({ todayPrayed: -1 })).toEqual({ status: 400, message: 'Invalid todayPrayed bitmask' });
		expect(await bad({ todayPrayed: '7' })).toEqual({ status: 400, message: 'Invalid todayPrayed bitmask' });
		expect(await bad({ todayDate: 3 })).toEqual({ status: 400, message: 'Invalid todayDate format' });
		expect(calls).toEqual([]);
	});

	it('POST upserts, writing the timestamp only when it is a number', async () => {
		doc = { ...valid };
		expect(await call(angelus.POST as Handler, loggedIn, { ...valid, lastCompleteTs: 'x' })).toEqual({
			status: 200,
			body: { ...valid, lastCompleteTs: null }
		});
		await call(angelus.POST as Handler, loggedIn, { ...valid, lastCompleteTs: 4 });
		expect(calls.map((c) => c.args)).toEqual([
			[{ username: 'anna' }, valid, { upsert: true, returnDocument: 'after' }],
			[{ username: 'anna' }, { ...valid, lastCompleteTs: 4 }, { upsert: true, returnDocument: 'after' }]
		]);
	});

	it('POST reports a database failure', async () => {
		fail = true;
		expect(await call(angelus.POST as Handler, loggedIn, valid)).toEqual({ status: 500, message: 'Failed to update angelus streak' });
	});
});
