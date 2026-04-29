<script lang="ts">
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';

	let { data } = $props();
	const faithLang = $derived(data?.faithLang ?? 'faith');
	const slug = $derived(faithLang === 'faith' ? 'apologetics' : 'apologetik');
	const isLatin = $derived(data?.lang === 'la');
	const isGerman = $derived(data?.lang === 'de');
	const arg = $derived(data.argument);
	const POS_VOICES = $derived(data.voices);
	const POS_LAYERS = $derived(data.layers);
	const POS_ARGUMENTS = $derived(data.args);
	const layer = $derived(POS_LAYERS.find((l) => l.id === arg.layer));

	const layerLabels = $derived(
		isLatin
			? { natural: 'Supernaturale', theism: 'Theismus', christianity: 'Christianitas' }
			: isGerman
				? { natural: 'Übernatürlich', theism: 'Theismus', christianity: 'Christentum' }
				: { natural: 'Supernatural', theism: 'Theism', christianity: 'Christianity' }
	);
	const tocLabel = $derived(
		isLatin ? 'Argumenta' : isGerman ? 'Belege' : 'Evidences'
	);
	const tocItems = $derived(
		POS_ARGUMENTS.map((a) => ({
			id: a.id,
			n: a.n,
			short: a.title,
			title: a.title,
			href: `/${faithLang}/${slug}/pro/${a.id}`,
			group: layerLabels[a.layer]
		}))
	);

	const voiceIds = $derived(Object.keys(arg.voices));
	let selectedByArg = $state<Record<string, string>>({});
	const activeId = $derived.by(() => {
		const sel = selectedByArg[arg.id];
		if (sel && voiceIds.includes(sel)) return sel;
		if (data.initialVoiceId && voiceIds.includes(data.initialVoiceId)) return data.initialVoiceId;
		return voiceIds[0] ?? '';
	});
	const voice = $derived(POS_VOICES[activeId]);
	const counter = $derived(arg.voices[activeId]);

	const labels = $derived(
		isLatin
			? {
					back: '← Ad omnia argumenta pro',
					eyebrow: 'Evidentia',
					claimTitle: 'Argumentum',
					strengthLabel: 'Pondus',
					citations: 'Citationes',
					related: 'Argumenta connexa'
				}
			: isGerman
				? {
						back: '← Alle positiven Argumente',
						eyebrow: 'Beleg',
						claimTitle: 'Der Anspruch',
						strengthLabel: 'Beweisgewicht',
						citations: 'Quellen',
						related: 'Verwandte Belege'
					}
				: {
						back: '← All positive arguments',
						eyebrow: 'Evidence',
						claimTitle: 'The claim',
						strengthLabel: 'Evidential weight',
						citations: 'Citations',
						related: 'Related evidences'
					}
	);

	const acc = $derived(voice?.colorHex ?? '#5E81AC');
	const accSoft = $derived(voice ? hexToRgba(voice.colorHex, 0.14) : 'rgba(94,129,172,0.14)');

	function hexToRgba(hex: string, alpha: number): string {
		const h = hex.replace('#', '');
		const r = parseInt(h.slice(0, 2), 16);
		const g = parseInt(h.slice(2, 4), 16);
		const b = parseInt(h.slice(4, 6), 16);
		return `rgba(${r},${g},${b},${alpha})`;
	}

	function selectVoice(id: string) {
		selectedByArg = { ...selectedByArg, [arg.id]: id };
		if (typeof window !== 'undefined') {
			history.replaceState(null, '', `/${faithLang}/${slug}/pro/${arg.id}/${id}`);
		}
	}
</script>

<svelte:head>
	<title>{arg.title} · {isLatin ? 'Argumenta pro' : isGerman ? 'Positives' : 'Positive case'} · bocken.org</title>
	<meta name="description" content={arg.claim} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Spectral:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap"
	/>
</svelte:head>

<ApologetikToc title={tocLabel} items={tocItems} activeId={arg.id} />

