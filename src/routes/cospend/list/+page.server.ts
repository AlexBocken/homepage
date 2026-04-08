import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getShoppingUser } from '$lib/server/shoppingAuth';

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  const token = url.searchParams.get('token');

  // Allow access with valid share token even without session
  if (!session && token) {
    const user = await getShoppingUser(locals, url);
    if (user) return { session: null, shareToken: token };
  }

  if (!session) throw redirect(302, '/login');
  return { session, shareToken: null };
};
