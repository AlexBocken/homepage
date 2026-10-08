<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import ChipTypeahead from '$lib/components/hikes/ChipTypeahead.svelte';
	import CompactCard from '$lib/components/recipes/CompactCard.svelte';
	import RecipeBrowse from '$lib/components/recipes/RecipeBrowse.svelte';
	import { m, type RecipesLang } from '$lib/js/recipesI18n';
	import { createRecipeBrowse, type BrowseRecipe } from '$lib/js/recipeBrowse.svelte';
	import { compareMatches, matchRecipes, type PantryMatch } from '$lib/js/pantryMatch';

	let { data }: { data: PageData } = $props();

	const lang = $derived(data.lang as RecipesLang);
	const t = $derived(m[lang]);

	/** Your basics, once you've changed them. Remembered per device: they are a
	 *  convenience, the shareable part of a search is `?have=`. */
	const BASICS_KEY = 'pantry-basics';
	/** Cards per result group before "Mehr anzeigen". */
	const PAGE = 12;

	const itemByKey = $derived(new Map(data.pantry.items.map((i) => [i.key, i])));
	const options = $derived(data.pantry.items.map((i) => i.key));
	const label = (key: string) => {
		const item = itemByKey.get(key);
		return item ? (lang === 'en' ? item.en : item.de) : key;
	};

	// svelte-ignore state_referenced_locally
	const mine = new SvelteSet<string>(data.have.filter((k) => itemByKey.has(k)));
	// svelte-ignore state_referenced_locally
	const basics = new SvelteSet<string>(data.pantry.basics);

	onMount(() => {
		try {
			const stored = JSON.parse(localStorage.getItem(BASICS_KEY) ?? 'null');
			if (Array.isArray(stored)) {
				basics.clear();
				for (const key of stored) if (itemByKey.has(key)) basics.add(key);
			}
		} catch {
			// No storage (private mode, blocked): the defaults stand.
		}
	});

	function saveBasics() {
		try {
			localStorage.setItem(BASICS_KEY, JSON.stringify([...basics]));
		} catch {
			// Not remembered, but still applied for this visit.
		}
	}

	function toggleMine(key: string) {
		if (mine.has(key)) mine.delete(key);
		else mine.add(key);
		// Kept in the URL so a search can be shared, without re-running the load:
		// the same in-place update HefeSwapper and IngredientsPage make, passing
		// history.state through so SvelteKit's own entry survives.
		const url = new URL(window.location.href);
		if (mine.size > 0) url.searchParams.set('have', [...mine].join(','));
		else url.searchParams.delete('have');
		window.history.replaceState(window.history.state, '', url);
	}

	function toggleBasic(key: string) {
		if (basics.has(key)) basics.delete(key);
		else basics.add(key);
		saveBasics();
	}

	function resetBasics() {
		basics.clear();
		for (const key of data.pantry.basics) basics.add(key);
		try {
			localStorage.removeItem(BASICS_KEY);
		} catch {
			// Nothing stored to forget.
		}
	}

	const briefs = $derived(new Map(data.recipes.map((r) => [String(r._id), r])));
	const matches = $derived(matchRecipes(data.pantry, [...mine, ...basics], mine));

	/** Recipes that are at most two ingredients away. */
	const candidates = $derived.by(() => {
		const out: PantryMatch[] = [];
		for (const match of matches.values()) {
			if (match.missing.length > 2 || !briefs.has(match.id)) continue;
			// "One ingredient short" is only worth showing for recipes that use what
			// you picked — otherwise it lists half the collection. Cookable ones
			// stay, whatever they're made of.
			if (match.missing.length > 0 && mine.size > 0 && match.used === 0) continue;
			out.push(match);
		}
		return out;
	});

	// The filter rail narrows the candidates, and its counts describe them rather
	// than the whole collection.
	const browse = createRecipeBrowse(() => candidates.map((c) => briefs.get(c.id) as BrowseRecipe));
	const passing = $derived(new Set(browse.results.map((r) => String(r.recipe._id))));

	/** Recipes by how many ingredients they're missing: 0, 1, 2. */
	const groups = $derived.by(() => {
		const out: PantryMatch[][] = [[], [], []];
		for (const match of candidates) if (passing.has(match.id)) out[match.missing.length].push(match);
		const name = (id: string) => briefs.get(id)?.name ?? '';
		for (const group of out) group.sort((a, b) => compareMatches(a, b) || name(a.id).localeCompare(name(b.id)));
		return out;
	});

	const titles = $derived([t.pantry_all_there, t.pantry_missing_one, t.pantry_missing_two]);
	let shown = $state([PAGE, PAGE, PAGE]);
