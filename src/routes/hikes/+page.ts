import { HIKES } from '$lib/data/hikes.generated';

export const prerender = true;

export const load = () => ({
	hikes: HIKES.filter((h) => !h.hidden)
});
