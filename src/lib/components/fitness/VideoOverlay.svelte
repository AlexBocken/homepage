<script>
	import { X } from '@lucide/svelte';

	let { src, poster = '', onClose } = $props();

	function handleKeydown(e) {
		if (e.key === 'Escape') onClose();
	}

	function handleBackdrop(e) {
		if (e.target === e.currentTarget) onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="video-overlay" role="presentation" onclick={handleBackdrop}>
	<button class="close-btn" onclick={onClose} aria-label="Close video">
		<X size={24} />
	</button>
	<!-- svelte-ignore a11y_media_has_caption -->
	<video autoplay controls playsinline {poster}>
		<source src={src} type="video/mp4" />
	</video>
</div>

<style>
	.video-overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		background: rgba(0, 0, 0, 0.92);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		opacity: 0.7;
		transition: opacity 0.15s;
		z-index: 1;
	}
	.close-btn:hover {
		opacity: 1;
	}
	video {
		max-width: 100%;
		max-height: 90vh;
		border-radius: 8px;
	}
</style>
