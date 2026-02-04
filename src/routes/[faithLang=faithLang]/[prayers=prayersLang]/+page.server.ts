import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const latinParam = url.searchParams.get('latin');
  const hasUrlLatin = latinParam !== null;
  const initialLatin = hasUrlLatin ? latinParam !== '0' : true;

  return {
    initialLatin,
    hasUrlLatin
  };
};
