// Stand-in for SvelteKit's `$app/navigation`.
export const gotoCalls: string[] = [];

export async function goto(url: string) {
	gotoCalls.push(url);
}
