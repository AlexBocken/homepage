import type { PageServerLoad } from './$types';
import { requestableGroups } from '$lib/server/groups';

// Server load so the group map (incl. admin/system codenames) stays server-only;
// the client receives only the requestable {codename,label} list.
export const load: PageServerLoad = ({ params }) => ({
	lang: params.registerLang === 'register' ? 'en' : 'de',
	availableGroups: requestableGroups()
});
