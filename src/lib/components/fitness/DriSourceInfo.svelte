<script>
	import Info from '@lucide/svelte/icons/info';
	import InfoDialog from '$lib/components/InfoDialog.svelte';

	/**
	 * Citation for the values behind the micronutrient bars — either the reference
	 * intakes the bars are measured against (`variant: 'dri'`) or the tolerable upper
	 * intake levels the over-limit warning uses (`variant: 'limits'`). They are cited
	 * separately because they answer different questions.
	 *
	 * Shown as a full-screen dialog rather than a popover anchored to the (i): this
	 * is four sourced paragraphs and a caveat, which as a popover was taller than a
	 * phone and covered the very bars it explains.
	 * @type {{ isEn?: boolean, aminos?: boolean, variant?: 'dri' | 'limits' }}
	 */
	let { isEn = true, aminos = true, variant = 'dri' } = $props();

	let open = $state(false);
</script>

<button
	class="dri-info-trigger"
	onclick={() => (open = true)}
	aria-haspopup="dialog"
	aria-label={variant === 'limits'
		? (isEn ? 'Where these upper limits come from' : 'Herkunft der Höchstmengen')
		: (isEn ? 'Where these reference values come from' : 'Herkunft der Referenzwerte')}
>
	<Info size={13} />
</button>

<InfoDialog
	{open}
	title={variant === 'limits'
		? (isEn ? 'Upper intake levels' : 'Höchstmengen')
		: (isEn ? 'Reference values' : 'Referenzwerte')}
	closeLabel={isEn ? 'Close' : 'Schliessen'}
	onclose={() => (open = false)}
>
	{#if variant === 'limits'}
		<ul>
			<li>
				{isEn
					? 'Tolerable Upper Intake Levels (UL) for adults 19+, National Academies of Sciences, Engineering, and Medicine — the highest habitual daily intake unlikely to cause harm.'
					: 'Tolerierbare Höchstmengen (UL) für Erwachsene ab 19 Jahren, National Academies of Sciences, Engineering, and Medicine — die höchste dauerhafte Tageszufuhr ohne erwartete Schäden.'}
				<a href="https://www.nationalacademies.org/our-work/summary-report-of-the-dietary-reference-intakes" target="_blank" rel="noopener noreferrer">nationalacademies.org</a>
			</li>
			<li>
				{isEn
					? 'Only nutrients whose UL applies to total intake are checked: calcium, iron, phosphorus, zinc, copper, manganese, iodine, selenium, molybdenum, vitamin C and vitamin D, plus preformed vitamin A. Chromium has none — the evidence was judged too thin to set one.'
					: 'Geprüft werden nur Nährstoffe, deren UL für die Gesamtzufuhr gilt: Calcium, Eisen, Phosphor, Zink, Kupfer, Mangan, Jod, Selen, Molybdän, Vitamin C und Vitamin D sowie vorgebildetes Vitamin A. Für Chrom gibt es keinen — die Datenlage reichte nicht aus, um einen festzulegen.'}
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
		{#if aminos}
			<p class="dri-info-note">
				{isEn
					? 'Asx and Glx are combined figures. The acid hydrolysis used to measure amino acids turns asparagine into aspartic acid and glutamine into glutamic acid, so no food table reports the four separately — the amide is already counted in the acid.'
					: 'Asx und Glx sind Summenwerte. Die saure Hydrolyse, mit der Aminosäuren bestimmt werden, wandelt Asparagin in Asparaginsäure und Glutamin in Glutaminsäure um; deshalb weist keine Nährwerttabelle die vier getrennt aus — das Amid steckt bereits im Säurewert.'}
			</p>
		{/if}
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
</InfoDialog>

<style>
	/* Inline with the label it annotates — the dialog it opens is fixed to the
	   viewport, so this only has to stay out of the way. */
	.dri-info-trigger {
		display: inline-flex;
		align-items: center;
		vertical-align: middle;
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

	/* The citations themselves. Written in this component and handed to
	   InfoDialog as a snippet, so they carry this component's scope; the reading
	   size and line height come from the dialog. */
	ul {
		margin: 0;
		padding-left: 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		color: var(--color-text-secondary);
	}
	a {
		color: var(--color-primary);
	}
	.dri-info-note {
		margin: 0.8rem 0 0;
		padding-top: 0.6rem;
		border-top: 1px solid var(--color-border);
		font-size: 0.85rem;
		color: var(--color-text-tertiary);
	}
</style>
