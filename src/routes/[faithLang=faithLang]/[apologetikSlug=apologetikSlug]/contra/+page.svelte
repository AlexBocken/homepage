<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import CaseTabs from '$lib/components/faith/CaseTabs.svelte';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';

	import { m, type FaithLang } from '$lib/js/faithI18n';

	let { data } = $props();
	const faithLang = $derived(data?.faithLang ?? 'faith');
	const slug = $derived(faithLang === 'faith' ? 'apologetics' : 'apologetik');
	const lang = $derived((data?.lang ?? 'en') as FaithLang);
	const t = $derived(m[lang]);
	const isLatin = $derived(lang === 'la');
	const isGerman = $derived(lang === 'de');

	const ARCHETYPES = $derived(data.archetypes);
	const ARGUMENTS = $derived(data.args);

	let activeId = $state<string>('');
	let filterArchId = $state<string | null>(null);

	const filteredArguments = $derived.by(() => {
		const archId = filterArchId;
		if (!archId) return ARGUMENTS;
		return ARGUMENTS.filter((a) => Object.keys(a.counters).includes(archId));
	});

	let io: IntersectionObserver | null = null;

	function attachObserver() {
		if (io) io.disconnect();
		const els = document.querySelectorAll<HTMLElement>('.feed .arg-row');
		if (!els.length) return;
		io = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]) {
					activeId = visible[0].target.id.replace(/^arg-/, '');
				}
			},
			{ rootMargin: '-64px 0px -60% 0px', threshold: 0 }
		);
		els.forEach((el) => io!.observe(el));
	}

	onMount(() => {
		attachObserver();
		return () => io?.disconnect();
	});

	$effect(() => {
		// re-attach observer when filter changes the rendered list
		void filteredArguments;
		tick().then(attachObserver);
	});

	function jumpTo(e: MouseEvent, id: string) {
		const el = document.getElementById(`arg-${id}`);
		if (!el) return;
		e.preventDefault();
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		history.replaceState(null, '', `#arg-${id}`);
	}

	function toggleFilter(archId: string) {
		filterArchId = filterArchId === archId ? null : archId;
	}

	const heading = $derived(
		isLatin
			? 'Argumenta pro fide.'
			: isGerman
				? 'Argumente gegen den Glauben, beantwortet.'
				: 'Arguments against the faith, with reply.'
	);
	const lede = $derived(
		isLatin
			? 'Viginti tres obiectiones quas atheus opponere possit, singulae pluribus vocibus responsae.'
			: isGerman
				? 'Dreiundzwanzig Einwände, wie sie ein Atheist erheben mag, je in mehreren Stimmen beantwortet.'
				: 'Twenty-three objections an atheist might raise, each answered in several voices.'
	);
	const tocLabel = $derived(t.objections);
	const legendTitle = $derived(t.voices_answering);
	const objectionLabel = $derived(t.objection_label);
	const answeredByLabel = $derived(t.answered_by);
	const filterLabels = $derived(
		isLatin
			? { filteringBy: 'Filtrum:', showAll: 'omnia ostendere' }
			: isGerman
				? { filteringBy: 'Gefiltert nach:', showAll: 'alle zeigen' }
				: { filteringBy: 'Filtering by:', showAll: 'show all' }
	);

	const archetypes = $derived(Object.values(ARCHETYPES));
</script>

<svelte:head>
	<title>{heading} · bocken.org</title>
	<meta
		name="description"
		content="Common objections to Christianity, each answered in several historical voices: Aquinas, Pascal, Augustine, Francis, Lewis, Chesterton, the Logician, the Mystic, the Scientist, the Pastor."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Spectral:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap"
	/>
</svelte:head>

