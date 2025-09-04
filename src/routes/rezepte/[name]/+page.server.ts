import { redirect } from '@sveltejs/kit';

export const actions = {
    swapYeast: async ({ request, url }) => {
        const formData = await request.formData();
        const yeastId = parseInt(formData.get('yeastId') as string);

        // Build new URL
        const newUrl = new URL(url.pathname, url.origin);
        
        // Restore all parameters from the form data (they were submitted as currentParam_*)
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('currentParam_')) {
                const paramName = key.substring('currentParam_'.length);
                newUrl.searchParams.set(paramName, value as string);
            }
        }
        
        // Toggle the yeast flag - if it exists, remove it; if not, add it
        const yeastParam = `y${yeastId}`;
        if (newUrl.searchParams.has(yeastParam)) {
            newUrl.searchParams.delete(yeastParam);
        } else {
            newUrl.searchParams.set(yeastParam, '1');
        }
        
        throw redirect(303, newUrl.toString());
    }
};