<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import { Weight, Percent, Ruler, ChevronDown, Plus, Minus, X } from '@lucide/svelte';
	import SaveFab from '$lib/components/SaveFab.svelte';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const measureSlug = $derived(lang === 'en' ? 'measure' : 'messen');

	let saving = $state(false);
	let lastWeight = $state(/** @type {number|null} */ (null));

	$effect(() => {
		fetch('/api/fitness/measurements/latest')
			.then(r => r.ok ? r.json() : null)
			.then(d => {
				if (d?.weight?.value != null) lastWeight = d.weight.value;
			})
			.catch(() => {});
	});

	let formDate = $state(new Date().toISOString().slice(0, 10));
	let formWeight = $state('');
	let formBodyFat = $state('');
	let formNeck = $state('');
	let formShoulders = $state('');
	let formChest = $state('');
	let formBicepsL = $state('');
	let formBicepsR = $state('');
	let formForearmsL = $state('');
	let formForearmsR = $state('');
	let formWaist = $state('');
	let formHips = $state('');
	let formThighsL = $state('');
	let formThighsR = $state('');
	let formCalvesL = $state('');
	let formCalvesR = $state('');

	function stepWeight(delta) {
		const cur = Number(formWeight) || lastWeight || 0;
		formWeight = String(Math.round((cur + delta) * 10) / 10);
	}

	let showBodyFat = $state(false);
	let showBodyParts = $state(false);

	function buildBody() {
		/** @type {any} */
		const body = { date: formDate };
		if (formWeight) body.weight = Number(formWeight);
		else body.weight = null;
		if (formBodyFat) body.bodyFatPercent = Number(formBodyFat);
		else body.bodyFatPercent = null;
		/** @type {any} */
		const m = {};
		if (formNeck) m.neck = Number(formNeck);
		if (formShoulders) m.shoulders = Number(formShoulders);
		if (formChest) m.chest = Number(formChest);
		if (formBicepsL || formBicepsR) m.biceps = {};
		if (formBicepsL) m.biceps.left = Number(formBicepsL);
		if (formBicepsR) m.biceps.right = Number(formBicepsR);
		if (formForearmsL || formForearmsR) m.forearms = {};
		if (formForearmsL) m.forearms.left = Number(formForearmsL);
		if (formForearmsR) m.forearms.right = Number(formForearmsR);
		if (formWaist) m.waist = Number(formWaist);
		if (formHips) m.hips = Number(formHips);
		if (formThighsL || formThighsR) m.thighs = {};
		if (formThighsL) m.thighs.left = Number(formThighsL);
		if (formThighsR) m.thighs.right = Number(formThighsR);
		if (formCalvesL || formCalvesR) m.calves = {};
		if (formCalvesL) m.calves.left = Number(formCalvesL);
		if (formCalvesR) m.calves.right = Number(formCalvesR);

		body.measurements = Object.keys(m).length > 0 ? m : null;
		return body;
	}

	async function saveMeasurement() {
		saving = true;
		try {
			const res = await fetch('/api/fitness/measurements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildBody())
			});
			if (res.ok) {
				await goto(`/fitness/${measureSlug}`);
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to save measurement');
			}
		} catch { toast.error('Failed to save measurement'); }
		saving = false;
	}
</script>

<svelte:head><title>{t('new_measurement', lang)} - Bocken</title></svelte:head>

