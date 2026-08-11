<script lang="ts">
	/**
	 * The recipe listing's search box.
	 *
	 * A real GET form pointed at /rezepte/search, so it still searches with
	 * JavaScript off; with JS on it is bound to a `createRecipeBrowse()` query
	 * and the page filters live as you type, never submitting.
	 */
	import { resolve } from '$app/paths';
	import { m, type RecipesLang } from '$lib/js/recipesI18n';
	import type { RecipeBrowse } from '$lib/js/recipeBrowse.svelte';

	interface Props {
		browse: RecipeBrowse;
		lang: RecipesLang;
		recipeLang: string;
		/** On the listing the box straddles the hero's lower edge. */
		hero?: boolean;
	}

	let { browse, lang, recipeLang, hero = false }: Props = $props();

	const t = $derived(m[lang]);
</script>

<style>
	.search-wrap {
		max-width: 1200px;
		margin: 2rem auto 0;
		padding: 0 2em;
		position: relative;
		/* Over the hero image it overlaps. */
		z-index: 10;
	}
	.search-wrap.hero { margin-top: -4em; }

	.search {
		width: 560px;
		max-width: 100%;
		position: relative;
		margin: 0 auto;
		font-size: 1.6rem;
		display: flex;
		align-items: center;
		transition: var(--transition-fast);
		filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25));
	}
	.search:hover,
	.search:focus-within {
		scale: 1.02 1.02;
		filter: drop-shadow(0.4em 0.5em 1em rgba(0, 0, 0, 0.6));
	}
	.search input {
		all: unset;
		box-sizing: border-box;
		background: var(--color-surface);
		color: var(--color-text-primary);
		padding: 0.7rem 2.6rem 0.7rem 2rem;
		border-radius: var(--radius-pill);
		width: 100%;
	}
	.search input::placeholder {
		color: var(--color-text-muted);
	}
	.search-button {
		all: unset;
		display: flex;
		justify-content: center;
		align-items: center;
		position: absolute;
		right: 0.5em;
		width: 1.5em;
		height: 1.5em;
		color: var(--color-text-tertiary);
		cursor: pointer;
		transition: color 180ms ease-in-out;
	}
	.search-button:hover { color: var(--color-text-primary); }
	.search-button svg { width: 100%; height: 100%; }
</style>

<div class="search-wrap" class:hero>
	<form
		class="search"
		method="get"
		action={resolve('/[recipeLang=recipeLang]/search', { recipeLang })}
	>
		<input
			type="text"
			id="search"
			name="q"
			placeholder={t.search_placeholder_short}
			bind:value={browse.query}
		/>
		{#if browse.query}
			<button type="button" class="search-button" onclick={() => (browse.query = '')}>
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>{t.clear_search_title}</title><path d="M135.19 390.14a28.79 28.79 0 0021.68 9.86h246.26A29 29 0 00432 371.13V140.87A29 29 0 00403.13 112H156.87a28.84 28.84 0 00-21.67 9.84v0L46.33 256l88.86 134.11z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34M336.67 322.34L206.66 192.33"/></svg>
			</button>
		{:else}
			<button type="submit" class="search-button">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>{t.search_title}</title><path d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="m338.29 338.29 105.25 105.25"/></svg>
			</button>
		{/if}
	</form>
</div>
