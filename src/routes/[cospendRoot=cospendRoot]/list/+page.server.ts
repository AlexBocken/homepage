import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { getShoppingUser } from '$lib/server/shoppingAuth';
import { dbConnect } from '$utils/db';
import { ShoppingList, type IShoppingItem } from '$models/ShoppingList';
import type { ShoppingItem } from '$lib/js/shoppingSync.svelte';

function serializeItems(items: IShoppingItem[]): ShoppingItem[] {
  return items.map((it) => ({
    ...it,
    addedAt: it.addedAt instanceof Date ? it.addedAt.toISOString() : String(it.addedAt)
  }));
}

export const load: PageServerLoad = async ({ locals, url }) => {
  const session = locals.session ?? await locals.auth();
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
        initialList: list ? { version: list.version, items: serializeItems(list.items) } : { version: 0, items: [] as ShoppingItem[] }
      };
    }
  }

  if (!session) throw redirect(302, '/login');

  await dbConnect();
  const list = await ShoppingList.findOne().lean();
  return {
    session,
    shareToken: null,
    initialList: list ? { version: list.version, items: serializeItems(list.items) } : { version: 0, items: [] as ShoppingItem[] }
  };
};
