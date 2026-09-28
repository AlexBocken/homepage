<script lang="ts">
	// The way back up at the end of a long prayer. A link to #top without
	// JavaScript; with it, a smooth scroll that leaves the URL alone.
	import '$lib/css/action_button.css';

	let { label }: { label: string } = $props();
</script>

<a
	class="scroll-top-button action_button"
	href="#top"
	onclick={(e) => {
		e.preventDefault();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}}
	aria-label={label}
>
	<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
</a>

<style>
	.scroll-top-button {
		margin: 2rem auto 0;
		width: fit-content;
		text-decoration: none;
	}
</style>
