<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang } from '$lib/js/financesI18n';

	const t = $derived(m[financesLang(languageStore.value)]);
</script>

<div class="err">
	<h1>{page.status}</h1>
	<p>{page.error?.message ?? t.err_generic}</p>
	{#if page.status === 503 || page.status === 502}
		<p class="hint">{t.err_unreachable}</p>
	{/if}
	<a href={resolve('/finances')}>{t.back_to_overview}</a>
</div>

<style>
	.err {
		max-width: 500px;
		margin: 4rem auto;
		text-align: center;
		color: var(--color-text-primary);
	}
	h1 {
		font-size: var(--text-3xl);
		margin: 0 0 0.5rem;
	}
	.hint {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}
	a {
		display: inline-block;
		margin-top: 1.5rem;
		color: var(--color-primary);
	}
</style>
