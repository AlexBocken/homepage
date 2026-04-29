<script lang="ts">
	import { resolve } from '$app/paths';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';

	let { data } = $props();
	const faithLang = $derived(data?.faithLang ?? 'faith');
	const slug = $derived(faithLang === 'faith' ? 'apologetics' : 'apologetik');
	const isLatin = $derived(data?.lang === 'la');
	const isGerman = $derived(data?.lang === 'de');
	const arg = $derived(data.argument);
	const ARCHETYPES = $derived(data.archetypes);
	const alexPicks = $derived<string[]>(data.alexPicks ?? []);
	const alexChoiceLabel = $derived(
		isLatin ? 'Alexandri electio' : isGerman ? "Alex' Wahl" : "Alex's choice"
	);

	const tocLabel = $derived(
		isLatin ? 'Obiectiones' : isGerman ? 'Einwände' : 'Objections'
	);
	const tocItems = $derived(
		data.args.map((a) => ({
			id: a.id,
			n: a.n,
			short: a.short,
			title: a.title,
			href: `/${faithLang}/${slug}/contra/${a.id}`
		}))
	);

	const archIds = $derived(Object.keys(arg.counters));
	let selectedByArg = $state<Record<string, string>>({});
	const activeId = $derived.by(() => {
		const sel = selectedByArg[arg.id];
		if (sel && archIds.includes(sel)) return sel;
		if (data.initialArchId && archIds.includes(data.initialArchId)) return data.initialArchId;
		return archIds[0] ?? '';
	});
	const arch = $derived(ARCHETYPES[activeId]);
	const counter = $derived(arg.counters[activeId]);

	const labels = $derived(
		isLatin
			? {
					back: '← Ad omnia argumenta',
					eyebrowPrefix: 'Obiectio',
					objectionTitle: 'Obiectio in plenum',
					plain: 'aut, simplicius —',
					citations: 'Citationes',
					related: 'Obiectiones connexae'
				}
			: isGerman
				? {
						back: '← Alle Einwände',
						eyebrowPrefix: 'Einwand',
						objectionTitle: 'Der Einwand, im Vollen',
						plain: 'oder, einfach gesagt —',
						citations: 'Quellen',
						related: 'Verwandte Einwände'
					}
				: {
						back: '← All arguments',
						eyebrowPrefix: 'Objection',
						objectionTitle: 'The objection, in full',
						plain: 'or, in plain terms —',
						citations: 'Citations',
						related: 'Related objections'
					}
	);

	const acc = $derived(arch?.colorHex ?? '#5E81AC');
	const accSoft = $derived(arch ? hexToRgba(arch.colorHex, 0.14) : 'rgba(94,129,172,0.14)');

	function hexToRgba(hex: string, alpha: number): string {
		const h = hex.replace('#', '');
		const r = parseInt(h.slice(0, 2), 16);
		const g = parseInt(h.slice(2, 4), 16);
		const b = parseInt(h.slice(4, 6), 16);
		return `rgba(${r},${g},${b},${alpha})`;
	}

	function selectArch(id: string) {
		selectedByArg = { ...selectedByArg, [arg.id]: id };
		if (typeof window !== 'undefined') {
			history.replaceState(null, '', `/${faithLang}/${slug}/contra/${arg.id}/${id}`);
		}
	}

</script>

<svelte:head>
	<title>{arg.title} · {isLatin ? 'Apologia' : isGerman ? 'Apologetik' : 'Arguments'} · bocken.org</title>
	<meta name="description" content={arg.steel} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Spectral:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap"
	/>
</svelte:head>

<ApologetikToc title={tocLabel} items={tocItems} activeId={arg.id} />

