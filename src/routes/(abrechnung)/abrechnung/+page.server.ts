import type { PageServerLoad } from "./$types";

export async function load({ fetch }) {
    const res = await fetch(`/api/payments/items/10`, {method: "POST",
			body: JSON.stringify({
	    				start: 0
    					}),
			headers: {
	    			credentials: "include"
    				}
    			});
    const item = await res.json();
    return { ...item};
};
