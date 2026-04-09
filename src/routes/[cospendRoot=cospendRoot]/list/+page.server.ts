import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getShoppingUser } from '$lib/server/shoppingAuth';
import { dbConnect } from '$utils/db';
import { ShoppingList } from '$models/ShoppingList';

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = await locals.auth();
  const token = url.searchParams.get('token');

  // Allow access with valid share token even without session
  if (!session && token) {
    const user = await getShoppingUser(locals, url);
    if (user) {
      await dbConnect();
      const list = await ShoppingList.findOne().lean();
      return {
        session: null,
        shareToken: token,
        initialList: list ? { version: list.version, items: list.items } : { version: 0, items: [] }
      };
    }
  }

  if (!session) throw redirect(302, '/login');

  await dbConnect();
  const list = await ShoppingList.findOne().lean();
  return {
    session,
    shareToken: null,
    initialList: list ? { version: list.version, items: list.items } : { version: 0, items: [] }
  };
};
