import type { PageServerLoad } from "./$types";
import { redirect } from '@sveltejs/kit';
import { ToTryRecipe } from '$models/ToTryRecipe';
import { dbConnect } from '$utils/db';

export const load: PageServerLoad = async ({ locals, params }) => {
    const session = await locals.auth();

    if (!session?.user?.nickname) {
        throw redirect(302, `/${params.recipeLang}`);
    }

    await dbConnect();

    try {
        const items = await ToTryRecipe.find().sort({ createdAt: -1 }).lean();
        return {
            items: JSON.parse(JSON.stringify(items)),
            session
        };
    } catch (e) {
        return {
            items: [],
            error: 'Failed to load to-try recipes'
        };
    }
};
