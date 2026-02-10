<script>
	/**
	 * @param {ReturnType<import('$lib/js/pip.svelte').createPip>} pip - a createPip() instance
	 * @param {string} src - image source
	 * @param {string} [alt] - image alt text
	 * @param {boolean} [visible] - whether the PiP should be shown
	 * @param {(e: Event) => void} [onload] - callback when image loads
	 */
	let { pip, src, alt = '', visible = false, onload, el = $bindable(null) } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="pip-container"
	class:visible
	class:enlarged={pip.enlarged}
	class:fullscreen={pip.fullscreen}
	bind:this={el}
	onpointerdown={pip.onpointerdown}
	onpointermove={pip.onpointermove}
	onpointerup={pip.onpointerup}
>
	{#if src}
		<img {src} {alt} {onload}>
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
.pip-container img {
	height: 25vh;
	width: auto;
	object-fit: contain;
	border-radius: 6px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	pointer-events: none;
	transition: height 0.25s ease;
}
.pip-container.enlarged img {
	height: 37.5vh;
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
.pip-container.fullscreen img {
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
