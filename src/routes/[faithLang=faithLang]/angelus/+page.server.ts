import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { langFromFaithSlug, prayersSlug } from '$lib/js/faithI18n';

export const load: PageServerLoad = async ({ params }) => {
  const prayersPath = prayersSlug(langFromFaithSlug(params.faithLang));
  redirect(301, `/${params.faithLang}/${prayersPath}/angelus`);
};
