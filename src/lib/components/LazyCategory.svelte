<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let {
		title = '',
		eager = false,
		estimatedHeight = 400,
		rootMargin = '400px',
		children
	} = $props();

	let isVisible = $state(eager); // If eager=true, render immediately
	let containerRef = $state(null);
	let observer = $state(null);

	onMount(() => {
		if (!browser || eager) return;

		// Create Intersection Observer to detect when category approaches viewport
		observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting && !isVisible) {
						isVisible = true;
						// Once visible, stop observing (keep it rendered)
						if (observer && containerRef) {
							observer.unobserve(containerRef);
						}
					}
				});
			},
			{
				rootMargin, // Start loading 400px before entering viewport
				threshold: 0
			}
		);

		if (containerRef) {
			observer.observe(containerRef);
		}

		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});
</script>

{#if isVisible}
	<!-- Render actual content when visible -->
	<div bind:this={containerRef}>
		{@render children()}
	</div>
{:else}
	<!-- Placeholder with estimated height to maintain scroll position -->
	<div
		bind:this={containerRef}
		style="height: {estimatedHeight}px; min-height: {estimatedHeight}px;"
		role="status"
		aria-label="Loading {title}"
	>
		<!-- Empty placeholder - IntersectionObserver will trigger when this enters viewport -->
	</div>
{/if}
