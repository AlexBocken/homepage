import type {LayoutServerLoad} from './$types';
import { authenticateUser } from '$lib/js/authenticate';;

export const load = (async ({cookies}) => {
	const user =  await authenticateUser(cookies)
	console.log("LOAD LAYOUT")
	console.log(user)
	return {
		user
	}
}) satisfies LayoutServerLoad;
