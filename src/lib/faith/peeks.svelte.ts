/**
 * The page's reference peeks, reachable from anywhere on the page.
 *
 * `ReferencePeeks` registers itself while mounted; `ScriptureRef` and any
 * other citation opens through `openReference()` without a prop chain. One
 * instance per page.
 */
type Peeks = { openRef: (reference: string, anchor: HTMLElement) => void; closeAll: () => void };

let current: Peeks | null = null;

export function registerPeeks(p: Peeks): () => void {
	current = p;
	return () => {
		if (current === p) current = null;
	};
}

export function openReference(reference: string, anchor: HTMLElement): void {
	current?.openRef(reference, anchor);
}
