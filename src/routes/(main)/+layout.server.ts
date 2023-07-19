import type {LayoutServerLoad} from './$types';
import { authenticateUser } from '$lib/js/authenticate';;

export const load = (async ({cookies}) => {
	const user =  await authenticateUser(cookies)
	return {
		user
	}
}) satisfies LayoutServerLoad;
