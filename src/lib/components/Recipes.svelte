<script lang="ts">
import type { Snippet } from 'svelte';

let { title = '', children } = $props<{ title?: string, children?: Snippet }>();
let overflow = $state();
</script>
<style>

.wrapper{
	display: flex;
	flex-direction: row;
	flex-wrap: wrap;
	gap: 2.5rem;
	justify-content: center;
}
h2{
	max-width: 1000px;
	margin-left: 5rem;
	margin-bottom: 0;
	font-size: 3rem;
	margin-bottom: 1rem;
}
section:not(:has(h2)){
	padding-top: 4rem;
}
section{
	overflow: hidden;
	padding-bottom: 3.7rem;
}
</style>
<section>
{#if title}
	<h2>{title}</h2>
{/if}
<div class=wrapper>
	{@render children?.()}
</div>
</section>
