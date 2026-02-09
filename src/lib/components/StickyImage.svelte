<script>
	import { onMount } from 'svelte';
	import { createPip } from '$lib/js/pip.svelte';

	/**
	 * @param {'layout' | 'overlay'} mode
	 *   - 'layout': flex row on desktop (image sticky right, content left). Use as page-level wrapper.
	 *   - 'overlay': image floats over the page (fixed position, IntersectionObserver show/hide). Use when nested inside existing layouts.
	 */
	let { src, alt = '', mode = 'layout', children } = $props();

	let pipEl = $state(null);
	let contentEl = $state(null);
	let inView = $state(false);

	const pip = createPip();

	function isMobile() {
		return !window.matchMedia('(min-width: 1024px)').matches;
	}

	// PiP drag behavior only on mobile for both modes
	function isPipActive() {
		return isMobile();
	}

	function updateVisibility() {
		if (!pipEl) return;
		if (isPipActive()) {
			// Mobile PiP mode
			if (inView) {
				pip.show(pipEl);
			} else {
				pip.hide();
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
		if (isPipActive() && inView) {
			pip.reposition();
		} else {
			updateVisibility();
		}
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
		class:enlarged={pip.enlarged}
		bind:this={pipEl}
		onpointerdown={pip.onpointerdown}
		onpointermove={pip.onpointermove}
		onpointerup={pip.onpointerup}
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