</script>

<svelte:head>
	<title>{t.pantry_title} - {t.site_title}</title>
	<meta name="description" content={t.pantry_meta_description} />
</svelte:head>

<h1>{t.pantry_title}</h1>

<section class="pick" aria-labelledby="pantry-have" id="pantry-have-picker">
	<h2 id="pantry-have">{t.pantry_have_label}</h2>
	<ChipTypeahead
		{options}
		selected={mine}
		onToggle={toggleMine}
		labelFor={label}
		placeholder={t.pantry_have_placeholder}
		{lang}
	/>
	{#if mine.size === 0}
		<p class="hint">{t.pantry_empty_hint}</p>
	{/if}

	<details class="basics" id="pantry-basics">
		<summary>{t.pantry_basics_label} <span class="count">({basics.size})</span></summary>
		<p class="hint">{t.pantry_basics_hint}</p>
		<ChipTypeahead
			{options}
			selected={basics}
			onToggle={toggleBasic}
			labelFor={label}
			placeholder={t.pantry_basics_add}
			{lang}
		/>
		<button type="button" class="reset" onclick={resetBasics}>{t.pantry_basics_reset}</button>
	</details>
</section>

<RecipeBrowse {browse} {lang} recipeLang={data.recipeLang} isLoggedIn={!!data.session?.user}>
	{#each groups as group, missing (missing)}
		{#if group.length > 0}
			<section class="results" aria-labelledby="pantry-group-{missing}" data-missing={missing}>
				<h2 id="pantry-group-{missing}">{titles[missing]} <span class="count">{group.length}</span></h2>
				<ul class="grid">
					{#each group.slice(0, shown[missing]) as match (match.id)}
						<li>
							{#if match.missing.length > 0}
								<p class="missing">{t.pantry_missing_prefix} {match.missing.map(label).join(', ')}</p>
							{/if}
							<CompactCard
								recipe={briefs.get(match.id)}
								isFavorite={briefs.get(match.id)?.isFavorite}
								showFavoriteIndicator={!!data.session?.user}
								routePrefix="/{data.recipeLang}"
							/>
						</li>
					{/each}
				</ul>
				{#if group.length > shown[missing]}
					<button type="button" class="more" onclick={() => (shown[missing] += PAGE)}>{t.pantry_show_more}</button>
				{/if}
			</section>
		{/if}
	{/each}

	{#if groups.every((g) => g.length === 0)}
		<p class="hint empty">
			{t.pantry_none}
			{#if browse.activeCount > 0}
				<br /><button type="button" class="reset" onclick={() => browse.reset()}>{t.clear_all_filters}</button>
			{/if}
		</p>
	{/if}
</RecipeBrowse>

<style>
	h1 {
		text-align: center;
		font-size: var(--text-3xl);
	}

	h2 {
		font-size: var(--text-xl);
		margin: 0 0 0.75rem;
	}
	.pick {
		/* The 16px gutter on a phone, centred at 720px beyond it. */
		box-sizing: border-box;
		width: calc(100% - 2rem);
		max-width: 720px;
		margin: 0 auto;
		padding: 1.25rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}
	.hint {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		margin: 0.5rem 0;
	}
	.basics {
		margin-top: 1.25rem;
		border-top: 1px solid var(--color-border);
		padding-top: 1rem;
	}
	.basics summary {
		cursor: pointer;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.count {
		color: var(--color-text-secondary);
		font-weight: 400;
	}
	.reset,
	.more {
		margin-top: 0.75rem;
		padding: 0.4rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: background-color var(--transition-normal);
	}
	.reset:hover,
	.more:hover {
		background: var(--color-bg-elevated);
	}
	.results + .results {
		margin-top: 2.5rem;
	}
	.empty {
		text-align: center;
		padding: 2rem 0;
	}
	.grid {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1.5rem;
	}
	.grid li {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}
	.missing {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.more {
		display: block;
		margin-inline: auto;
	}
	@media (max-width: 560px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.8rem;
		}
	}
</style>
