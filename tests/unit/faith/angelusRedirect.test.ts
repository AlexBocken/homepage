import { describe, it, expect } from 'vitest';
import { load } from '../../../src/routes/[faithLang=faithLang]/angelus/+page.server';

/** Run the load and return the 301 target it throws. */
async function target(faithLang: string): Promise<string> {
	try {
		await (load as unknown as (e: { params: { faithLang: string } }) => Promise<unknown>)({ params: { faithLang } });
	} catch (e) {
		const r = e as { status: number; location: string };
		expect(r.status).toBe(301);
		return r.location;
	}
	throw new Error('load did not redirect');
}

describe('/[faithLang]/angelus redirect', () => {
	it('sends each faith slug to its own prayers slug', async () => {
		expect(await target('glaube')).toBe('/glaube/gebete/angelus');
		expect(await target('faith')).toBe('/faith/prayers/angelus');
		expect(await target('fides')).toBe('/fides/orationes/angelus');
	});
});
