import { error } from "@sveltejs/kit";

export async function load({ fetch, params}) {
    const res = await fetch(`/api/rezepte/items/${params.name}`);
    let item = await res.json();
    if(!res.ok){
	    throw error(res.status, item.message)
    }
    
    // Check if this recipe is favorited by the user
    let isFavorite = false;
    try {
        const favRes = await fetch(`/api/rezepte/favorites/check/${params.name}`);
        if (favRes.ok) {
            const favData = await favRes.json();
            isFavorite = favData.isFavorite;
        }
    } catch (e) {
        // Silently fail if not authenticated or other error
    }
    
    return {
        ...item,
        isFavorite
    };
}
