<script lang="ts">
	// Every Bible page keeps the reader's UTC offset in a cookie, so the server
	// can name the reader's calendar day on the next load (the streak, the
	// plan's "today") on a device that has not opened a chapter yet. The offset
	// changes only with DST, so a year is a fine lifetime; the old `bible_day`
	// date cookie, which went stale overnight, is dropped.
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
	onMount(() => {
		document.cookie = `bible_tz=${new Date().getTimezoneOffset()}; path=/; max-age=31536000; SameSite=Lax`;
		document.cookie = 'bible_day=; path=/; max-age=0; SameSite=Lax';
	});
</script>

{@render children()}
