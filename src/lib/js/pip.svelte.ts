/**
 * Shared PiP (Picture-in-Picture) drag/snap/enlarge composable.
 * Extracts duplicated mobile PiP logic from StickyImage and rosary page.
 *
 * The PiP always covers some of what the reader is reading, and on a phone
 * there is no corner where it doesn't. So it can be **parked**: shoved off the
 * right edge until only a `peek`-wide sliver is left, which stays put while the
 * reader scrolls and comes back on a tap. Park by dragging it far enough past
 * the right edge that half of it is gone — far enough that snapping to the
 * bottom-right corner can never trigger it by accident.
 *
 * Parking survives hide()/show(), which is the point: the rosary page hides the
 * PiP between decades, and a reader who parked it does not want it back in the
 * middle of the screen at the next one.
 */

interface PipOptions {
	margin?: number;
	tapThreshold?: number;
	doubleTapMs?: number;
	initialCorner?: Corner;
	/** Sliver left on screen when parked, in px. Also the tap target that
	 *  brings it back, so don't go much below this. */
	peek?: number;
	smallHeight?: number;
	largeHeight?: number;
	fullscreenEnabled?: boolean;
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export function createPip(opts: PipOptions = {}) {
	const margin = opts.margin ?? 16;
	const peek = opts.peek ?? 32;
	const tapThreshold = opts.tapThreshold ?? 10;
	const doubleTapMs = opts.doubleTapMs ?? 250;
	const smallVh = opts.smallHeight ?? 25;
	const largeVh = opts.largeHeight ?? 37.5;
	const fullscreenEnabled = opts.fullscreenEnabled ?? false;

	let corner: Corner = $state(opts.initialCorner ?? 'bottom-right');
	let dragging = $state(false);
	let enlarged = $state(false);
	let parked = $state(false);
	let fullscreen = $state(false);
	let showControls = $state(false);

	let dragOffset = { x: 0, y: 0 };
	let dragPos = { x: 0, y: 0 };
	let dragMoved = false;
	let lastTapTime = 0;
	let el: HTMLElement | null = null;

	function getCornerPos(c: Corner, target: HTMLElement) {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const r = target.getBoundingClientRect();
		const positions: Record<Corner, { x: number; y: number }> = {
			'top-left': { x: margin, y: margin },
			'top-right': { x: vw - r.width - margin, y: margin },
			'bottom-left': { x: margin, y: vh - r.height - margin },
			'bottom-right': { x: vw - r.width - margin, y: vh - r.height - margin },
		};
		return positions[c];
	}

	function nearestCorner(x: number, y: number, target: HTMLElement): Corner {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const r = target.getBoundingClientRect();
		const cx = x + r.width / 2;
		const cy = y + r.height / 2;
		const left = cx < vw / 2;
		const top = cy < vh / 2;
		return `${top ? 'top' : 'bottom'}-${left ? 'left' : 'right'}` as Corner;
	}

	/** Where a parked PiP sits: hard against the right edge, holding whatever
	 *  vertical position it was dragged to, clamped into view. */
	function getParkedPos(target: HTMLElement) {
		const vh = window.innerHeight;
		const r = target.getBoundingClientRect();
		const maxY = Math.max(margin, vh - r.height - margin);
		return {
			x: window.innerWidth - peek,
			y: Math.min(Math.max(dragPos.y, margin), maxY)
		};
	}

	function moveTo(target: HTMLElement, pos: { x: number; y: number }) {
		dragPos = pos;
		target.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
		target.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
		target.addEventListener('transitionend', () => { target.style.transition = ''; }, { once: true });
	}

	function park(target: HTMLElement) {
		parked = true;
		showControls = false;
		moveTo(target, getParkedPos(target));
	}

	function unpark() {
		if (!el || !parked) return;
		parked = false;
		// Back to whichever right-hand corner it was parked level with — it went
		// out to the right, so returning it to a left corner would read as a jump.
		const r = el.getBoundingClientRect();
		snapToCorner(el, dragPos.y + r.height / 2 < window.innerHeight / 2 ? 'top-right' : 'bottom-right');
	}

	function snapToCorner(target: HTMLElement, c: Corner) {
		const pos = getCornerPos(c, target);
		corner = c;
		dragPos = pos;
		target.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
		target.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
		target.addEventListener('transitionend', () => { target.style.transition = ''; }, { once: true });
	}

	function toggleEnlarged() {
		if (!el || parked) return;
		const rect = el.getBoundingClientRect();
		const vh = window.innerHeight / 100;
		const currentH = enlarged ? largeVh * vh : smallVh * vh;
		const targetH = enlarged ? smallVh * vh : largeVh * vh;
		const ratio = targetH / currentH;

		enlarged = !enlarged;

		const newW = rect.width * ratio;
		const newH = rect.height * ratio;
		let newX = rect.left;
		let newY = rect.top;
		if (corner.includes('right')) newX = rect.right - newW;
		if (corner.includes('bottom')) newY = rect.bottom - newH;

		dragPos = { x: newX, y: newY };
		el.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
		el.style.transform = `translate(${newX}px, ${newY}px)`;
		el.addEventListener('transitionend', () => {
			el!.style.transition = '';
		}, { once: true });
	}

	function toggleFullscreen() {
		if (!el || parked) return;
		showControls = false;
		lastTapTime = 0; // cancel any pending single-tap timeout
		const img = el.querySelector('img') as HTMLImageElement | null;

		if (!fullscreen) {
			// Enter fullscreen: dark bg appears, image grows + moves to center
			fullscreen = true;
			el.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
			el.style.transform = 'translate(0px, 0px)';
			if (img) {
				img.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
				img.style.height = '90vh';
				img.style.maxWidth = '95vw';
				img.style.maxHeight = '90vh';
			}
			setTimeout(() => {
				if (el) el.style.transition = '';
				if (img) img.style.transition = '';
			}, 350);
		} else {
			// Exit fullscreen: image shrinks + moves to corner, then bg removed
			const vh = window.innerHeight;
			const vw = window.innerWidth;
			// Mirror the CSS, which sizes the PiP by area rather than height:
			// h = smallVh / √ratio (see PipImage). Getting this wrong lands the
			// shrink animation on a corner the image doesn't actually end at.
			const ratio = img && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1;
			const pipH = ((vh * smallVh) / 100) / Math.sqrt(ratio);
			const pipW = pipH * ratio;
			const pos = {
				x: corner.includes('right') ? vw - pipW - margin : margin,
				y: corner.includes('bottom') ? vh - pipH - margin : margin,
			};
			dragPos = pos;

			el.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
			el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
			if (img) {
				img.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
				img.style.height = `${pipH}px`;
				img.style.maxWidth = '';
				img.style.maxHeight = '';
			}

			setTimeout(() => {
				fullscreen = false;
				enlarged = false;
				if (el) el.style.transition = '';
				if (img) {
					img.style.transition = '';
					img.style.height = '';
				}
			}, 350);
		}
	}

	function show(target: HTMLElement) {
		el = target;
		showControls = false;
		if (fullscreen) {
			target.style.opacity = '1';
			target.style.pointerEvents = 'auto';
			return;
		}
		const pos = parked ? getParkedPos(target) : getCornerPos(corner, target);
		dragPos = pos;
		target.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
		target.style.opacity = '1';
		target.style.pointerEvents = 'auto';
	}

	function hide() {
		if (fullscreen) {
			fullscreen = false;
			showControls = false;
			if (el) {
				const img = el.querySelector('img') as HTMLElement | null;
				if (img) {
					img.style.transition = '';
					img.style.height = '';
					img.style.maxWidth = '';
					img.style.maxHeight = '';
				}
				el.style.transition = '';
			}
		}
		if (el) {
			el.style.opacity = '0';
			el.style.pointerEvents = 'none';
		}
	}

	function reposition() {
		if (!el || fullscreen) return;
		const pos = parked ? getParkedPos(el) : getCornerPos(corner, el);
		dragPos = pos;
		el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
	}

	function onpointerdown(e: PointerEvent) {
		if (!el) return;
		dragging = true;
		dragMoved = false;

		if (!fullscreen) {
			const r = el.getBoundingClientRect();
			dragOffset = { x: e.clientX - r.left, y: e.clientY - r.top };
			el.style.transition = '';
		}

		el.setPointerCapture(e.pointerId);
		e.preventDefault();
	}

	function onpointermove(e: PointerEvent) {
		if (!dragging || !el || fullscreen) return;
		const x = e.clientX - dragOffset.x;
		const y = e.clientY - dragOffset.y;
		if (!dragMoved) {
			const dx = Math.abs(x - dragPos.x);
			const dy = Math.abs(y - dragPos.y);
			if (dx > tapThreshold || dy > tapThreshold) dragMoved = true;
			// Dragged out of the park: it's a normal floating PiP again from here.
			if (dragMoved) parked = false;
		}
		dragPos = { x, y };
		el.style.transform = `translate(${x}px, ${y}px)`;
	}

	function onpointerup(_e: PointerEvent) {
		if (!dragging || !el) return;
		dragging = false;

		// A tap on the sliver brings it back, and does nothing else — no enlarge,
		// no controls. That is the whole interface a parked PiP has.
		if (parked && !dragMoved) {
			lastTapTime = 0;
			unpark();
			return;
		}

		if (!dragMoved) {
			const now = Date.now();
			if (now - lastTapTime < doubleTapMs) {
				lastTapTime = 0;
				if (fullscreen) {
					toggleFullscreen(); // exit fullscreen
				} else {
					toggleEnlarged();
				}
				return;
			}
			lastTapTime = now;
			if (fullscreenEnabled) {
				// Delayed single tap: toggle controls (skipped if double-tap follows)
				const tapTime = now;
				setTimeout(() => {
					if (lastTapTime === tapTime) showControls = !showControls;
				}, doubleTapMs);
			}
			return;
		}

		if (!fullscreen) {
			const r = el.getBoundingClientRect();
			// Half of it pushed past the right edge means the reader was putting it
			// away, not aiming for the corner — the corner snap leaves the whole
			// width on screen, so this can't fire by accident.
			if (r.left > window.innerWidth - r.width / 2) park(el);
			else snapToCorner(el, nearestCorner(r.left, r.top, el));
		}
	}

	return {
		get corner() { return corner; },
		get dragging() { return dragging; },
		get enlarged() { return enlarged; },
		get parked() { return parked; },
		get fullscreen() { return fullscreen; },
		get showControls() { return showControls; },
		show,
		hide,
		reposition,
		toggleFullscreen,
		unpark,
		onpointerdown,
		onpointermove,
		onpointerup
	};
}
