<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { POS_LAYER_COLORS, type PosArgument } from '$lib/data/apologetik';
	import CaseTabs from '$lib/components/faith/CaseTabs.svelte';
	import ApologetikToc from '$lib/components/faith/ApologetikToc.svelte';

	import { m, type FaithLang } from '$lib/js/faithI18n';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();
	const faithLang = $derived(data?.faithLang ?? 'faith');
	const slug = $derived(faithLang === 'faith' ? 'apologetics' : 'apologetik');
	const lang = $derived((data?.lang ?? 'en') as FaithLang);
	const t = $derived(m[lang]);
	const isLatin = $derived(lang === 'la');
	const isGerman = $derived(lang === 'de');

	const POS_VOICES = $derived(data.voices);
	const POS_LAYERS = $derived(data.layers);
	const POS_ARGUMENTS = $derived(data.args);

	let activeId = $state<string>('');

	onMount(() => {
		const els = document.querySelectorAll<HTMLElement>('.pos-row');
		if (!els.length) return;
		const io = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (visible[0]) {
					activeId = visible[0].target.id.replace(/^pos-/, '');
				}
			},
			{ rootMargin: '-64px 0px -60% 0px', threshold: 0 }
		);
		els.forEach((el) => io.observe(el));
		return () => io.disconnect();
	});

	function jumpTo(e: MouseEvent, id: string) {
		const el = document.getElementById(`pos-${id}`);
		if (!el) return;
		e.preventDefault();
		el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		history.replaceState(null, '', `#pos-${id}`);
	}

	const labels = $derived(
		isLatin
			? {
					heading: 'Cur Christianitas vera est.',
					lede: 'Duodecim fila. Naturalia, theistica, christiana.',
					evidenceLabel: 'EVIDENTIA',
					articulatedBy: 'Articulatum a',
					strengthLabel: 'Pondus',
					cumulativeTitle: 'Cumulus argumentorum',
					cumulativeSub: 'Filum unum infirmum est. Tot fila, funis fortis.',
					layerLabels: { natural: 'Supernaturale', theism: 'Theismus', christianity: 'Christianitas' },
					convergeLabel: 'Christianitas',
					convergeSub: 'vera est.'
				}
			: isGerman
				? {
						heading: 'Warum das Christentum wahr ist.',
						lede: 'Zwölf Fäden. Vier zur übernatürlichen Wirklichkeit, vier zum einen Gott, vier zum besonderen Anspruch des Christentums.',
						evidenceLabel: 'BELEG',
						articulatedBy: 'Vorgetragen von',
						strengthLabel: 'Beweisgewicht',
						cumulativeTitle: 'Kumulativer Fall',
						cumulativeSub:
							'Kein einzelnes Argument zwingt. Zusammen aber laufen sie zusammen — ein Strang aus unabhängigen Fäden, jeder allein schwach, im Bündel stark.',
						layerLabels: { natural: 'Übernatürlich', theism: 'Theismus', christianity: 'Christentum' },
						convergeLabel: 'Christentum',
						convergeSub: 'ist wahr.'
					}
				: {
						heading: 'Why Christianity is true.',
						lede: 'Twelve threads. The first four argue that the supernatural is not an embarrassment but a stable fact of human experience. The next four argue that the supernatural is best described as one personal God. The last four argue that this God has spoken, in Israel and in Christ.',
						evidenceLabel: 'EVIDENCE',
						articulatedBy: 'Articulated by',
						strengthLabel: 'Evidential weight',
						cumulativeTitle: 'Cumulative case',
						cumulativeSub:
							'No single argument compels. Together they converge — a rope of independent threads, each weak alone, strong as a bundle. Hover any thread to read its claim.',
						layerLabels: {
							natural: 'Supernatural',
							theism: 'Theism',
							christianity: 'Christianity'
						},
						convergeLabel: 'Christianity',
						convergeSub: 'is true.'
					}
	);

	function byLayer(lid: string): PosArgument[] {
		return POS_ARGUMENTS.filter((a) => a.layer === lid);
	}

	const W = 820;
	const H = 320;
	const targetX = W - 200;
	const targetY = H / 2;
	const bands: Record<string, [number, number]> = {
		natural: [25, 105],
		theism: [120, 200],
		christianity: [215, 295]
	};

	type Item = PosArgument & { y: number };
	const cumulativeItems = $derived.by<Item[]>(() =>
		POS_ARGUMENTS.map((a) => {
			const [y0, y1] = bands[a.layer];
			const inLayer = POS_ARGUMENTS.filter((x) => x.layer === a.layer);
			const idx = inLayer.findIndex((x) => x.id === a.id);
			const y = y0 + (y1 - y0) * ((idx + 0.5) / inLayer.length);
			return { ...a, y };
		})
	);

	const tocItems = $derived(
		POS_ARGUMENTS.map((a) => {
			const layer = POS_LAYERS.find((l) => l.id === a.layer);
			return {
				id: a.id,
				n: a.n,
				short: a.title,
				title: a.title,
				href: `#pos-${a.id}`,
				group: labels.layerLabels[a.layer]
			};
		})
	);
	const tocLabel = $derived(
		t.evidences
	);
