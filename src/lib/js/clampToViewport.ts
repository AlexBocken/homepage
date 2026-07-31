/**
 * Keep a popover anchored to a trigger inside the viewport.
 *
 * An info panel is positioned against its (i) button, which knows nothing about
 * where on screen that button ended up. A 280 px panel hanging off a trigger in
 * the right-hand column is fine on a desktop and half off-screen on a phone —
 * and because it is a normal absolutely-positioned element, the part that hangs
 * off the right widens the document and gives the whole page a horizontal
 * scrollbar. That was the bug this exists to prevent, not just a cosmetic one.
 *
 * CSS anchor positioning (`position-area`) solves this natively but is Chromium-
 * only as of 2026, so the panel is measured and shifted instead.
 *
 * Use as a Svelte attachment on the panel itself:
 *
 *     {#if open}
 *         <div class="my-popover" {@attach clampToViewport}>…</div>
 *     {/if}
 *
 * It must be attached to an element that is actually rendered when open — a
 * panel kept in the DOM and hidden with `display: none` measures as a zero-sized
 * box, which nothing can be inferred from. Those are left alone (see the guard
 * below) rather than clamped to a meaningless position.
 *
 * The correction is written to the `translate` property rather than `transform`
 * so it composes with a transform the panel already uses for its own placement
 * — several are centred with `transform: translateX(-50%)`, and writing to
 * `transform` here would silently un-centre them. Browsers without individual
 * transform properties ignore the assignment and get today's behaviour.
 */

/** Breathing room kept between the panel and the edge of the screen. */
const MARGIN = 8;

export function clampToViewport(node: HTMLElement): () => void {
	const place = () => {
		// Cleared first: every measurement has to be of the *unshifted* panel, or
		// each pass would correct a position that already includes the last
		// correction and the panel would walk across the screen.
		node.style.translate = '';
		node.style.maxWidth = '';
		node.style.maxHeight = '';
		node.style.overflowY = '';

		// clientWidth, not innerWidth: it excludes a classic scrollbar, which is
		// otherwise counted as usable space and leaves the panel under it.
		const vw = document.documentElement.clientWidth;
		const vh = document.documentElement.clientHeight;
		let r = node.getBoundingClientRect();
		if (r.width === 0 && r.height === 0) return; // not rendered — nothing to measure

		// A panel wider than the screen cannot be fixed by moving it: capping it
		// first means the shift below has somewhere to put it.
		if (r.width > vw - 2 * MARGIN) {
			node.style.maxWidth = `${vw - 2 * MARGIN}px`;
			r = node.getBoundingClientRect();
		}
		// Same for height, except a capped panel scrolls rather than reflows.
		if (r.height > vh - 2 * MARGIN) {
			node.style.maxHeight = `${vh - 2 * MARGIN}px`;
			node.style.overflowY = 'auto';
			r = node.getBoundingClientRect();
		}

		let dx = 0;
		if (r.left < MARGIN) dx = MARGIN - r.left;
		else if (r.right > vw - MARGIN) dx = vw - MARGIN - r.right;

		// Vertically the panel is pulled up rather than flipped above the trigger:
		// a flip moves it out from under the finger that opened it, which reads as
		// the panel having closed and reopened somewhere else.
		let dy = 0;
		if (r.bottom > vh - MARGIN) {
			dy = vh - MARGIN - r.bottom;
			if (r.top + dy < MARGIN) dy = MARGIN - r.top;
		}

		if (dx || dy) node.style.translate = `${dx}px ${dy}px`;
	};

	// Scrolling fires far faster than the screen repaints, and each placement reads
	// layout — coalesce to one per frame so a flick doesn't turn into a stutter.
	let frame = 0;
	const schedule = () => {
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			place();
		});
	};

	place();
	window.addEventListener('resize', schedule);
	// Capturing, because the panel's own scroll container is usually not the
	// window: the correction is relative to the viewport and goes stale the
	// moment the trigger moves within it.
	window.addEventListener('scroll', schedule, true);
	// Also covers a panel that is measured before it has a size — one revealed by
	// CSS rather than by an {#if}, or one that grows when its content arrives.
	// Placement is idempotent, so the observation its own writes provoke settles
	// after a single extra pass.
	const observer = new ResizeObserver(schedule);
	observer.observe(node);

	return () => {
		if (frame) cancelAnimationFrame(frame);
		observer.disconnect();
		window.removeEventListener('resize', schedule);
		window.removeEventListener('scroll', schedule, true);
	};
}
