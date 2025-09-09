import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  const auth = await locals.auth();
  if (!auth || !auth.user) {
    throw redirect(302, '/login');
  }

  return {
    session: auth
  };
};