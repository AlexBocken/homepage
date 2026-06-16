import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { PREDEFINED_USERS, isPredefinedUsersMode } from '$lib/config/users';

export const load: PageServerLoad = async ({ locals }) => {
  const session = locals.session ?? await locals.auth();

  if (!session) {
    throw redirect(302, '/login');
  }

  return {
    session,
    predefinedUsers: isPredefinedUsersMode() ? PREDEFINED_USERS : [],
    currentUser: session.user?.nickname || ''
  };
};
