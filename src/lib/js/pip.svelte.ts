/**
 * Shared PiP (Picture-in-Picture) drag/snap/enlarge composable.
 * Extracts duplicated mobile PiP logic from StickyImage and rosary page.
 */

interface PipOptions {
	margin?: number;
	tapThreshold?: number;
	doubleTapMs?: number;
	initialCorner?: Corner;
	smallHeight?: number;
	largeHeight?: number;
}

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export function createPip(opts: PipOptions = {}) {
	const margin = opts.margin ?? 16;
	const tapThreshold = opts.tapThreshold ?? 10;
	const doubleTapMs = opts.doubleTapMs ?? 400;
	const smallVh = opts.smallHeight ?? 25;
	const largeVh = opts.largeHeight ?? 37.5;

	let corner: Corner = $state(opts.initialCorner ?? 'bottom-right');
	let dragging = $state(false);
	let enlarged = $state(false);

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

	function snapToCorner(target: HTMLElement, c: Corner) {
		const pos = getCornerPos(c, target);
		corner = c;
		dragPos = pos;
		target.style.transition = 'transform 0.25s ease';
		target.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
		target.addEventListener('transitionend', () => { target.style.transition = ''; }, { once: true });
	}

	function toggleEnlarged() {
		if (!el) return;
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
		el.style.transition = 'transform 0.25s ease';
		el.style.transform = `translate(${newX}px, ${newY}px)`;
		el.addEventListener('transitionend', () => {
			el!.style.transition = '';
		}, { once: true });
	}

	function show(target: HTMLElement) {
		el = target;
		const pos = getCornerPos(corner, target);
		dragPos = pos;
		target.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
		target.style.opacity = '1';
	}

	function hide() {
		if (el) el.style.opacity = '0';
	}

	function reposition() {
		if (!el) return;
		const pos = getCornerPos(corner, el);
		dragPos = pos;
		el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
	}

	function onpointerdown(e: PointerEvent) {
		if (!el) return;
		dragging = true;
		dragMoved = false;
		const r = el.getBoundingClientRect();
		dragOffset = { x: e.clientX - r.left, y: e.clientY - r.top };
		el.setPointerCapture(e.pointerId);
		el.style.transition = '';
		e.preventDefault();
	}

	function onpointermove(e: PointerEvent) {
		if (!dragging || !el) return;
		const x = e.clientX - dragOffset.x;
		const y = e.clientY - dragOffset.y;
		if (!dragMoved) {
			const dx = Math.abs(x - dragPos.x);
			const dy = Math.abs(y - dragPos.y);
			if (dx > tapThreshold || dy > tapThreshold) dragMoved = true;
		}
		dragPos = { x, y };
		el.style.transform = `translate(${x}px, ${y}px)`;
	}

	function onpointerup(_e: PointerEvent) {
		if (!dragging || !el) return;
		dragging = false;

		if (!dragMoved) {
			const now = Date.now();
			if (now - lastTapTime < doubleTapMs) {
				lastTapTime = 0;
				toggleEnlarged();
				return;
			}
			lastTapTime = now;
		}

		const r = el.getBoundingClientRect();
		snapToCorner(el, nearestCorner(r.left, r.top, el));
	}

	return {
		get corner() { return corner; },
		get dragging() { return dragging; },
		get enlarged() { return enlarged; },
		show,
		hide,
		reposition,
		onpointerdown,
		onpointermove,
		onpointerup
	};
}
