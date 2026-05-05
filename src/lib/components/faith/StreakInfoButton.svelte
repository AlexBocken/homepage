<script lang="ts">
	import Info from '@lucide/svelte/icons/info';
	import X from '@lucide/svelte/icons/x';
	import type { FaithLang } from '$lib/js/faithI18n';

	let { lang = 'de' }: { lang?: FaithLang } = $props();

	let open = $state(false);

	function close() { open = false; }
	function onKeydown(e: KeyboardEvent) {
		if (open && e.key === 'Escape') close();
	}

	const labels = $derived(
		lang === 'en'
			? { trigger: 'About this counter', close: 'Close', title: 'About this counter' }
			: lang === 'la'
				? { trigger: 'De numero hoc', close: 'Claudere', title: 'De numero hoc' }
				: { trigger: 'Über diese Zählung', close: 'Schliessen', title: 'Über diese Zählung' }
	);
</script>

<svelte:window onkeydown={onKeydown} />

<button
	class="info-btn"
	type="button"
	onclick={() => open = true}
	aria-label={labels.trigger}
	title={labels.trigger}
>
	<Info size={14} strokeWidth={2} />
</button>

{#if open}
	<div class="info-backdrop" onclick={close} role="presentation">
		<div
			class="info-dialog"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="streak-info-title"
			tabindex="-1"
		>
			<button class="info-close" type="button" onclick={close} aria-label={labels.close}>
				<X size={16} strokeWidth={2} />
			</button>
			<h3 id="streak-info-title" class="info-title">{labels.title}</h3>
			{#if lang === 'en'}
				<p>
					This counter tracks <em>consistency</em>, not piety. The Church proposes regular rhythms of prayer (<abbr title="Catechism of the Catholic Church">CCC</abbr> 2698) — we are creatures of body and spirit (CCC 2702), and habit forms us. On weary days the count can be a small nudge to keep faithful to that routine.
				</p>
				<p>
					But the number itself is empty. Christ warns: <q>In praying do not heap up empty phrases as the Gentiles do; for they think that they will be heard for their many words</q> (Mt 6:7). What matters is <q>that the heart should be present to him to whom we are speaking</q> (CCC 2700). One prayer prayed with attention is worth more than thirty rushed to keep a count alive. And clinging to the streak as proof of one's piety only opens the door to the wounded pride the Catechism warns of (CCC 2728).
				</p>
			{:else if lang === 'la'}
				<p>
					Numerus iste <em>constantiam</em> metitur, non pietatem. Ecclesia rhythmos cotidianos orationis commendat (<abbr title="Catechismus Catholicae Ecclesiae">CCC</abbr> 2698) — homo enim corpus et spiritus est (CCC 2702), atque consuetudine formamur. Diebus laboriosis numerus parvulum incitamentum esse potest, ut consuetudini fideles maneamus.
				</p>
				<p>
					Numerus tamen ipse vacuus est. Christus monet: <q>Orantes nolite multum loqui, sicut ethnici; putant enim quod in multiloquio suo exaudiantur</q> (Mt 6,7). Quod refert est ut <q>cor adsit Ei cui loquimur</q> (CCC 2700). Una oratio attente fusa pluris est quam triginta praecipitanter recitatae ut numerus servetur. Qui autem numerum tenet ut testimonium pietatis suae, ostium aperit superbiae læsæ, quam Catechismus monet (CCC 2728).
				</p>
			{:else}
				<p>
					Diese Zählung misst <em>Beständigkeit</em>, nicht Frömmigkeit. Die Kirche empfiehlt regelmässige Gebetsrhythmen (<abbr title="Katechismus der Katholischen Kirche">KKK</abbr> 2698) — der Mensch ist Leib und Geist (KKK 2702), und Gewohnheit formt uns. An müden Tagen kann die Zahl ein kleiner Anstoss sein, in der Routine zu bleiben.
				</p>
				<p>
					Die Zahl selbst aber ist leer. Christus mahnt: <q>Plappert nicht wie die Heiden, die meinen, sie würden nur erhört, wenn sie viele Worte machen</q> (Mt 6,7). Worauf es ankommt, ist, <q>dass das Herz dem zugewandt ist, zu dem es spricht</q> (KKK 2700). Ein einziges aufmerksam gebetetes Gebet ist mehr wert als dreissig hastig durchgeleierte, nur um den Zähler zu retten. Und wer am Streak als Beweis seiner Frömmigkeit festhält, öffnet die Tür zum verletzten Stolz, vor dem der Katechismus warnt (KKK 2728).
				</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Tiny info pip in the corner — opens a modal that explains the
	   streak counter is about habit, not piety. The parent container
	   must be position: relative for this to anchor correctly. */
	.info-btn {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		display: grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--color-text-secondary, var(--nord4));
		cursor: pointer;
		opacity: 0.55;
		transition: opacity 150ms, background 150ms;
		z-index: 5;
	}
	.info-btn:hover,
	.info-btn:focus-visible {
		opacity: 1;
		background: rgba(255, 255, 255, 0.08);
	}
	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme="dark"])) .info-btn:hover,
		:global(:root:not([data-theme="dark"])) .info-btn:focus-visible {
			background: rgba(0, 0, 0, 0.06);
		}
	}
	:global(:root[data-theme="light"]) .info-btn:hover,
	:global(:root[data-theme="light"]) .info-btn:focus-visible {
		background: rgba(0, 0, 0, 0.06);
	}

	.info-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		animation: streak-info-fade 150ms ease-out;
	}
	.info-dialog {
		position: relative;
		background: var(--color-surface, var(--nord1));
		border: 1px solid var(--color-border, var(--nord3));
		border-radius: 14px;
		padding: 1.5rem 1.5rem 1.25rem;
		max-width: 560px;
		width: 100%;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
		animation: streak-info-scale 150ms ease-out;
		color: var(--color-text-primary, var(--nord6));
	}
	.info-close {
		position: absolute;
		top: 0.55rem;
		right: 0.55rem;
		display: grid;
		place-items: center;
		width: 1.85rem;
		height: 1.85rem;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: inherit;
		opacity: 0.6;
		cursor: pointer;
		transition: opacity 150ms, background 150ms;
	}
	.info-close:hover,
	.info-close:focus-visible {
		opacity: 1;
		background: rgba(255, 255, 255, 0.08);
	}
	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme="dark"])) .info-close:hover,
		:global(:root:not([data-theme="dark"])) .info-close:focus-visible {
			background: rgba(0, 0, 0, 0.06);
		}
	}
	:global(:root[data-theme="light"]) .info-close:hover,
	:global(:root[data-theme="light"]) .info-close:focus-visible {
		background: rgba(0, 0, 0, 0.06);
	}
	.info-title {
		margin: 0 2rem 0.85rem 0;
		font-size: 1.1rem;
		font-weight: 700;
	}
	.info-dialog p {
		margin: 0 0 0.85rem;
		font-size: 0.92rem;
		line-height: 1.55;
		color: var(--color-text-secondary, var(--nord4));
	}
	.info-dialog p:last-child {
		margin-bottom: 0;
	}
	.info-dialog q {
		font-style: italic;
	}
	.info-dialog abbr {
		text-decoration: none;
		border-bottom: 1px dotted currentColor;
		cursor: help;
	}
	@keyframes streak-info-fade {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes streak-info-scale {
		from { opacity: 0; transform: scale(0.96); }
		to { opacity: 1; transform: scale(1); }
	}
</style>
