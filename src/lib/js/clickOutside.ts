import type { Attachment } from 'svelte/attachments';

/**
 * Light-dismiss for a popover: call `onOutside` when the user presses anywhere
 * that is not inside the element this is attached to.
 *
 * Attach it to the element that holds both the trigger and the panel, so the
 * press that toggles the panel is not also read as a press outside it:
 *
 *     <div class="picker" {@attach open && clickOutside(() => (open = false))}>
 *
 * A falsy `{@attach}` is a no-op, so the `open &&` form only carries the
 * document listener while the panel is open.
 *
 * `event` defaults to `pointerdown` (the date and time pickers); the header's
 * popovers listen for `click` instead.
 */
export function clickOutside(
	onOutside: (e: Event) => void,
	event: 'pointerdown' | 'click' = 'pointerdown'
): Attachment<HTMLElement> {
	return (node) => {
		const handler = (e: Event) => {
			if (e.target instanceof Node && node.contains(e.target)) return;
			onOutside(e);
		};
		document.addEventListener(event, handler);
		return () => document.removeEventListener(event, handler);
	};
}
