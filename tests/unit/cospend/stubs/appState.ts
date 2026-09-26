// Stand-in for SvelteKit's `$app/state`, which only exists inside the Kit
// build. patchedSvelte.ts rewrites component imports to point here.
export const page = {
	url: new URL('http://localhost/expenses/payments/add')
};

export function setPath(pathname: string) {
	page.url = new URL(`http://localhost${pathname}`);
}
