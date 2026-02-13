import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const prayersPath = params.faithLang === 'faith' ? 'prayers' : 'gebete';
  redirect(301, `/${params.faithLang}/${prayersPath}/angelus`);
};
