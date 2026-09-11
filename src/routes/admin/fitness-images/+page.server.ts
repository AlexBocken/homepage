import type { PageServerLoad } from './$types';
import { dbConnect } from '$utils/db';
import { countRegenerable } from '$lib/server/fitnessImageRegen';

/** Access is gated in `hooks.server.ts` (owner only) for both `/admin` and
 * `/api/admin`, so this load only has to supply the size of the job. */
export const load: PageServerLoad = async () => {
	await dbConnect();
	return await countRegenerable();
};
