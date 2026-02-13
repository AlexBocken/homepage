import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const latinParam = url.searchParams.get('latin');
  const hasUrlLatin = latinParam !== null;
  const initialLatin = hasUrlLatin ? latinParam !== '0' : true;

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
