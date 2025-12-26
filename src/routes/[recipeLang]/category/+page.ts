import type { PageLoad } from "./$types";

export async function load({ fetch, params}) {
    const isEnglish = params.recipeLang === 'recipes';
    const apiBase = isEnglish ? '/api/recipes' : '/api/rezepte';

    const res = await fetch(`${apiBase}/items/category`);
    const categories= await res.json();
    return {categories}
};
