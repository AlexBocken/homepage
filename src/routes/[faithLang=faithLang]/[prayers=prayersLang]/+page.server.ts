import type { PageServerLoad } from './$types';
import { parseLatinParam } from '$lib/js/latinParam';

export const load: PageServerLoad = async ({ url }) => {
  const { initialLatin, hasUrlLatin } = parseLatinParam(url);

  const categoryParam = url.searchParams.get('category');
  const hasUrlCategory = categoryParam !== null;
  const initialCategory = hasUrlCategory ? categoryParam : null;

  return {
    initialLatin,
    hasUrlLatin,
    initialCategory,
    hasUrlCategory
  };
};
