<script>
	import BlurImage from '$lib/components/BlurImage.svelte';

	/**
	 * @param {ReturnType<import('$lib/js/pip.svelte').createPip>} pip - a createPip() instance
	 * @param {string} src - image source
	 * @param {string} [alt] - image alt text
	 * @param {boolean} [visible] - whether the PiP should be shown
	 * @param {(e: Event) => void} [onload] - callback when image loads
	 */
	let { pip, src, alt = '', visible = false, onload = undefined, el = $bindable(null) } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="pip-container"
	class:visible
	class:enlarged={pip.enlarged}
	class:parked={pip.parked}
	class:fullscreen={pip.fullscreen}
	bind:this={el}
	onpointerdown={pip.onpointerdown}
	onpointermove={pip.onpointermove}
	onpointerup={pip.onpointerup}
>
	{#if src}
		<BlurImage {src} {alt} {onload} />
	{/if}
	{#if pip.showControls}
		<button
			class="pip-fullscreen-btn"
			aria-label="Fullscreen"
			onpointerdown={(e) => e.stopPropagation()}
			onclick={(e) => { e.stopPropagation(); pip.toggleFullscreen(); }}
		>
			<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="8 3 3 3 3 8"/>
				<polyline points="16 3 21 3 21 8"/>
				<polyline points="8 21 3 21 3 16"/>
				<polyline points="16 21 21 21 21 16"/>
			</svg>
		</button>
	{/if}
</div>

<style>
.pip-container {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 10000;
	opacity: 0;
	touch-action: none;
	cursor: grab;
	user-select: none;
	transition: opacity 0.25s ease;
	pointer-events: none;
}
.pip-container:active {
	cursor: grabbing;
}
/* Parked: all but a sliver is off the right edge, and the sliver is a button
   in everything but name — one tap brings the image back. */
.pip-container.parked {
	cursor: pointer;
}
.pip-container.parked :global(img) {
	/* Only the left corners are on screen, so only they should be round. */
	border-radius: 6px 0 0 6px;
	box-shadow: -2px 2px 10px rgb(0 0 0 / 0.35);
}
/* A grab bar on the visible strip: without it the sliver reads as an image
   half-lost off the edge rather than something put away on purpose. */
.pip-container.parked::before {
	content: '';
	position: absolute;
	top: 50%;
	left: 7px;
	transform: translateY(-50%);
	width: 3px;
	height: 28px;
	border-radius: var(--radius-pill);
	background: rgb(255 255 255 / 0.8);
	box-shadow: 0 0 3px rgb(0 0 0 / 0.55);
	pointer-events: none;
}
/* Sized by AREA, not height: at a fixed height a wide landscape eats half the
   screen while a tall portrait is a stamp, and the PiP is a thumbnail whose job
   is to take up a predictable amount of room. Constant area with a fixed ratio
   means h = k/√r and w = k·√r, so the reference `--pip` is the side of the
   equivalent square and every image covers --pip² vh² whatever its shape.
   `--ratio` comes from BlurImage; CSS can't derive it from aspect-ratio,
   because it can't divide a length by a length. The plain height above it is
   the fallback wherever sqrt() isn't supported (pre-15.4 Safari) — there the
   old fixed-height behaviour stands. */
.pip-container :global(img) {
	--pip: 25;
	height: 25vh;
	height: calc(var(--pip) * 1vh / sqrt(var(--ratio, 1)));
	width: auto;
	object-fit: contain;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	pointer-events: none;
	transition: height 0.25s ease;
}
/* Both declarations again, not just --pip: this rule is later and more
   specific, so a bare `height` here would beat the calc() in the base rule. */
.pip-container.enlarged :global(img) {
	--pip: 37.5;
	height: 37.5vh;
	height: calc(var(--pip) * 1vh / sqrt(var(--ratio, 1)));
}
.pip-container.fullscreen {
	width: 100vw;
	height: 100vh;
	background: rgba(0, 0, 0, 0.95);
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: default;
}
.pip-container.fullscreen :global(img) {
	border-radius: 0;
	box-shadow: none;
}
.pip-fullscreen-btn {
	all: unset;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background: transparent;
	filter: drop-shadow(0 0 1px black);
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	padding: 0;
	z-index: 1;
	pointer-events: auto;
	outline: none;
	transition: transform 0.15s ease;
}
.pip-fullscreen-btn:hover,
.pip-fullscreen-btn:active {
	transform: translate(-50%, -50%) scale(1.2);
}
.pip-container.fullscreen .pip-fullscreen-btn {
	top: auto;
	left: auto;
	bottom: 10vw;
	right: 10vw;
	transform: none;
}
.pip-container.fullscreen .pip-fullscreen-btn:hover,
.pip-container.fullscreen .pip-fullscreen-btn:active {
	transform: scale(0.85);
}
</style>
