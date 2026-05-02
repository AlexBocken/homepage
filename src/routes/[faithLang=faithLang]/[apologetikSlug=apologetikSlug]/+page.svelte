<script lang="ts">
	import { resolve } from '$app/paths';
	import Shield from '@lucide/svelte/icons/shield';
	import Flame from '@lucide/svelte/icons/flame';
	import Seo from '$lib/components/Seo.svelte';

	let { data } = $props();
	const faithLang = $derived(data?.faithLang ?? 'faith');
	const slug = $derived(faithLang === 'faith' ? 'apologetics' : 'apologetik');
	const isGerman = $derived(data?.lang === 'de');

	const t = $derived(
		isGerman

			? {
					title: 'Apologetik',
					lede:
						'Apologetik hat zwei Seiten. Die eine antwortet auf Einwände gegen den Glauben. Die andere trägt die Gründe für ihn vor. Hier sind beide — getrennt vorgelegt, doch im selben Werk.',
					contraTitle: 'Contra',
					contraSub: 'Was, wenn nicht?',
					contraDesc:
						'Dreiundzwanzig Einwände, wie sie ein Atheist erheben mag, je in mehreren Stimmen beantwortet — historische Gestalten (Aquin, Pascal, Augustinus, Lewis, Chesterton) und Archetypen (der Logiker, der Mystiker, die Wissenschaft, der Pfarrer).',
					contraCta: 'Zu den Einwänden',
					proTitle: 'Pro',
					proSub: 'Warum es so ist.',
					proDesc:
						'Zwölf Fäden in drei Schichten: das Übernatürliche ist wirklich, es gibt einen Gott, das Christentum ist seine Offenbarung. Stimmen: Habermas, Polkinghorne, Newman, Hart, Lewis, Wright, Hahn, Plantinga.',
					proCta: 'Zu den Argumenten'
				}
			: {
					title: 'Apologetics',
					lede:
						'Apologetics has two arms. One answers objections raised against the faith. The other lays out the case for it. Both are kept here — distinct, but part of one work.',
					contraTitle: 'Contra',
					contraSub: 'What if not?',
					contraDesc:
						'Twenty-three objections an atheist might raise, each answered in several voices — historical figures (Aquinas, Pascal, Augustine, Lewis, Chesterton) alongside archetypes (the Logician, the Mystic, the Scientist, the Pastor).',
					contraCta: 'To the objections',
					proTitle: 'Pro',
					proSub: 'Why it is so.',
					proDesc:
						'Twelve threads across three layers: the supernatural is real, there is one God, Christianity is that revelation. Voices: Habermas, Polkinghorne, Newman, Hart, Lewis, Wright, Hahn, Plantinga.',
					proCta: 'To the arguments'
				}
	);
</script>

<Seo
	title={`${t.title} · bocken.org`}
	description={t.lede}
	lang={isGerman ? 'de' : 'en'}
/>

<div class="apologetik-landing">
	<section class="page-head">
		<h1>{t.title}</h1>
		<p class="lede">{t.lede}</p>
	</section>

	<section class="cards" aria-label={t.title}>
		<a class="case-card contra" href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/contra', { faithLang, apologetikSlug: slug })}>
			<div class="card-glyph" aria-hidden="true"><Shield size={28} strokeWidth={2} /></div>
			<div class="card-body">
				<div class="card-sub">{t.contraSub}</div>
				<h2>{t.contraTitle}</h2>
				<p>{t.contraDesc}</p>
				<span class="card-cta">{t.contraCta} <span aria-hidden="true">→</span></span>
			</div>
		</a>

		<a class="case-card pro" href={resolve('/[faithLang=faithLang]/[apologetikSlug=apologetikSlug]/pro', { faithLang, apologetikSlug: slug })}>
			<div class="card-glyph" aria-hidden="true"><Flame size={28} strokeWidth={2} /></div>
			<div class="card-body">
				<div class="card-sub">{t.proSub}</div>
				<h2>{t.proTitle}</h2>
				<p>{t.proDesc}</p>
				<span class="card-cta">{t.proCta} <span aria-hidden="true">→</span></span>
			</div>
		</a>
	</section>
</div>

<style>
	.apologetik-landing {
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

	.cards {
		max-width: 1100px;
		margin: 48px auto 0;
		padding: 0 24px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
	}

	.case-card {
		display: grid;
		grid-template-columns: 64px 1fr;
		gap: 20px;
		align-items: start;
		padding: 28px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: var(--color-text-primary);
		transition:
			transform var(--transition-fast),
			box-shadow var(--transition-normal),
			background var(--transition-normal),
			border-color var(--transition-normal);
		position: relative;
		overflow: hidden;
	}
	.case-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		opacity: 0;
		transition: opacity var(--transition-normal);
	}
	.case-card.contra::before {
		background: linear-gradient(135deg, color-mix(in oklab, var(--nord11) 8%, transparent), transparent 60%);
	}
	.case-card.pro::before {
		background: linear-gradient(135deg, color-mix(in oklab, var(--nord14) 8%, transparent), transparent 60%);
	}
	.case-card:hover,
	.case-card:focus-visible {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		background: var(--color-bg-elevated);
		outline: none;
	}
	.case-card:hover::before,
	.case-card:focus-visible::before {
		opacity: 1;
	}

	.card-glyph {
		width: 56px;
		height: 56px;
		border-radius: var(--radius-pill);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.6rem;
		color: white;
		flex: none;
	}
	.contra .card-glyph {
		background: var(--nord11);
	}
	.pro .card-glyph {
		background: var(--nord14);
	}

	.card-body {
		min-width: 0;
	}
	.card-sub {
		font-size: 0.72rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		margin-bottom: 6px;
	}
	.case-card h2 {
		font-size: 1.5rem;
		line-height: 1.18;
		font-weight: 700;
		margin: 0 0 10px;
		letter-spacing: -0.005em;
	}
	.case-card p {
		font-size: 0.98rem;
		line-height: 1.55;
		color: var(--color-text-secondary);
		margin: 0 0 18px;
		text-wrap: pretty;
	}
	.card-cta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--color-text-primary);
		transition: gap var(--transition-fast);
	}
	.case-card:hover .card-cta {
		gap: 10px;
	}

	@media (max-width: 720px) {
		.cards {
			grid-template-columns: 1fr;
			gap: 16px;
		}
		.case-card {
			padding: 22px;
			grid-template-columns: 48px 1fr;
			gap: 16px;
		}
		.card-glyph {
			width: 44px;
			height: 44px;
			font-size: 1.3rem;
		}
		.case-card h2 {
			font-size: 1.25rem;
		}
		.page-head h1 {
			font-size: 2rem;
		}
	}
</style>