</script>

<Seo
	title={`${labels.heading} · bocken.org`}
	description={labels.lede}
	lang={lang}
/>
<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Spectral:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap"
	/>
</svelte:head>

<div class="positive">
	<ApologetikToc
		title={tocLabel}
		items={tocItems}
		{activeId}
		onItemClick={(e, id) => jumpTo(e, id)}
	/>

	<CaseTabs {faithLang} active="pro" />

	<section class="pos-head">
		<h1>{labels.heading}</h1>
		<p class="lede">{labels.lede}</p>
	</section>

	<section class="cumulative" aria-label={labels.cumulativeTitle}>
		<div class="cumulative-title">{labels.cumulativeTitle}</div>
		<p class="cumulative-sub">{labels.cumulativeSub}</p>
		<svg
			class="cum-svg"
			viewBox="0 0 {W} {H}"
			role="img"
			aria-label={labels.cumulativeTitle}
		>
			{#each cumulativeItems as it (it.id)}
				{@const stroke = POS_LAYER_COLORS[it.layer]}
				{@const opacity = 0.25 + (it.strength / 5) * 0.55}
				{@const sw = 1.6 + it.strength * 1.0}
				<a href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/pro/[posArgId]', { faithLang, apologetikSlug: slug, posArgId: it.id })} aria-label={it.title}>
					<path
						d="M 38 {it.y} C {W * 0.45} {it.y}, {W * 0.55} {targetY}, {targetX} {targetY}"
						fill="none"
						stroke={stroke}
						stroke-width={sw}
						stroke-linecap="round"
						{opacity}
					>
						<title>{String(it.n).padStart(2, '0')} — {it.title}</title>
					</path>
					<circle cx="38" cy={it.y} r="5" fill={stroke} />
					<text
						x="26"
						y={it.y + 4}
						font-size="12"
						text-anchor="end"
						fill="var(--color-text-secondary)"
						font-family="ui-monospace, Menlo, monospace"
					>
						{String(it.n).padStart(2, '0')}
					</text>
				</a>
			{/each}
			<circle
				class="pulse pulse-1"
				cx={targetX}
				cy={targetY}
				r="18"
				fill="none"
				stroke="var(--color-text-primary)"
			/>
			<circle
				class="pulse pulse-2"
				cx={targetX}
				cy={targetY}
				r="18"
				fill="none"
				stroke="var(--color-text-primary)"
			/>
			<circle cx={targetX} cy={targetY} r="18" fill="var(--color-text-primary)" />
			<text
				x={targetX + 56}
				y={targetY - 4}
				font-size="17"
				font-weight="700"
				fill="var(--color-text-primary)">{labels.convergeLabel}</text
			>
			<text x={targetX + 56} y={targetY + 16} font-size="13" fill="var(--color-text-secondary)"
				>{labels.convergeSub}</text
			>
		</svg>
		<div class="cum-legend">
			<span class="cum-legend-item"
				><span class="dot" style="background:{POS_LAYER_COLORS.natural};"></span
				>{labels.layerLabels.natural}</span
			>
			<span class="cum-legend-item"
				><span class="dot" style="background:{POS_LAYER_COLORS.theism};"></span
				>{labels.layerLabels.theism}</span
			>
			<span class="cum-legend-item"
				><span class="dot" style="background:{POS_LAYER_COLORS.christianity};"></span
				>{labels.layerLabels.christianity}</span
			>
		</div>
	</section>

	{#each POS_LAYERS as layer (layer.id)}
		<section class="layer-section">
			<div class="layer-head">
				<span class="layer-num">{layer.sub}</span>
			</div>
			<h2 class="layer-title">{layer.title}</h2>

			{#each byLayer(layer.id) as arg (arg.id)}
				<article class="pos-row" id="pos-{arg.id}">
					<a
						class="card-link"
						href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/pro/[posArgId]', { faithLang, apologetikSlug: slug, posArgId: arg.id })}
						aria-label={arg.title}
					></a>
					<div class="pos-num">
						{String(arg.n).padStart(2, '0')}
						<small>{labels.evidenceLabel}</small>
					</div>
					<div class="pos-body">
						<h3>{arg.title}</h3>
						<p class="pos-claim">{arg.claim}</p>
						{#if arg.note}
							<div class="pos-note">{arg.note}</div>
						{/if}
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
						<p class="pos-thesis">{arg.thesis}</p>

						<div class="answer-rail">
							<span class="label">{labels.articulatedBy}</span>
							{#each Object.keys(arg.voices) as vid (vid)}
								{@const v = POS_VOICES[vid]}
								<a
									class="archetype-badge"
									href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/pro/[posArgId]/[[voiceId]]', { faithLang, apologetikSlug: slug, posArgId: arg.id, voiceId: vid })}
									title="{v.name} — {v.sub}"
								>
									<span class="glyph" aria-hidden="true" style="background:{v.color};"
										>{v.glyph}</span
									>
									<span>{v.name}</span>
								</a>
							{/each}
						</div>
					</div>
				</article>
			{/each}
		</section>
	{/each}
</div>

<style>
	.positive {
		min-height: 100vh;
		padding-bottom: 80px;
		font-family: var(--font-sans);
	}

	.pos-head {
		max-width: 760px;
		margin: 36px auto 0;
		padding: 0 24px;
	}
	.pos-head h1 {
		font-size: clamp(2rem, 4.4vw, 3.2rem);
		line-height: 1.08;
		font-weight: 700;
		margin: 0 0 18px;
		letter-spacing: -0.01em;
		text-align: left;
	}
	.pos-head .lede {
		font-size: 1.12rem;
		line-height: 1.55;
		color: var(--color-text-secondary);
		max-width: 60ch;
		font-family: 'Spectral', 'Lora', Georgia, serif;
		font-style: italic;
		margin: 0;
	}

	.cumulative {
		max-width: 760px;
		margin: 38px auto 0;
		padding: 24px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-bg-secondary);
	}
	.cumulative-title {
		font-size: 0.76rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		margin: 0 0 6px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	.cumulative-sub {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
		margin: 0 0 18px;
		max-width: 56ch;
	}
	.cum-svg {
		width: 100%;
		height: auto;
		display: block;
		overflow: visible;
	}
	@keyframes pulse-out {
		0% {
			r: 18;
			opacity: 0.55;
			stroke-width: 1.2;
		}
		100% {
			r: 64;
			opacity: 0;
			stroke-width: 0.3;
		}
	}
	.pulse {
		animation: pulse-out 4.8s ease-out infinite both;
	}
	.pulse-2 {
		animation-delay: 2.4s;
	}
	@media (prefers-reduced-motion: reduce) {
		.pulse {
			animation: none;
			r: 28;
			opacity: 0.4;
			stroke-width: 0.8;
		}
		.pulse-2 {
			r: 42;
			opacity: 0.2;
			stroke-width: 0.5;
		}
	}
	.cum-svg a {
		cursor: pointer;
	}
	.cum-svg a:hover path {
		opacity: 1 !important;
	}
	.cum-legend {
		display: flex;
		gap: 16px;
		flex-wrap: wrap;
		margin-top: 12px;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
	}
	.cum-legend-item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.cum-legend-item .dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.layer-section {
		max-width: 760px;
		margin: 48px auto 0;
		padding: 0 24px;
	}
	.layer-head {
		display: flex;
		align-items: baseline;
		gap: 14px;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 10px;
		margin-bottom: 8px;
	}
	.layer-num {
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.78rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}
	.layer-title {
		font-size: 1.6rem;
		font-weight: 700;
		margin: 14px 0 4px;
		letter-spacing: -0.005em;
		text-align: left;
	}

	.pos-row {
		position: relative;
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: 22px;
		padding: 30px 18px;
		margin: 0 -18px;
		border-bottom: 1px solid var(--color-border);
		align-items: start;
		border-radius: var(--radius-md);
		transition: background var(--transition-fast);
		scroll-margin-top: 4rem;
	}
	.pos-row:hover {
		background: color-mix(in oklab, var(--color-bg-secondary) 60%, transparent);
	}
	.pos-row:has(.card-link:focus-visible) {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.pos-row:has(.card-link:hover) h3 {
		color: var(--color-primary);
	}
	.pos-row:last-child {
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
	.pos-row > .pos-num,
	.pos-row > .pos-body {
		position: relative;
		z-index: 1;
		pointer-events: none;
	}
	.pos-body h3 {
		transition: color var(--transition-fast);
	}
	.archetype-badge {
		pointer-events: auto;
	}
	.pos-num {
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 2.2rem;
		font-weight: 300;
		line-height: 1;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
	.pos-num small {
		display: block;
		font-size: 0.65rem;
		letter-spacing: 0.14em;
		margin-top: 4px;
		color: var(--color-text-tertiary);
	}

	.pos-body h3 {
		font-size: 1.45rem;
		line-height: 1.18;
		font-weight: 700;
		margin: 0 0 14px;
		letter-spacing: -0.005em;
		text-align: left;
	}
	.pos-claim {
		font-size: 1rem;
		line-height: 1.6;
		margin: 0 0 16px;
		color: var(--color-text-primary);
		max-width: 60ch;
		text-wrap: pretty;
	}
	.pos-thesis {
		font-size: 0.95rem;
		line-height: 1.6;
		margin: 0 0 20px;
		color: var(--color-text-secondary);
		max-width: 60ch;
		text-wrap: pretty;
	}
	.pos-note {
		font-size: 0.82rem;
		color: var(--color-text-tertiary);
		font-style: italic;
		margin: -10px 0 18px;
		max-width: 60ch;
		padding: 8px 12px;
		background: var(--color-bg-secondary);
		border-left: 2px solid var(--color-border);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	.scripture {
		margin: 18px 0;
		padding: 16px 20px;
		border-left: 3px solid var(--color-text-primary);
		background: var(--color-bg-secondary);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		max-width: 56ch;
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

	.strength-row {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 4px 0 18px;
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

	.answer-rail {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		margin-top: 14px;
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
	.archetype-badge .glyph {
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

	@media (max-width: 640px) {
		.pos-row {
			grid-template-columns: 40px 1fr;
			gap: 14px;
			padding: 24px 0;
		}
		.pos-num {
			font-size: 1.6rem;
		}
		.pos-body h3 {
			font-size: 1.18rem;
		}
		.pos-head h1 {
			font-size: 2rem;
		}
		.layer-title {
			font-size: 1.3rem;
		}
	}
</style>
