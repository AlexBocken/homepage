<script lang="ts">
	import CommentaryPage from '$lib/components/faith/bible/CommentaryPage.svelte';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
</script>

<CommentaryPage {data} />
