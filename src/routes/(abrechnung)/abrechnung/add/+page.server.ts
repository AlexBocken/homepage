import type { PageServerLoad } from "./$types";

export async function load({ fetch }) {
    const res = await fetch(`/api/payments/payees`, {method: "GET",
			headers: {
	    			credentials: "include"
    				}
    			});
    const item = await res.json();
    return { ...item};
};
