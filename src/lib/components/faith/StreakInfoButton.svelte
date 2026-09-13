<script lang="ts">
	/**
	 * The (i) beside a streak counter, and the explainer behind it.
	 *
	 * Its citations are live: the Catechism paragraphs and the verse peek on
	 * hover, the same way they do in the Bible reader. That needs a
	 * `ReferencePeeks` on the page — the rosary and the prayer pages both
	 * mount one — and a peek layer that clears the dialog (see ReferencePeeks).
	 */
	import Info from '@lucide/svelte/icons/info';
	import InfoDialog from '$lib/components/InfoDialog.svelte';
	import CccRef from '$lib/components/faith/ccc/CccRef.svelte';
	import ScriptureRef from '$lib/components/faith/bible/ScriptureRef.svelte';
	import type { FaithLang } from '$lib/js/faithI18n';

	let { lang = 'de' }: { lang?: FaithLang } = $props();

	let open = $state(false);

	const labels = $derived(
		lang === 'en'
			? { trigger: 'About this counter', close: 'Close', title: 'About this counter' }
			: lang === 'la'
				? { trigger: 'De numero hoc', close: 'Claudere', title: 'De numero hoc' }
				: { trigger: 'Über diese Zählung', close: 'Schliessen', title: 'Über diese Zählung' }
	);
</script>

<button
	class="info-btn"
	type="button"
	onclick={() => open = true}
	aria-haspopup="dialog"
	aria-label={labels.trigger}
	title={labels.trigger}
>
	<Info size={14} strokeWidth={2} />
</button>

<InfoDialog {open} title={labels.title} closeLabel={labels.close} onclose={() => open = false}>
	{#if lang === 'en'}
		<p>
			This counter tracks <em>consistency</em>, not piety. The Church proposes regular rhythms of prayer (<CccRef n={2698} />) — we are creatures of body and spirit (<CccRef n={2702} />), and habit forms us. On weary days the count can be a small nudge to keep faithful to that routine.
		</p>
		<p>
			But the number itself is empty. Christ warns: <q>In praying do not heap up empty phrases as the Gentiles do; for they think that they will be heard for their many words</q> (<ScriptureRef reference="Mt 6:7" />). What matters is <q>that the heart should be present to him to whom we are speaking</q> (<CccRef n={2700} />). One prayer prayed with attention is worth more than thirty rushed to keep a count alive. And clinging to the streak as proof of one's piety only opens the door to the wounded pride the Catechism warns of (<CccRef n={2728} />).
		</p>
	{:else if lang === 'la'}
		<p>
			Numerus iste <em>constantiam</em> metitur, non pietatem. Ecclesia rhythmos cotidianos orationis commendat (<CccRef n={2698} />) — homo enim corpus et spiritus est (<CccRef n={2702} />), atque consuetudine formamur. Diebus laboriosis numerus parvulum incitamentum esse potest, ut consuetudini fideles maneamus.
		</p>
		<p>
			Numerus tamen ipse vacuus est. Christus monet: <q>Orantes nolite multum loqui, sicut ethnici; putant enim quod in multiloquio suo exaudiantur</q> (<ScriptureRef reference="Mt 6,7" />). Quod refert est ut <q>cor adsit Ei cui loquimur</q> (<CccRef n={2700} />). Una oratio attente fusa pluris est quam triginta praecipitanter recitatae ut numerus servetur. Qui autem numerum tenet ut testimonium pietatis suae, ostium aperit superbiae læsæ, quam Catechismus monet (<CccRef n={2728} />).
		</p>
	{:else}
		<p>
			Diese Zählung misst <em>Beständigkeit</em>, nicht Frömmigkeit. Die Kirche empfiehlt regelmässige Gebetsrhythmen (<CccRef n={2698} />) — der Mensch ist Leib und Geist (<CccRef n={2702} />), und Gewohnheit formt uns. An müden Tagen kann die Zahl ein kleiner Anstoss sein, in der Routine zu bleiben.
		</p>
		<p>
			Die Zahl selbst aber ist leer. Christus mahnt: <q>Plappert nicht wie die Heiden, die meinen, sie würden nur erhört, wenn sie viele Worte machen</q> (<ScriptureRef reference="Mt 6,7" />). Worauf es ankommt, ist, <q>dass das Herz dem zugewandt ist, zu dem es spricht</q> (<CccRef n={2700} />). Ein einziges aufmerksam gebetetes Gebet ist mehr wert als dreissig hastig durchgeleierte, nur um den Zähler zu retten. Und wer am Streak als Beweis seiner Frömmigkeit festhält, öffnet die Tür zum verletzten Stolz, vor dem der Katechismus warnt (<CccRef n={2728} />).
		</p>
	{/if}
</InfoDialog>

<style>
	/* Tiny info pip in the corner — opens the explainer that says the streak
	   counter is about habit, not piety. The parent container must be
	   position: relative for this to anchor correctly. */
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

	/* The dialog's prose. These elements are written here and only handed to
	   InfoDialog as a snippet, so they carry this component's scope and need no
	   :global — the size and line height come from the dialog itself. */
	p {
		margin: 0 0 0.85rem;
		color: var(--color-text-secondary);
	}
	p:last-child {
		margin-bottom: 0;
	}
	q {
		font-style: italic;
	}
</style>