<div class="apologetik">
	<CaseTabs {faithLang} active="contra" />

	<section class="page-head">
		<h1>{heading}</h1>
		<p class="lede">{lede}</p>
	</section>

	<section class="legend" aria-label={legendTitle}>
		<div class="legend-title">{legendTitle}</div>
		<div class="legend-row">
			{#each archetypes as a (a.id)}
				<button
					type="button"
					class="legend-item"
					class:active={filterArchId === a.id}
					class:dimmed={filterArchId !== null && filterArchId !== a.id}
					aria-pressed={filterArchId === a.id}
					onclick={() => toggleFilter(a.id)}
					title={a.sub}
				>
					<span class="glyph lg" aria-hidden="true" style="background:{a.color};">
						{a.glyph}
					</span>
					<span><span class="nm">{a.name}</span> <span class="sb">— {a.sub}</span></span>
				</button>
			{/each}
		</div>
		{#if filterArchId}
			{@const sel = ARCHETYPES[filterArchId]}
			<div class="filter-banner" role="status">
				<span>
					{filterLabels.filteringBy}
					<strong>
						<span class="glyph" aria-hidden="true" style="background:{sel.color};">
							{sel.glyph}
						</span>
						{sel.name}
					</strong>
					· {filteredArguments.length}/{ARGUMENTS.length}
				</span>
				<button type="button" class="filter-clear" onclick={() => (filterArchId = null)}
					>{filterLabels.showAll} ✕</button
				>
			</div>
		{/if}
	</section>

	<ApologetikToc
		title={tocLabel}
		items={filteredArguments.map((a) => ({
			id: a.id,
			n: a.n,
			short: a.short,
			title: a.title,
			href: `#arg-${a.id}`
		}))}
		{activeId}
		onItemClick={(e, id) => jumpTo(e, id)}
	/>

	<section class="feed" aria-label="Arguments">
		{#each filteredArguments as arg (arg.id)}
			<article class="arg-row" id="arg-{arg.id}">
				<a
					class="card-link"
					href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/contra/[argId]', { faithLang, apologetikSlug: slug, argId: arg.id })}
					aria-label={arg.title}
				></a>
				<div class="arg-num">
					{String(arg.n).padStart(2, '0')}
					<small>{objectionLabel}</small>
				</div>
				<div class="arg-body">
					<span class="arg-short">{arg.short}</span>
					<h2>{arg.title}</h2>
					<p class="arg-steel">{arg.steel}</p>
					<blockquote class="arg-quote"><q>{arg.quote}</q></blockquote>
					<div class="arg-quote-by">— {arg.quoteBy}</div>

					<div class="answer-rail">
						<span class="label">{answeredByLabel}</span>
						{#each Object.keys(arg.counters) as archId (archId)}
							{@const a = ARCHETYPES[archId]}
							<a
								class="archetype-badge"
								href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/contra/[argId]/[[archId]]', { faithLang, apologetikSlug: slug, argId: arg.id, archId })}
								title="{a.name} — {a.sub}"
							>
								<span class="glyph" aria-hidden="true" style="background:{a.color};">
									{a.glyph}
								</span>
								<span>{a.name}</span>
							</a>
						{/each}
					</div>
				</div>
			</article>
		{/each}
	</section>
</div>

<style>
	.apologetik {
		min-height: 100vh;
		padding-bottom: 80px;
		font-family: var(--font-sans);
	}

	.page-head {
		max-width: 760px;
		margin: 56px auto 8px;
		padding: 0 24px;
	}
	.page-head h1 {
		font-size: clamp(2rem, 4.4vw, 3.2rem);
		line-height: 1.08;
		font-weight: 700;
		margin: 0 0 18px;
		letter-spacing: -0.01em;
		text-align: left;
	}
	.page-head .lede {
		font-size: 1.12rem;
		line-height: 1.55;
		color: var(--color-text-secondary);
		max-width: 60ch;
		margin: 0;
	}

	.legend {
		max-width: 1100px;
		margin: 38px auto 0;
		padding: 18px 24px;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}
	.legend-title {
		font-size: 0.78rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		margin-bottom: 14px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	.legend-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 0.9rem;
		padding: 6px 12px 6px 6px;
		border-radius: var(--radius-pill);
		background: transparent;
		border: 1px solid transparent;
		color: var(--color-text-primary);
		cursor: pointer;
		font-family: var(--font-sans);
		transition:
			background var(--transition-fast),
			border-color var(--transition-fast),
			opacity var(--transition-fast),
			transform var(--transition-fast);
	}
	.legend-item:hover {
		background: var(--color-bg-tertiary);
		border-color: var(--color-border);
	}
	.legend-item:active {
		transform: scale(0.97);
	}
	.legend-item.active {
		background: var(--color-bg-elevated);
		border-color: var(--color-text-primary);
	}
	.legend-item.dimmed {
		opacity: 0.45;
	}
	.legend-item .nm {
		font-weight: 600;
	}
	.legend-item .sb {
		color: var(--color-text-tertiary);
		font-size: 0.82rem;
	}

	.filter-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
		margin-top: 14px;
		padding: 8px 12px;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	.filter-banner strong {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--color-text-primary);
		font-weight: 600;
	}
	.filter-banner .glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		color: white;
		font-size: 11px;
		line-height: 1;
		width: 18px;
		height: 18px;
	}
	.filter-clear {
		background: transparent;
		border: 0;
		color: var(--color-text-secondary);
		font-size: 0.78rem;
		font-family: var(--font-sans);
		cursor: pointer;
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast), color var(--transition-fast);
	}
	.filter-clear:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		color: white;
		flex: none;
		font-size: 12px;
		line-height: 1;
		width: 22px;
		height: 22px;
	}
	.glyph.lg {
		width: 26px;
		height: 26px;
		font-size: 14px;
	}

	.feed {
		max-width: 760px;
		margin: 28px auto 0;
		padding: 0 24px;
	}
	.arg-row {
		position: relative;
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: 22px;
		padding: 28px 18px;
		margin: 0 -18px;
		border-bottom: 1px solid var(--color-border);
		align-items: start;
		border-radius: var(--radius-md);
		transition: background var(--transition-fast);
		scroll-margin-top: 4rem;
	}
	.arg-row:hover {
		background: color-mix(in oklab, var(--color-bg-secondary) 60%, transparent);
	}
	.arg-row:has(.card-link:focus-visible) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.arg-row:has(.card-link:hover) h2 {
		color: var(--color-primary);
	}
	.arg-row:last-child {
		border-bottom: 0;
	}
	.card-link {
		position: absolute;
		inset: 0;
		z-index: 0;
		text-indent: -9999px;
		overflow: hidden;
		border-radius: inherit;
	}
	.card-link:focus-visible {
		outline: none;
	}
	.arg-row > .arg-num,
	.arg-row > .arg-body {
		position: relative;
		z-index: 1;
		pointer-events: none;
	}
	.arg-body h2 {
		transition: color var(--transition-fast);
	}
	.archetype-badge {
		pointer-events: auto;
	}
	.arg-num {
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 2.2rem;
		font-weight: 300;
		line-height: 1;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
	.arg-num small {
		display: block;
		font-size: 0.65rem;
		letter-spacing: 0.14em;
		margin-top: 4px;
		color: var(--color-text-muted, var(--color-text-tertiary));
	}
	.arg-body h2 {
		font-size: 1.55rem;
		line-height: 1.18;
		font-weight: 700;
		margin: 0 0 10px;
		text-align: left;
		letter-spacing: -0.005em;
	}
	.arg-short {
		display: inline-block;
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		background: var(--color-bg-tertiary);
		padding: 3px 10px;
		border-radius: var(--radius-pill);
		margin-bottom: 14px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	.arg-steel {
		font-size: 1rem;
		line-height: 1.6;
		color: var(--color-text-primary);
		margin: 0 0 14px;
		max-width: 60ch;
		text-wrap: pretty;
	}
	.arg-quote {
		font-size: 0.95rem;
		line-height: 1.55;
		color: var(--color-text-secondary);
		border-left: 2px solid var(--color-border);
		padding: 4px 0 4px 14px;
		margin: 0 0 6px;
		max-width: 56ch;
	}
	.arg-quote q::before {
		content: '\201C';
	}
	.arg-quote q::after {
		content: '\201D';
	}
	.arg-quote-by {
		font-size: 0.8rem;
		color: var(--color-text-tertiary);
		margin: 0 0 18px;
		padding-left: 14px;
	}

	.answer-rail {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		margin-top: 12px;
	}
	@media (min-width: 760px) {
		.answer-rail {
			/* Extend past the 760px content column into the right gutter when space allows.
			   arg-body left = 50vw - 278px; available right width capped 24px from viewport edge.
			   width:max-content lets the rail visually exceed its grid column up to max-width;
			   keep this scoped to >=760px so it doesn't inflate the column's intrinsic size on mobile. */
			width: max-content;
			max-width: min(calc(100vw - 126px), calc(50vw + 254px));
		}
	}
	.answer-rail .label {
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		margin-right: 4px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	.archetype-badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 5px 12px 5px 5px;
		border-radius: var(--radius-pill);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		text-decoration: none;
		color: var(--color-text-primary);
		font-size: 0.85rem;
		font-weight: 500;
		transition:
			transform var(--transition-fast),
			box-shadow var(--transition-normal),
			background var(--transition-normal);
		cursor: pointer;
	}
	.archetype-badge:hover {
		transform: scale(1.05);
		box-shadow: var(--shadow-sm);
		background: var(--color-bg-elevated);
	}
	.archetype-badge:active,
	.archetype-badge:focus-visible {
		transform: scale(0.95);
		outline: none;
	}

	@media (max-width: 640px) {
		.arg-row {
			grid-template-columns: 40px 1fr;
			gap: 14px;
			padding: 22px 0;
		}
		.arg-num {
			font-size: 1.6rem;
		}
		.arg-body h2 {
			font-size: 1.25rem;
		}
		.page-head h1 {
			font-size: 2rem;
		}
	}
</style>