<div class="measure-add">
	<form onsubmit={(e) => { e.preventDefault(); saveMeasurement(); }}>
		<!-- Date pill -->
		<div class="date-row">
			<input type="date" bind:value={formDate} class="date-pill" />
		</div>

		<!-- Weight hero -->
		<div class="weight-card">
			<div class="weight-icon"><Weight size={20} /></div>
			<div class="weight-stepper">
				<button type="button" class="step-btn" onclick={() => stepWeight(-0.1)} aria-label="-0.1">
					<Minus size={18} />
				</button>
				<div class="weight-input-wrap">
					<input
						id="m-weight"
						type="number"
						step="0.1"
						bind:value={formWeight}
						placeholder={lastWeight != null ? String(lastWeight) : '0.0'}
						class="weight-input"
						inputmode="decimal"
					/>
					<span class="weight-unit">kg</span>
				</div>
				<button type="button" class="step-btn" onclick={() => stepWeight(0.1)} aria-label="+0.1">
					<Plus size={18} />
				</button>
			</div>
			<label for="m-weight" class="weight-label">{lang === 'en' ? 'Weight' : 'Gewicht'}</label>
			{#if formWeight}
				<button type="button" class="weight-clear" onclick={() => formWeight = ''}>
					<X size={12} /> {lang === 'en' ? 'Clear' : 'Leeren'}
				</button>
			{/if}
		</div>

		<!-- Body Fat accordion -->
		<button type="button" class="section-toggle" onclick={() => showBodyFat = !showBodyFat}>
			<span class="section-toggle-left">
				<Percent size={16} />
				{t('body_fat_pct', lang)}
				{#if formBodyFat}<span class="section-preview">{formBodyFat}%</span>{/if}
			</span>
			<ChevronDown size={16} class="chevron {showBodyFat ? 'open' : ''}" />
		</button>
		{#if showBodyFat}
			<div class="section-body">
				<div class="bf-input-wrap">
					<input
						id="m-bf"
						type="number"
						step="0.1"
						bind:value={formBodyFat}
						placeholder="0.0"
						class="bf-input"
						inputmode="decimal"
					/>
					<span class="bf-unit">%</span>
				</div>
			</div>
		{/if}

		<!-- Body Parts accordion -->
		<button type="button" class="section-toggle" onclick={() => showBodyParts = !showBodyParts}>
			<span class="section-toggle-left">
				<Ruler size={16} />
				{t('body_parts_cm', lang)}
			</span>
			<ChevronDown size={16} class="chevron {showBodyParts ? 'open' : ''}" />
		</button>
		{#if showBodyParts}
			<div class="section-body">
				<div class="bp-group">
					<span class="bp-group-label">{lang === 'en' ? 'Upper body' : 'Oberkörper'}</span>
					<div class="bp-row">
						<div class="bp-field"><label for="m-neck">{t('neck', lang)}</label><input id="m-neck" type="number" step="0.1" bind:value={formNeck} placeholder="--" inputmode="decimal" /></div>
						<div class="bp-field"><label for="m-shoulders">{t('shoulders', lang)}</label><input id="m-shoulders" type="number" step="0.1" bind:value={formShoulders} placeholder="--" inputmode="decimal" /></div>
						<div class="bp-field"><label for="m-chest">{t('chest', lang)}</label><input id="m-chest" type="number" step="0.1" bind:value={formChest} placeholder="--" inputmode="decimal" /></div>
					</div>
				</div>

				<div class="bp-group">
					<span class="bp-group-label">{lang === 'en' ? 'Arms' : 'Arme'}</span>
					<div class="bp-row">
						<div class="bp-field"><label for="m-bl">{t('l_bicep', lang)}</label><input id="m-bl" type="number" step="0.1" bind:value={formBicepsL} placeholder="--" inputmode="decimal" /></div>
						<div class="bp-field"><label for="m-br">{t('r_bicep', lang)}</label><input id="m-br" type="number" step="0.1" bind:value={formBicepsR} placeholder="--" inputmode="decimal" /></div>
					</div>
					<div class="bp-row">
						<div class="bp-field"><label for="m-fl">{t('l_forearm', lang)}</label><input id="m-fl" type="number" step="0.1" bind:value={formForearmsL} placeholder="--" inputmode="decimal" /></div>
						<div class="bp-field"><label for="m-fr">{t('r_forearm', lang)}</label><input id="m-fr" type="number" step="0.1" bind:value={formForearmsR} placeholder="--" inputmode="decimal" /></div>
					</div>
				</div>

				<div class="bp-group">
					<span class="bp-group-label">{lang === 'en' ? 'Core' : 'Rumpf'}</span>
					<div class="bp-row">
						<div class="bp-field"><label for="m-waist">{t('waist', lang)}</label><input id="m-waist" type="number" step="0.1" bind:value={formWaist} placeholder="--" inputmode="decimal" /></div>
						<div class="bp-field"><label for="m-hips">{t('hips', lang)}</label><input id="m-hips" type="number" step="0.1" bind:value={formHips} placeholder="--" inputmode="decimal" /></div>
					</div>
				</div>

				<div class="bp-group">
					<span class="bp-group-label">{lang === 'en' ? 'Legs' : 'Beine'}</span>
					<div class="bp-row">
						<div class="bp-field"><label for="m-tl">{t('l_thigh', lang)}</label><input id="m-tl" type="number" step="0.1" bind:value={formThighsL} placeholder="--" inputmode="decimal" /></div>
						<div class="bp-field"><label for="m-tr">{t('r_thigh', lang)}</label><input id="m-tr" type="number" step="0.1" bind:value={formThighsR} placeholder="--" inputmode="decimal" /></div>
					</div>
					<div class="bp-row">
						<div class="bp-field"><label for="m-cl">{t('l_calf', lang)}</label><input id="m-cl" type="number" step="0.1" bind:value={formCalvesL} placeholder="--" inputmode="decimal" /></div>
						<div class="bp-field"><label for="m-cr">{t('r_calf', lang)}</label><input id="m-cr" type="number" step="0.1" bind:value={formCalvesR} placeholder="--" inputmode="decimal" /></div>
					</div>
				</div>
			</div>
		{/if}

		<SaveFab disabled={saving} label={t('save_measurement', lang)} />
	</form>
</div>

<style>
	.measure-add {
		max-width: 480px;
		margin-inline: auto;
	}

	/* Date pill */
	.date-row {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}
	.date-pill {
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		padding: 0.35rem 1rem;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		text-align: center;
	}
	.date-pill:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	/* Weight hero card */
	.weight-card {
		background: var(--color-surface);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-md);
		padding: 1.5rem 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		margin-bottom: 0.75rem;
	}
	.weight-icon {
		color: var(--color-primary);
		margin-bottom: 0.25rem;
	}
	.weight-stepper {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.step-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: background var(--transition-normal), border-color var(--transition-normal);
	}
	.step-btn:hover {
		background: var(--color-bg-elevated);
		border-color: var(--color-primary);
	}
	.step-btn:active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}
	.weight-input-wrap {
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
	}
	.weight-input {
		width: 5ch;
		border: none;
		background: transparent;
		font-size: 2.4rem;
		font-weight: 700;
		color: var(--color-text-primary);
		text-align: center;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.weight-input::placeholder {
		color: var(--color-text-tertiary);
	}
	.weight-input::-webkit-inner-spin-button,
	.weight-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.weight-input:focus {
		outline: none;
	}
	.weight-unit {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.weight-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-secondary);
	}
	.weight-clear {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.25rem;
		padding: 0.2rem 0.6rem;
		border: none;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.7rem;
		cursor: pointer;
		transition: background var(--transition-normal);
	}
	.weight-clear:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	/* Section toggles (accordions) */
	.section-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 0.7rem 0.85rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-primary);
		cursor: pointer;
		margin-bottom: 0;
		transition: background var(--transition-normal);
	}
	.section-toggle:hover {
		background: var(--color-surface-hover, var(--color-bg-elevated));
	}
	.section-toggle + .section-toggle {
		margin-top: 0.5rem;
	}
	.section-toggle-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.section-preview {
		font-weight: 400;
		color: var(--color-text-secondary);
		font-size: 0.8rem;
	}
	.section-toggle :global(.chevron) {
		transition: transform var(--transition-normal);
		color: var(--color-text-secondary);
	}
	.section-toggle :global(.chevron.open) {
		transform: rotate(180deg);
	}

	/* Section body (expanded content) */
	.section-body {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-top: none;
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
		padding: 0.75rem 0.85rem;
		margin-bottom: 0.5rem;
	}
	/* Round bottom off toggle when section is open */
	.section-toggle:has(+ .section-body) {
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		margin-bottom: 0;
	}

	/* Body fat input */
	.bf-input-wrap {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.25rem;
		padding: 0.5rem 0;
	}
	.bf-input {
		width: 4ch;
		border: none;
		background: transparent;
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--color-text-primary);
		text-align: center;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.bf-input::placeholder {
		color: var(--color-text-tertiary);
	}
	.bf-input::-webkit-inner-spin-button,
	.bf-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.bf-input:focus {
		outline: none;
	}
	.bf-unit {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	/* Body part measurements */
	.bp-group {
		margin-bottom: 0.6rem;
	}
	.bp-group:last-child {
		margin-bottom: 0;
	}
	.bp-group-label {
		display: block;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
		margin-bottom: 0.35rem;
	}
	.bp-row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.35rem;
	}
	.bp-field {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.bp-field label {
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.bp-field input {
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg-tertiary);
		color: inherit;
		font-size: 0.85rem;
		width: 100%;
		box-sizing: border-box;
	}
	.bp-field input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
</style>