<main class="detail">
	<a class="back-link" href="/{faithLang}/{slug}/pro">{labels.back}</a>

	{#if layer}
		<div class="layer-tag">{layer.sub}</div>
	{/if}
	<div class="detail-eyebrow">{labels.eyebrow} {String(arg.n).padStart(2, '0')}</div>
	<h1>{arg.title}</h1>

	<section class="claim-block">
		<h3>{labels.claimTitle}</h3>
		<p class="claim-text">{arg.claim}</p>
		<p class="thesis-text">{arg.thesis}</p>
		{#if arg.note}
			<div class="pos-note">{arg.note}</div>
		{/if}
	</section>

	<div class="strength-row">
		<span>{labels.strengthLabel}</span>
		<span class="strength-bar" aria-label="{arg.strength} of 5">
			{#each [1, 2, 3, 4, 5] as i (i)}
				<span class="pip" class:on={i <= arg.strength}></span>
			{/each}
		</span>
	</div>

	<aside class="scripture">
		<p class="verse">"{arg.scripture.text}"</p>
		<div class="ref">{arg.scripture.ref}</div>
	</aside>

	<div class="tabs" role="tablist" aria-label="Voices">
		{#each voiceIds as id (id)}
			{@const v = POS_VOICES[id]}
			{@const isActive = id === activeId}
			<a
				href="/{faithLang}/{slug}/pro/{arg.id}/{id}"
				role="tab"
				aria-selected={isActive}
				class="tab"
				class:active={isActive}
				style:border-bottom-color={isActive ? v.colorHex : 'transparent'}
				onclick={(e) => {
					e.preventDefault();
					selectVoice(id);
				}}
			>
				<span class="glyph" aria-hidden="true" style="background:{v.color};">{v.glyph}</span>
				<span>{v.name}</span>
			</a>
		{/each}
	</div>

	{#if voice && counter}
		<section
			class="answer-panel"
			style:--acc={acc}
			style:--acc-soft={accSoft}
			style="border-left-color: {acc}; background-image: linear-gradient(to right, {accSoft}, transparent 320px);"
			id="voice-{activeId}"
		>
			<header class="answer-author">
				<span class="glyph lg" aria-hidden="true" style="background:{voice.color};"
					>{voice.glyph}</span
				>
				<div>
					<div class="who">{voice.name}</div>
					<div class="sub">{voice.sub}</div>
					{#if voice.era !== '—'}
						<div class="era">{voice.era}</div>
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
					{@const r = POS_ARGUMENTS.find((x) => x.id === rid)}
					{#if r}
						<a class="related-item" href="/{faithLang}/{slug}/pro/{r.id}">
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

	.layer-tag {
		display: inline-block;
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		padding: 4px 12px;
		border-radius: var(--radius-pill);
		margin-bottom: 12px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
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

	.claim-block {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 22px 24px;
		margin: 0 0 28px;
	}
	.claim-block h3 {
		font-size: 0.76rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		margin: 0 0 12px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		text-align: left;
	}
	.claim-text {
		font-size: 1.05rem;
		line-height: 1.55;
		margin: 0 0 14px;
		text-wrap: pretty;
	}
	.thesis-text {
		font-size: 0.98rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		margin: 0;
		text-wrap: pretty;
	}
	.pos-note {
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
		font-style: italic;
		margin: 14px 0 0;
		padding: 8px 12px;
		background: var(--color-bg-tertiary);
		border-left: 2px solid var(--color-border);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	.strength-row {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 0 0 18px;
		font-size: 0.78rem;
		color: var(--color-text-tertiary);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	.strength-bar {
		display: inline-flex;
		gap: 3px;
	}
	.strength-bar .pip {
		width: 18px;
		height: 6px;
		border-radius: 2px;
		background: var(--color-border);
	}
	.strength-bar .pip.on {
		background: var(--color-text-primary);
	}

	.scripture {
		margin: 18px 0 28px;
		padding: 16px 20px;
		border-left: 3px solid var(--color-text-primary);
		background: var(--color-bg-secondary);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		max-width: 60ch;
	}
	.scripture .verse {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: 1.18rem;
		line-height: 1.4;
		font-style: italic;
		margin: 0 0 6px;
		color: var(--color-text-primary);
		text-wrap: pretty;
	}
	.scripture .ref {
		font-size: 0.78rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}

	.tabs {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 28px;
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
		.claim-block {
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
