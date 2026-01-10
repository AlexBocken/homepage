<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let {
		src,
		placeholder = '',
		alt = '',
		eager = false,
		onload = () => {},
		...restProps
	} = $props();

	let shouldLoad = $state(eager);
	let imgElement = $state(null);
	let isLoaded = $state(false);
	let observer = $state(null);

	// React to eager prop changes
	$effect(() => {
		if (eager && !shouldLoad) {
			shouldLoad = true;
		}
	});

	onMount(() => {
		if (!browser) return;

		// If eager, load immediately
		if (eager) {
			shouldLoad = true;
			return;
		}

		// Helper to check if element is actually visible (both horizontal and vertical)
		function isElementInViewport(el) {
			const rect = el.getBoundingClientRect();
			const windowHeight = window.innerHeight || document.documentElement.clientHeight;
			const windowWidth = window.innerWidth || document.documentElement.clientWidth;

			// Check if element is within viewport bounds (with margin)
			const margin = 400; // Load 400px before visible
			return (
				rect.top < windowHeight + margin &&
				rect.bottom > -margin &&
				rect.left < windowWidth + margin &&
				rect.right > -margin
			);
		}

		// Check visibility on scroll (both vertical and horizontal)
		function checkVisibility() {
			if (!shouldLoad && imgElement && isElementInViewport(imgElement)) {
				shouldLoad = true;
				// Remove listeners once loaded
				cleanup();
			}
		}

		// Listen to both scroll events and intersection
		let scrollContainers = [];

		// Find parent scroll containers
		let parent = imgElement?.parentElement;
		while (parent) {
			const overflowX = window.getComputedStyle(parent).overflowX;
			const overflowY = window.getComputedStyle(parent).overflowY;
			if (overflowX === 'auto' || overflowX === 'scroll' ||
			    overflowY === 'auto' || overflowY === 'scroll') {
				scrollContainers.push(parent);
			}
			parent = parent.parentElement;
		}

		// Add scroll listeners
		window.addEventListener('scroll', checkVisibility, { passive: true });
		scrollContainers.forEach(container => {
			container.addEventListener('scroll', checkVisibility, { passive: true });
		});

		// Also use IntersectionObserver as fallback
		observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						checkVisibility();
					}
				});
			},
			{
				rootMargin: '400px',
				threshold: 0
			}
		);

		if (imgElement) {
			observer.observe(imgElement);
			// Check initial visibility
			checkVisibility();
		}

		function cleanup() {
			window.removeEventListener('scroll', checkVisibility);
			scrollContainers.forEach(container => {
				container.removeEventListener('scroll', checkVisibility);
			});
			if (observer && imgElement) {
				observer.unobserve(imgElement);
			}
		}

		return cleanup;
	});

	function handleLoad() {
		isLoaded = true;
		onload();
	}
</script>

<img
	bind:this={imgElement}
	src={shouldLoad ? src : placeholder}
	{alt}
	class:blur={shouldLoad && !isLoaded}
	onload={handleLoad}
	{...restProps}
/>
