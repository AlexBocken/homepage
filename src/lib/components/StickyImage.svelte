<script>
	import { onMount } from 'svelte';

	/**
	 * @param {'layout' | 'overlay'} mode
	 *   - 'layout': flex row on desktop (image sticky right, content left). Use as page-level wrapper.
	 *   - 'overlay': image floats over the page (fixed position, IntersectionObserver show/hide). Use when nested inside existing layouts.
	 */
	let { src, alt = '', mode = 'layout', children } = $props();

	let pipEl = $state(null);
	let contentEl = $state(null);
	let corner = $state('bottom-right');
	let dragging = $state(false);
	let enlarged = $state(false);
	let inView = $state(false);
	let dragOffset = { x: 0, y: 0 };
	let dragPos = $state({ x: 0, y: 0 });
	let dragMoved = false;
	let lastTapTime = 0;
	const MARGIN = 16;
	const TAP_THRESHOLD = 10;
	const DOUBLE_TAP_MS = 400;

	function isMobile() {
		return !window.matchMedia('(min-width: 1024px)').matches;
	}

	// PiP drag behavior only on mobile for both modes
	function isPipActive() {
		return isMobile();
	}

	// Whether the image visibility is controlled by IntersectionObserver
	function isObserverControlled() {
		return mode === 'overlay';
	}

	function getCornerPos(c, el) {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const r = el.getBoundingClientRect();
		return {
			'top-left': { x: MARGIN, y: MARGIN },
			'top-right': { x: vw - r.width - MARGIN, y: MARGIN },
			'bottom-left': { x: MARGIN, y: vh - r.height - MARGIN },
			'bottom-right': { x: vw - r.width - MARGIN, y: vh - r.height - MARGIN },
		}[c];
	}

	function snapToCorner(el, c) {
		const pos = getCornerPos(c, el);
		corner = c;
		dragPos = pos;
		el.style.transition = 'transform 0.25s ease';
		el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
		el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
	}

	function nearestCorner(x, y, el) {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		const r = el.getBoundingClientRect();
		const cx = x + r.width / 2;
		const cy = y + r.height / 2;
		const left = cx < vw / 2;
		const top = cy < vh / 2;
		return `${top ? 'top' : 'bottom'}-${left ? 'left' : 'right'}`;
	}

	function onPointerDown(e) {
		if (!pipEl || !isPipActive()) return;
		dragging = true;
		dragMoved = false;
		const r = pipEl.getBoundingClientRect();
		dragOffset = { x: e.clientX - r.left, y: e.clientY - r.top };
		pipEl.setPointerCapture(e.pointerId);
		pipEl.style.transition = '';
		e.preventDefault();
	}

	function onPointerMove(e) {
		if (!dragging || !pipEl) return;
		const x = e.clientX - dragOffset.x;
		const y = e.clientY - dragOffset.y;
		if (!dragMoved) {
			const dx = Math.abs(x - dragPos.x);
			const dy = Math.abs(y - dragPos.y);
			if (dx > TAP_THRESHOLD || dy > TAP_THRESHOLD) dragMoved = true;
		}
		dragPos = { x, y };
		pipEl.style.transform = `translate(${x}px, ${y}px)`;
	}

	function toggleEnlarged() {
		if (!pipEl) return;
		const rect = pipEl.getBoundingClientRect();
		const vh = window.innerHeight / 100;
		const currentH = enlarged ? 37.5 * vh : 25 * vh;
		const targetH = enlarged ? 25 * vh : 37.5 * vh;
		const ratio = targetH / currentH;

		enlarged = !enlarged;

		const newW = rect.width * ratio;
		const newH = rect.height * ratio;
		let newX = rect.left;
		let newY = rect.top;
		if (corner.includes('right')) newX = rect.right - newW;
		if (corner.includes('bottom')) newY = rect.bottom - newH;

		dragPos = { x: newX, y: newY };
		pipEl.style.transition = 'transform 0.25s ease';
		pipEl.style.transform = `translate(${newX}px, ${newY}px)`;
		pipEl.addEventListener('transitionend', () => {
			pipEl.style.transition = '';
		}, { once: true });
	}

	function onPointerUp(e) {
		if (!dragging || !pipEl) return;
		dragging = false;

		if (!dragMoved) {
			const now = Date.now();
			if (now - lastTapTime < DOUBLE_TAP_MS) {
				lastTapTime = 0;
				toggleEnlarged();
				return;
			}
			lastTapTime = now;
		}

		const r = pipEl.getBoundingClientRect();
		snapToCorner(pipEl, nearestCorner(r.left, r.top, pipEl));
	}

	function updateVisibility() {
		if (!pipEl) return;
		if (isPipActive()) {
			// Mobile PiP mode
			if (inView) {
				const pos = getCornerPos(corner, pipEl);
				dragPos = pos;
				pipEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
				pipEl.style.opacity = '1';
			} else {
				pipEl.style.opacity = '0';
			}
		} else {
			// Desktop (both modes): CSS handles everything
			pipEl.style.opacity = '';
			pipEl.style.transform = '';
		}
	}

	$effect(() => {
		inView;
		updateVisibility();
	});

	function onResize() {
		if (!pipEl) return;
		updateVisibility();
	}

	onMount(() => {
		updateVisibility();

		window.addEventListener('resize', onResize);

		let observer;
		if (contentEl) {
			observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						inView = entry.isIntersecting;
					}
				},
				{ threshold: 0 }
			);
			observer.observe(contentEl);
		}

		return () => {
			window.removeEventListener('resize', onResize);
			observer?.disconnect();
		};
	});
