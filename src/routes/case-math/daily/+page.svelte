<script lang="ts">
	import { resolve } from '$app/paths';
	import Drill from '$lib/components/caseMath/Drill.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Daily set · Case math</title>
</svelte:head>

<Drill mode="daily" plan={data.plan}>
	{#snippet after()}<a href={resolve('/case-math')}>Back to practice</a>{/snippet}
</Drill>