<main class="detail">
	<a class="back-link" href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/contra', { faithLang, apologetikSlug: slug })}>{labels.back}</a>

	<div class="detail-eyebrow">
		{labels.eyebrowPrefix}
		{String(arg.n).padStart(2, '0')} · {arg.short}
	</div>
	<h1>{arg.title}</h1>

	<section class="objection" aria-label="The objection">
		<h3>{labels.objectionTitle}</h3>
		<p class="steel">{arg.steel}</p>
		<blockquote class="quote"><q>{arg.quote}</q></blockquote>
		<div class="quote-by">— {arg.quoteBy}</div>
		<p class="pub"><span class="pub-prefix">{labels.plain}</span>{arg.pub}</p>
	</section>

	<div class="tabs" role="tablist" aria-label="Answer voices">
		{#each archIds as id (id)}
			{@const a = ARCHETYPES[id]}
			{@const isActive = id === activeId}
			{@const isPick = alexPicks.includes(id)}
			<a
				href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/contra/[argId]/[[archId]]', { faithLang, apologetikSlug: slug, argId: arg.id, archId: id })}
				role="tab"
				aria-selected={isActive}
				class="tab"
				class:active={isActive}
				class:has-pick={isPick}
				style:border-bottom-color={isActive ? a.colorHex : 'transparent'}
				onclick={(e) => {
					e.preventDefault();
					selectArch(id);
				}}
			>
				<span class="glyph" aria-hidden="true" style="background:{a.color};">{a.glyph}</span>
				<span>{a.name}</span>
				{#if isPick}
					<span class="alex-mark" aria-label={alexChoiceLabel}>
						<img
							class="alex-pfp"
							src="https://bocken.org/static/user/thumb/alexander.webp"
							alt=""
							loading="lazy"
							decoding="async"
							width="14"
							height="14"
						/>
						<span class="alex-label">{alexChoiceLabel}</span>
					</span>
				{/if}
			</a>
		{/each}
	</div>

	{#if arch && counter}
		<section
			class="answer-panel arch-{activeId}"
			style:--acc={acc}
			style:--acc-soft={accSoft}
			style="border-left-color: {acc}; background-image: linear-gradient(to right, {accSoft}, transparent 320px);"
			id="voice-{activeId}"
		>
			<header class="answer-author">
				<span class="glyph lg" aria-hidden="true" style="background:{arch.color};"
					>{arch.glyph}</span
				>
				<div>
					<div class="who">{arch.name}</div>
					<div class="sub">{arch.sub}</div>
					{#if arch.era !== '—'}
						<div class="era">{arch.era}</div>
					{/if}
				</div>
			</header>

			<h2 class="answer-lede">{counter.lede}</h2>
			<div class="answer-body">
				{#each counter.body as p, i (i)}
					<p>{p}</p>
				{/each}
			</div>

			{#if counter.cites.length > 0}
				<div class="cites">
					<span class="ct">{labels.citations}</span>
					{counter.cites.join(' · ')}
				</div>
			{/if}
		</section>
	{/if}

	{#if arg.related.length > 0}
		<section class="related" aria-label={labels.related}>
			<h3>{labels.related}</h3>
			<div class="related-list">
				{#each arg.related as rid (rid)}
					{@const r = data.args.find((x) => x.id === rid)}
					{#if r}
						<a class="related-item" href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/contra/[argId]', { faithLang, apologetikSlug: slug, argId: r.id })}>
							<span class="num">{String(r.n).padStart(2, '0')}</span>
							{r.title}
						</a>
					{/if}
				{/each}
			</div>
		</section>
	{/if}
</main>

<style>
	.detail {
		max-width: 820px;
		margin: 36px auto 0;
		padding: 0 24px 80px;
		font-family: var(--font-sans);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
		text-decoration: none;
		padding: 6px 12px;
		border-radius: var(--radius-pill);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		margin-bottom: 24px;
		transition:
			background var(--transition-fast),
			transform var(--transition-fast);
		cursor: pointer;
	}
	.back-link:hover {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}
	.back-link:active {
		transform: scale(0.95);
	}

	.detail-eyebrow {
		font-size: 0.76rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		margin-bottom: 14px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	.detail h1 {
		font-size: clamp(1.8rem, 3.6vw, 2.6rem);
		line-height: 1.12;
		margin: 0 0 22px;
		letter-spacing: -0.01em;
		text-align: left;
	}

	.objection {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 22px 24px;
		margin: 0 0 32px;
	}
	.objection h3 {
		font-size: 0.76rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		margin: 0 0 12px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	.objection .steel {
		font-size: 1.02rem;
		line-height: 1.6;
		margin: 0 0 16px;
		text-wrap: pretty;
	}
	.objection .quote {
		font-size: 1rem;
		line-height: 1.55;
		color: var(--color-text-secondary);
		border-left: 2px solid var(--color-border);
		padding: 4px 0 4px 14px;
		margin: 0 0 4px;
	}
	.objection .quote q::before {
		content: '\201C';
	}
	.objection .quote q::after {
		content: '\201D';
	}
	.objection .quote-by {
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
		padding-left: 14px;
		margin: 0 0 14px;
	}
	.objection .pub {
		font-size: 0.9rem;
		color: var(--color-text-tertiary);
		font-style: italic;
		border-top: 1px dashed var(--color-border);
		padding-top: 12px;
		margin: 12px 0 0;
	}
	.pub-prefix {
		display: block;
		margin-bottom: 6px;
		font-style: normal;
		font-size: 0.78rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}

	.tabs {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 28px;
		padding-bottom: 0;
	}
	.tab {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		background: transparent;
		border: 0;
		font-size: 0.92rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		text-decoration: none;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition:
			color var(--transition-fast),
			border-color var(--transition-fast);
		font-family: var(--font-sans);
	}
	.tab:visited {
		color: var(--color-text-secondary);
	}
	.tab:hover,
	.tab:focus-visible {
		color: var(--color-text-primary);
		text-decoration: none;
	}
	.tab.active,
	.tab.active:visited {
		color: var(--color-text-primary);
	}

	.alex-mark {
		position: absolute;
		top: -4px;
		right: -6px;
		z-index: 2;
		display: inline-flex;
		align-items: center;
		border-radius: var(--radius-pill);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		padding: 1px;
		box-shadow: var(--shadow-sm);
		pointer-events: none;
		transform: translateY(0);
		transition:
			padding var(--transition-normal),
			transform var(--transition-normal);
	}
	.alex-pfp {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		object-fit: cover;
		display: block;
		flex: none;
	}
	.alex-label {
		display: inline-block;
		white-space: nowrap;
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		max-width: 0;
		opacity: 0;
		margin-left: 0;
		overflow: hidden;
		color: var(--color-text-primary);
		transition:
			max-width var(--transition-normal),
			opacity var(--transition-fast),
			margin-left var(--transition-normal);
	}
	.tab.active.has-pick .alex-mark {
		padding: 1px 8px 1px 1px;
		transform: translateY(-8px);
	}
	.tab.active.has-pick .alex-label {
		max-width: 140px;
		opacity: 1;
		margin-left: 5px;
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
		width: 44px;
		height: 44px;
		font-size: 22px;
	}

	.answer-panel {
		--acc: var(--color-primary);
		--acc-soft: rgba(94, 129, 172, 0.12);
		border-left: 3px solid var(--acc);
		padding: 24px 26px;
		border-radius: 0 var(--radius-lg) var(--radius-lg) 0;
		margin-bottom: 28px;
	}
	.answer-author {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}
	.answer-author .who {
		font-size: 1.05rem;
		font-weight: 700;
		line-height: 1.1;
	}
	.answer-author .sub {
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
	}
	.answer-author .era {
		font-size: 0.76rem;
		color: var(--color-text-tertiary);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		margin-top: 2px;
	}

	.answer-lede {
		font-size: 1.18rem;
		line-height: 1.4;
		font-weight: 600;
		margin: 0 0 16px;
		max-width: 56ch;
		text-wrap: pretty;
		letter-spacing: -0.005em;
		text-align: left;
	}
	.answer-body {
		font-size: 1rem;
		line-height: 1.65;
		max-width: 60ch;
	}
	.answer-body p {
		margin: 0 0 14px;
		text-wrap: pretty;
	}
	.answer-body p:last-child {
		margin-bottom: 0;
	}

	.cites {
		margin-top: 18px;
		padding-top: 14px;
		border-top: 1px dashed var(--color-border);
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
	}
	.cites .ct {
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-size: 0.68rem;
		margin-right: 8px;
	}

	.arch-logician,
	.arch-scientist,
	.arch-pascal {
		font-family: 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace;
	}
	.arch-aquinas,
	.arch-augustine,
	.arch-mystic {
		font-family: 'Cormorant Garamond', Georgia, serif;
	}
	.arch-francis,
	.arch-lewis {
		font-family: 'Spectral', 'Lora', Georgia, serif;
	}
	.arch-chesterton {
		font-family: 'Inter', Helvetica, Arial, sans-serif;
	}
	.arch-augustine .answer-lede,
	.arch-augustine .answer-body {
		font-style: italic;
	}

	.related {
		margin: 38px 0 0;
		padding-top: 22px;
		border-top: 1px solid var(--color-border);
	}
	.related h3 {
		font-size: 0.76rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		margin: 0 0 14px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		text-align: left;
	}
	.related-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 10px;
	}
	.related-item {
		display: block;
		padding: 12px 14px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
		text-decoration: none;
		color: var(--color-text-primary);
		font-size: 0.92rem;
		line-height: 1.35;
		transition:
			transform var(--transition-fast),
			background var(--transition-normal);
		cursor: pointer;
	}
	.related-item:hover {
		background: var(--color-bg-tertiary);
		transform: scale(1.01);
	}
	.related-item .num {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 0.76rem;
		color: var(--color-text-tertiary);
		margin-right: 8px;
	}

	@media (max-width: 640px) {
		.detail h1 {
			font-size: 1.6rem;
		}
		.objection {
			padding: 18px 16px;
		}
		.answer-panel {
			padding: 18px 18px;
		}
		.tab {
			padding: 8px 10px;
			font-size: 0.85rem;
		}
	}
</style>