</script>

<div class="sticky-image-layout" class:overlay={mode === 'overlay'}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="image-wrap"
		class:enlarged
		bind:this={pipEl}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
	>
		<img {src} {alt}>
	</div>
	<div class="content-scroll" bind:this={contentEl}>
		{@render children()}
	</div>
</div>

<style>
.sticky-image-layout {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin: auto;
	padding: 0 1em;
}
.sticky-image-layout.overlay {
	display: contents;
}
.image-wrap {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 10000;
	width: auto;
	opacity: 0;
	touch-action: none;
	cursor: grab;
	user-select: none;
	transition: opacity 0.25s ease;
}
.image-wrap:active {
	cursor: grabbing;
}
.image-wrap img {
	height: 25vh;
	width: auto;
	object-fit: contain;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	pointer-events: none;
	transition: height 0.25s ease;
}
.image-wrap.enlarged img {
	height: 37.5vh;
}
.content-scroll {
	width: 100%;
	max-width: 700px;
}
.overlay .content-scroll {
	max-width: none;
}
@media (min-width: 1024px) {
	.sticky-image-layout.overlay {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 2rem;
		width: calc(100% + 25vw + 2rem);
	}
	.overlay .image-wrap {
		position: sticky;
		top: 4rem;
		left: auto;
		transform: none !important;
		width: auto;
		align-self: start;
		order: 1;
		opacity: 1;
		z-index: auto;
		cursor: default;
		touch-action: auto;
		user-select: auto;
		transition: none;
	}
	.overlay .image-wrap img {
		height: auto;
		max-height: calc(100vh - 5rem);
		width: auto;
		max-width: 25vw;
		border-radius: 0;
		box-shadow: none;
		pointer-events: auto;
	}
	.sticky-image-layout:not(.overlay) {
		flex-direction: row;
		align-items: flex-start;
		gap: 2em;
	}
	.sticky-image-layout:not(.overlay) .content-scroll {
		flex: 0 1 700px;
	}
	.sticky-image-layout:not(.overlay) .image-wrap {
		position: sticky;
		top: 4rem;
		left: auto;
		transform: none !important;
		opacity: 1;
		flex: 1;
		background-color: transparent;
		padding: 0;
		order: 1;
		cursor: default;
		touch-action: auto;
		user-select: auto;
		transition: none;
	}
	.sticky-image-layout:not(.overlay) .image-wrap img {
		max-height: calc(100vh - 4rem);
		height: auto;
		width: 100%;
		object-fit: contain;
		border-radius: 0;
		box-shadow: none;
	}
}
@media (prefers-color-scheme: light) {
	.sticky-image-layout:not(.overlay) .image-wrap {
		background-color: var(--nord5);
	}
}
@media (prefers-color-scheme: light) and (min-width: 1024px) {
	.sticky-image-layout:not(.overlay) .image-wrap {
		background-color: transparent;
	}
}
@media (min-width: 1400px) {
	.sticky-image-layout:not(.overlay)::before {
		content: '';
		flex: 1;
		order: -1;
	}
}
</style>
