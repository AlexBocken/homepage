import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, fetch }) => {
  const session = await locals.auth();
  if (!session) throw redirect(302, '/login');

  const [tasksRes, statsRes] = await Promise.all([
    fetch('/api/tasks'),
    fetch('/api/tasks/stats')
  ]);

  return {
    session,
    tasks: (await tasksRes.json()).tasks,
    stats: await statsRes.json()
  };
};
