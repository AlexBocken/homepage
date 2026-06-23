import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
  const session = locals.session ?? await locals.auth();
  if (!session) throw redirect(302, '/login');

  const res = await fetch('/api/tasks');
  const tasks = (await res.json()).tasks ?? [];
  const task = tasks.find((t: { _id: string }) => String(t._id) === params.id);
  if (!task) throw redirect(302, '/tasks');

  return { task };
};
