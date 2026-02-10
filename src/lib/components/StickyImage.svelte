<script>
	import { onMount } from 'svelte';
	import { createPip } from '$lib/js/pip.svelte';
	import PipImage from '$lib/components/PipImage.svelte';

	/**
	 * @param {'layout' | 'overlay'} mode
	 *   - 'layout': flex row on desktop (image sticky right, content left). Use as page-level wrapper.
	 *   - 'overlay': image floats over the page (fixed position, IntersectionObserver show/hide). Use when nested inside existing layouts.
	 */
	let { src, alt = '', mode = 'layout', children } = $props();

	let pipEl = $state(null);
	let contentEl = $state(null);
	let inView = $state(false);

	const pip = createPip({ fullscreenEnabled: true });

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
	<div class="image-wrap-desktop">
		<img {src} {alt}>
	</div>
	<PipImage {pip} {src} {alt} visible={inView} bind:el={pipEl} />
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
.image-wrap-desktop {
	display: none;
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
	.image-wrap-desktop {
		display: block;
		position: sticky;
		top: 4rem;
		align-self: start;
		order: 1;
	}
	.overlay .image-wrap-desktop img {
		height: auto;
		max-height: calc(100vh - 5rem);
		width: auto;
		max-width: 25vw;
	}
	.sticky-image-layout:not(.overlay) {
		flex-direction: row;
		align-items: flex-start;
		gap: 2em;
	}
	.sticky-image-layout:not(.overlay) .content-scroll {
		flex: 0 1 700px;
	}
	.sticky-image-layout:not(.overlay) .image-wrap-desktop {
		display: block;
		position: sticky;
		top: 4rem;
		flex: 1;
		order: 1;
	}
	.sticky-image-layout:not(.overlay) .image-wrap-desktop img {
		max-height: calc(100vh - 4rem);
		height: auto;
		width: 100%;
		object-fit: contain;
	}
}
@media (prefers-color-scheme: light) {
	.sticky-image-layout:not(.overlay) .image-wrap-desktop {
		background-color: var(--nord5);
	}
}
@media (prefers-color-scheme: light) and (min-width: 1024px) {
	.sticky-image-layout:not(.overlay) .image-wrap-desktop {
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
