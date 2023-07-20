import { get_username } from '$lib/js/get_username';;

export const load = (async ({cookies}) => {
	return { user: await get_username(cookies) }
});
