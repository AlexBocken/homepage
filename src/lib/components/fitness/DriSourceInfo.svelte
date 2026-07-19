<script>
	import Info from '@lucide/svelte/icons/info';

	/**
	 * Citation for the values behind the micronutrient bars — either the reference
	 * intakes the bars are measured against (`variant: 'dri'`) or the tolerable upper
	 * intake levels the over-limit warning uses (`variant: 'limits'`). They are cited
	 * separately because they answer different questions.
	 * Click the (i) to open; click anywhere else, or press Escape, to close.
	 * @type {{ isEn?: boolean, aminos?: boolean, variant?: 'dri' | 'limits', align?: 'left' | 'right' }}
	 */
	let { isEn = true, aminos = true, variant = 'dri', align = 'left' } = $props();

	let open = $state(false);

	/** @param {MouseEvent} e */
	function onWindowClick(e) {
		if (!open) return;
		const target = /** @type {HTMLElement | null} */ (e.target);
		if (target?.closest('.dri-info')) return;
		open = false;
	}
</script>

<svelte:window
	onclick={onWindowClick}
	onkeydown={(e) => { if (e.key === 'Escape') open = false; }}
/>

<span class="dri-info">
	<button
		class="dri-info-trigger"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-label={variant === 'limits'
			? (isEn ? 'Where these upper limits come from' : 'Herkunft der Höchstmengen')
			: (isEn ? 'Where these reference values come from' : 'Herkunft der Referenzwerte')}
	>
		<Info size={13} />
	</button>

	{#if open}
		<div class="dri-info-pop" class:align-right={align === 'right'}>
			{#if variant === 'limits'}
				<p class="dri-info-title">{isEn ? 'Upper intake levels' : 'Höchstmengen'}</p>
				<ul>
					<li>
						{isEn
							? 'Tolerable Upper Intake Levels (UL) for adults 19+, National Academies of Sciences, Engineering, and Medicine — the highest habitual daily intake unlikely to cause harm.'
							: 'Tolerierbare Höchstmengen (UL) für Erwachsene ab 19 Jahren, National Academies of Sciences, Engineering, and Medicine — die höchste dauerhafte Tageszufuhr ohne erwartete Schäden.'}
						<a href="https://www.nationalacademies.org/our-work/summary-report-of-the-dietary-reference-intakes" target="_blank" rel="noopener noreferrer">nationalacademies.org</a>
					</li>
					<li>
						{isEn
							? 'Only nutrients whose UL applies to total intake are checked: calcium, iron, phosphorus, zinc, vitamin C and vitamin D, plus preformed vitamin A.'
							: 'Geprüft werden nur Nährstoffe, deren UL für die Gesamtzufuhr gilt: Calcium, Eisen, Phosphor, Zink, Vitamin C und Vitamin D sowie vorgebildetes Vitamin A.'}
					</li>
					<li>
						{isEn
							? 'The limits for magnesium, niacin, vitamin E, vitamin B6 and folate cover supplements and fortification only, so food intake is not judged against them. The vitamin A limit covers retinol, not carotenoids.'
							: 'Die Grenzwerte für Magnesium, Niacin, Vitamin E, Vitamin B6 und Folat betreffen nur Supplemente und Anreicherung, Nahrungszufuhr wird daran nicht gemessen. Der Vitamin-A-Wert gilt für Retinol, nicht für Carotinoide.'}
					</li>
				</ul>
				<p class="dri-info-note">
					{isEn
						? 'A sustained average above a UL is worth discussing with a doctor — it is not an acute danger threshold, and a single high day says nothing.'
						: 'Ein dauerhafter Durchschnitt über einer Höchstmenge gehört ärztlich abgeklärt — es ist keine akute Gefahrenschwelle, und ein einzelner hoher Tag sagt nichts aus.'}
				</p>
			{:else}
				<p class="dri-info-title">{isEn ? 'Reference values' : 'Referenzwerte'}</p>
				<ul>
					<li>
						{isEn
							? 'Vitamins and minerals: US Dietary Reference Intakes (RDA/AI for adults 19–50), National Academies of Sciences, Engineering, and Medicine.'
							: 'Vitamine und Mineralstoffe: US Dietary Reference Intakes (RDA/AI für Erwachsene 19–50 Jahre), National Academies of Sciences, Engineering, and Medicine.'}
						<a href="https://www.nationalacademies.org/our-work/summary-report-of-the-dietary-reference-intakes" target="_blank" rel="noopener noreferrer">nationalacademies.org</a>
					</li>
					<li>
						{isEn
							? 'Cross-checked against the EFSA Dietary Reference Values for the EU.'
							: 'Abgeglichen mit den EFSA-Referenzwerten für die EU.'}
						<a href="https://multimedia.efsa.europa.eu/drvs/index.htm" target="_blank" rel="noopener noreferrer">efsa.europa.eu</a>
					</li>
					<li>
						{isEn
							? 'Free sugars and sodium upper limits: WHO guidelines.'
							: 'Obergrenzen für freien Zucker und Natrium: WHO-Leitlinien.'}
						<a href="https://www.who.int/publications/i/item/9789241549028" target="_blank" rel="noopener noreferrer">who.int</a>
					</li>
					{#if aminos}
						<li>
							{isEn
								? 'Essential amino acids: WHO/FAO/UNU (2007) requirements for adults, in mg per kg body weight per day.'
								: 'Essenzielle Aminosäuren: Bedarfswerte für Erwachsene nach WHO/FAO/UNU (2007), in mg pro kg Körpergewicht und Tag.'}
							<a href="https://www.who.int/publications/i/item/WHO-TRS-935" target="_blank" rel="noopener noreferrer">who.int</a>
						</li>
					{/if}
				</ul>
				<p class="dri-info-note">
					{isEn
						? 'Vitamin and mineral values follow your logged sex; amino acid requirements scale with your logged body weight. Where either is missing, the generic adult reference is used.'
						: 'Vitamin- und Mineralstoffwerte richten sich nach dem erfassten Geschlecht, der Aminosäurebedarf nach dem erfassten Körpergewicht. Fehlt eines davon, gilt der allgemeine Erwachsenen-Referenzwert.'}
				</p>
			{/if}
			<p class="dri-info-note">
				{isEn
					? 'General adult reference values — they are not medical advice and do not account for pregnancy, illness or medication.'
					: 'Allgemeine Referenzwerte für Erwachsene — keine medizinische Beratung; Schwangerschaft, Krankheit oder Medikamente sind nicht berücksichtigt.'}
			</p>
		</div>
	{/if}
</span>

<style>
	.dri-info {
		position: relative;
		display: inline-flex;
		vertical-align: middle;
	}
	.dri-info-trigger {
		display: inline-flex;
		align-items: center;
		padding: 0;
		margin-left: 0.25rem;
		background: none;
		border: none;
		color: inherit;
		opacity: 0.45;
		cursor: pointer;
	}
	.dri-info-trigger:hover {
		opacity: 0.9;
	}
	.dri-info-pop {
		position: absolute;
		top: calc(100% + 0.4rem);
		left: 0;
		z-index: 20;
		width: max-content;
		max-width: min(320px, 80vw);
		padding: 0.6rem 0.7rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
		font-size: 0.7rem;
		font-weight: 400;
		line-height: 1.5;
		text-align: left;
		text-transform: none;
		letter-spacing: normal;
		color: var(--color-text-secondary);
	}
	.dri-info-pop.align-right {
		left: auto;
		right: 0;
	}
	.dri-info-title {
		margin: 0 0 0.3rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	ul {
		margin: 0;
		padding-left: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	a {
		color: var(--color-primary);
	}
	.dri-info-note {
		margin: 0.45rem 0 0;
		padding-top: 0.4rem;
		border-top: 1px solid var(--color-border);
		color: var(--color-text-tertiary);
	}
</style>
