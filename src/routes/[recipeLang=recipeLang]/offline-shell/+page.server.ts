import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
    const isEnglish = params.recipeLang === 'recipes';

    return {
        lang: isEnglish ? 'en' : 'de',
        recipeLang: params.recipeLang
    };
};
