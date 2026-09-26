import { onMount } from 'svelte';

/**
 * Table-of-contents scroll spy shared by the katechese and apologetik pages.
 *
 * The active section is the topmost one intersecting a band that starts just
 * below the sticky header (64px) and ends 60% up from the bottom of the
 * viewport.
 */
const ROOT_MARGIN = '-64px 0px -60% 0px';

/**
 * Smooth-scroll to the element `#<prefix><id>` and put that hash in the URL
 * without adding a history entry. Falls back to the browser's default anchor
 * behaviour when the element is missing.
 */
export function jumpTo(e: MouseEvent, id: string, prefix = '') {
	const el = document.getElementById(`${prefix}${id}`);
	if (!el) return;
	e.preventDefault();
	el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	history.replaceState(null, '', `#${prefix}${id}`);
}

export interface ScrollSpyOptions {
	/** Element ids to observe, looked up with `getElementById`. */
	ids?: readonly string[];
	/** Alternatively, a selector for the elements to observe. */
	selector?: string;
	/**
	 * Id prefix of the observed elements (e.g. `'arg-'`). It is stripped from
	 * `activeId` and added back by `jumpTo`, so both speak in bare ids.
	 */
	prefix?: string;
}

/**
 * Must be called during component initialisation: it observes on mount and
 * disconnects on destroy. Call `observe()` again whenever the observed set of
 * elements is re-rendered (e.g. after a filter changes the list).
 */
export function createScrollSpy({ ids, selector, prefix = '' }: ScrollSpyOptions) {
	let activeId = $state('');
	let io: IntersectionObserver | null = null;

	function targets(): Element[] {
		if (ids) return ids.map((id) => document.getElementById(id)).filter((el) => el !== null);
		if (selector) return Array.from(document.querySelectorAll(selector));
		return [];
	}

	function observe() {
		io?.disconnect();
		const els = targets();
		if (!els.length) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]) {
					const id = visible[0].target.id;
					activeId = prefix && id.startsWith(prefix) ? id.slice(prefix.length) : id;
				}
			},
			{ rootMargin: ROOT_MARGIN, threshold: 0 }
		);
		els.forEach((el) => observer.observe(el));
		io = observer;
	}

	onMount(() => {
		observe();
		return () => io?.disconnect();
	});

	return {
		get activeId() {
			return activeId;
		},
		observe,
		jumpTo: (e: MouseEvent, id: string) => jumpTo(e, id, prefix)
	};
}
