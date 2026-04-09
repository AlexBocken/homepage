import { redirect } from '@sveltejs/kit';
import { detectCospendLang, cospendRoot } from '$lib/js/cospendI18n';

export function load({ url }) {
  const lang = detectCospendLang(url.pathname);
  redirect(302, `/${cospendRoot(lang)}/list`);
}
