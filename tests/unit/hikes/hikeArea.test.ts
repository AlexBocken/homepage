import { describe, it, expect } from 'vitest';
import { resolveHikeArea } from '../../../src/lib/hikes/hikeArea';

describe('resolveHikeArea', () => {
	it('files a Trentino-Südtirol hike under the region’s arms, whatever the spelling', () => {
		for (const state of ['Trentino-Südtirol', 'Trentino-Alto Adige/Südtirol', 'IT-32']) {
			expect(resolveHikeArea(null, 'IT', state)).toEqual({
				value: 'state:IT-suedtirol_trentino',
				label: 'Trentino-Südtirol',
				iconUrl: '/regions/it/states/suedtirol_trentino.svg',
				kind: 'state'
			});
		}
	});

	it('falls back to the Italian flag for a region without arms', () => {
		expect(resolveHikeArea(null, 'IT', 'Veneto')?.kind).toBe('country');
	});
});
