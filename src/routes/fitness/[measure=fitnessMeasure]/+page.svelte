<script>
	import { page } from '$app/stores';
	import { Pencil, Trash2, ChevronRight, ChevronDown, Venus, Mars, Weight, Percent, Ruler, Plus, Minus, X } from '@lucide/svelte';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import SaveFab from '$lib/components/SaveFab.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import { BODY_PART_CARDS, bodyPartSlug } from '$lib/js/fitnessBodyParts';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const measureSlug = $derived(lang === 'en' ? 'measure' : 'messen');
	const historySlug = $derived(lang === 'en' ? 'history' : 'verlauf');
	import { getWorkout } from '$lib/js/workout.svelte';
	import PeriodTracker from '$lib/components/fitness/PeriodTracker.svelte';

	let { data } = $props();
	const workout = getWorkout();

	// svelte-ignore state_referenced_locally
	let latest = $state(data.latest ? { ...data.latest } : {});
	// svelte-ignore state_referenced_locally
	let measurements = $state(data.measurements?.measurements ? [...data.measurements.measurements] : []);
	let showWeightHistory = $state(false);

	// Profile fields (sex, height, birth year) — stored in FitnessGoal
	// svelte-ignore state_referenced_locally
	let savedSex = $state(data.profile?.sex ?? 'male');
	// svelte-ignore state_referenced_locally
	let profileSex = $state(data.profile?.sex ?? 'male');
	// svelte-ignore state_referenced_locally
	let profileHeight = $state(data.profile?.heightCm != null ? String(data.profile.heightCm) : '');
	// svelte-ignore state_referenced_locally
	let profileBirthYear = $state(data.profile?.birthYear != null ? String(data.profile.birthYear) : '');
	let profileSaving = $state(false);
	let profileEditing = $state(false);

	const profileParts = $derived.by(() => {
		/** @type {string[]} */
		const parts = [];
		const h = data.profile?.heightCm;
		if (h) parts.push(`${h}cm`);
		const by = data.profile?.birthYear;
		if (by) parts.push(`*${by}`);
		return parts;
	});

	let profileDirty = $derived(
		profileSex !== (data.profile?.sex ?? 'male') ||
		profileHeight !== (data.profile?.heightCm != null ? String(data.profile.heightCm) : '') ||
		profileBirthYear !== (data.profile?.birthYear != null ? String(data.profile.birthYear) : '')
	);

	async function saveProfile() {
		profileSaving = true;
		try {
			/** @type {Record<string, unknown>} */
			const body = {
				weeklyWorkouts: data.profile?.weeklyWorkouts ?? 4,
				sex: profileSex
			};
			const h = Number(profileHeight);
			if (h >= 100 && h <= 250) body.heightCm = h;
			const by = Number(profileBirthYear);
			if (by >= 1900 && by <= 2020) body.birthYear = by;
			const res = await fetch('/api/fitness/goal', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				const d = await res.json();
				data.profile = d;
				savedSex = d.sex ?? profileSex;
				profileEditing = false;
			}
		} finally {
			profileSaving = false;
		}
	}

	const latestBp = $derived(latest.measurements?.value ?? {});
	const bodyPartFields = $derived([
		{ label: t('neck', lang), key: 'neck', value: latestBp.neck },
		{ label: t('shoulders', lang), key: 'shoulders', value: latestBp.shoulders },
		{ label: t('chest', lang), key: 'chest', value: latestBp.chest },
		{ label: t('l_bicep', lang), key: 'leftBicep', value: latestBp.leftBicep },
		{ label: t('r_bicep', lang), key: 'rightBicep', value: latestBp.rightBicep },
		{ label: t('l_forearm', lang), key: 'leftForearm', value: latestBp.leftForearm },
		{ label: t('r_forearm', lang), key: 'rightForearm', value: latestBp.rightForearm },
		{ label: t('waist', lang), key: 'waist', value: latestBp.waist },
		{ label: t('hips', lang), key: 'hips', value: latestBp.hips },
		{ label: t('l_thigh', lang), key: 'leftThigh', value: latestBp.leftThigh },
		{ label: t('r_thigh', lang), key: 'rightThigh', value: latestBp.rightThigh },
		{ label: t('l_calf', lang), key: 'leftCalf', value: latestBp.leftCalf },
		{ label: t('r_calf', lang), key: 'rightCalf', value: latestBp.rightCalf }
	]);

	/** @param {import('$lib/js/fitnessBodyParts').BodyPartCard} c */
	function currentValue(c) {
		if (c.paired) {
			const l = /** @type {number|undefined} */ (latestBp[c.dbLeft]);
			const r = /** @type {number|undefined} */ (latestBp[c.dbRight]);
			return { left: l ?? null, right: r ?? null };
		}
		const v = /** @type {number|undefined} */ (latestBp[c.db]);
		return { value: v ?? null };
	}

	/** @param {import('$lib/js/fitnessBodyParts').BodyPartCard} c */
	function hasAny(c) {
		const v = currentValue(c);
		if (c.paired) return v.left != null || v.right != null;
		return v.value != null;
	}

	const cardsWithData = $derived(BODY_PART_CARDS.filter(hasAny));

	/** @param {string} id */
	async function deleteMeasurement(id) {
		if (!await confirm(t('delete_measurement_confirm', lang))) return;
		try {
			const res = await fetch(`/api/fitness/measurements/${id}`, { method: 'DELETE' });
			if (res.ok) {
				measurements = measurements.filter((m) => m._id !== id);
				try {
					const latestRes = await fetch('/api/fitness/measurements/latest');
					if (latestRes.ok) latest = await latestRes.json();
				} catch {}
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to delete measurement');
			}
		} catch { toast.error('Failed to delete measurement'); }
	}

	/** @param {string} dateStr */
	function formatDate(dateStr) {
		const d = new Date(dateStr);
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	/** @param {any} m */
	function summaryParts(m) {
		/** @type {string[]} */
		const parts = [];
		if (m.weight != null) parts.push(`${m.weight} kg`);
		if (m.bodyFatPercent != null) parts.push(`${m.bodyFatPercent}% bf`);
		return parts.join(' · ') || t('body_measurements_only', lang);
	}

	// --- New measurement form ---
	let saving = $state(false);
	const lastWeight = $derived(latest.weight?.value ?? null);

	let formDate = $state(new Date().toISOString().slice(0, 10));
	let formWeight = $state('');
	let formBodyFat = $state('');

	let showBodyFat = $state(false);

	const formDirty = $derived(!!formWeight || !!formBodyFat);

	const hasAnyBodyPart = $derived(bodyPartFields.some((f) => f.value != null));
	const latestBpDate = $derived(latest.measurements?.date ?? null);
	function formatLatestBp() {
		if (!latestBpDate) return t('no_measurements_yet', lang);
		const d = new Date(latestBpDate);
		return `${t('last_measured', lang)} · ${d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
	}

	function stepWeight(delta) {
		const cur = Number(formWeight) || lastWeight || 0;
		formWeight = String(Math.round((cur + delta) * 10) / 10);
	}

	function buildBody() {
		/** @type {any} */
		const body = { date: formDate };
		if (formWeight) body.weight = Number(formWeight);
		else body.weight = null;
		if (formBodyFat) body.bodyFatPercent = Number(formBodyFat);
		else body.bodyFatPercent = null;
		body.measurements = null;
		return body;
	}

	function resetForm() {
		formWeight = '';
		formBodyFat = '';
		formDate = new Date().toISOString().slice(0, 10);
		showBodyFat = false;
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
				const created = await res.json();
				// Refresh latest and prepend to history
				try {
					const latestRes = await fetch('/api/fitness/measurements/latest');
					if (latestRes.ok) latest = await latestRes.json();
				} catch {}
				measurements = [created.measurement ?? created, ...measurements];
				resetForm();
				toast.success(lang === 'en' ? 'Measurement saved' : 'Messung gespeichert');
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to save measurement');
			}
		} catch { toast.error('Failed to save measurement'); }
		saving = false;
	}
</script>

<svelte:head><title>{lang === 'en' ? 'Measure' : 'Messen'} - Bocken</title></svelte:head>

<div class="measure-page">
	<div class="page-header">
		<h1>{t('measure_title', lang)}</h1>
		<div class="profile-meta">
			{#if data.profile?.sex}
				<span class="profile-sex-icon">
					{#if data.profile.sex === 'female'}
						<Venus size={16} />
					{:else}
						<Mars size={16} />
					{/if}
				</span>
			{/if}
			{#if profileParts.length > 0}
				<span class="profile-summary">{profileParts.join(' · ')}</span>
			{/if}
			<button class="profile-edit-btn" onclick={() => profileEditing = !profileEditing} aria-label="Edit profile">
				<Pencil size={12} />
			</button>
		</div>
	</div>

	{#if profileEditing}
		<div class="profile-fields">
			<div class="form-group">
				<!-- svelte-ignore a11y_label_has_associated_control -->
			<label>{t('sex', lang)}</label>
				<div class="sex-pills">
					<button class="sex-pill" class:active={profileSex === 'male'} onclick={() => profileSex = 'male'}>
						<Mars size={14} /> {t('male', lang)}
					</button>
					<button class="sex-pill" class:active={profileSex === 'female'} onclick={() => profileSex = 'female'}>
						<Venus size={14} /> {t('female', lang)}
					</button>
				</div>
			</div>
			<div class="form-group">
				<label for="p-height">{t('height', lang)}</label>
				<input id="p-height" type="number" min="100" max="250" placeholder="175" bind:value={profileHeight} />
			</div>
			<div class="form-group">
				<label for="p-birthyear">{t('birth_year', lang)}</label>
				<input id="p-birthyear" type="number" min="1900" max="2020" placeholder="1990" bind:value={profileBirthYear} />
			</div>
			{#if profileDirty}
				<button class="profile-save-btn" onclick={saveProfile} disabled={profileSaving}>
					{profileSaving ? t('saving', lang) : t('save', lang)}
				</button>
			{/if}
		</div>
	{/if}

	<!-- New measurement form -->
	<form class="add-form" onsubmit={(e) => { e.preventDefault(); saveMeasurement(); }}>
		<div class="date-row">
			<DatePicker bind:value={formDate} {lang} />
		</div>

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
					<input id="m-bf" type="number" step="0.1" bind:value={formBodyFat} placeholder="0.0" class="bf-input" inputmode="decimal" />
					<span class="bf-unit">%</span>
				</div>
			</div>
		{/if}

		<a class="bp-launch" href="/fitness/{measureSlug}/body-parts">
			<span class="bp-launch-icon"><Ruler size={22} /></span>
			<span class="bp-launch-text">
				<span class="bp-launch-title">{t('measure_body_parts', lang)}</span>
				<span class="bp-launch-sub">{hasAnyBodyPart ? formatLatestBp() : t('measure_body_parts_sub', lang)}</span>
			</span>
			<ChevronRight size={18} />
		</a>

		{#if formDirty && !workout.active}
			<SaveFab disabled={saving} label={t('save_measurement', lang)} />
		{/if}
	</form>

	{#if cardsWithData.length > 0}
		<section class="body-parts-section">
			<h2>{t('body_parts', lang)}</h2>
			<div class="bp-grid">
				{#each cardsWithData as card (card.key)}
					{@const cv = currentValue(card)}
					<a
						class="bp-card"
						href="/fitness/{measureSlug}/{historySlug}/{bodyPartSlug(card, lang)}"
					>
						<div class="bp-img-wrap" aria-hidden="true">
							{#if card.img && card.img.endsWith('.svg')}
								<div
									class="bp-img bp-img-svg"
									style="--bp-svg-src: url(/fitness/measure/{card.img})"
								></div>
							{:else if card.img}
								<img src="/fitness/measure/{card.img}" alt="" class="bp-img" />
							{:else}
								<Ruler size={36} strokeWidth={1.5} />
							{/if}
						</div>
						<div class="bp-meta">
							<span class="bp-label">{t(card.labelKey, lang)}</span>
							{#if card.paired}
								{#if cv.left != null && cv.right != null && cv.left === cv.right}
									<span class="bp-value">{cv.left.toFixed(1)}<span class="bp-unit">cm</span></span>
								{:else if cv.left != null && cv.right != null}
									<span class="bp-value paired">
										<span class="bp-side"><em>L</em> {cv.left.toFixed(1)}</span>
										<span class="bp-side-sep">·</span>
										<span class="bp-side"><em>R</em> {cv.right.toFixed(1)}</span>
										<span class="bp-unit">cm</span>
									</span>
								{:else if cv.left != null}
									<span class="bp-value"><em>L</em> {cv.left.toFixed(1)}<span class="bp-unit">cm</span></span>
								{:else if cv.right != null}
									<span class="bp-value"><em>R</em> {cv.right.toFixed(1)}<span class="bp-unit">cm</span></span>
								{/if}
							{:else if cv.value != null}
								<span class="bp-value">{cv.value.toFixed(1)}<span class="bp-unit">cm</span></span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/if}

	{#if measurements.length > 0}
		<section class="history-section">
			<button class="history-toggle" onclick={() => showWeightHistory = !showWeightHistory}>
				<h2>{t('history', lang)}</h2>
				<ChevronRight size={14} class={showWeightHistory ? 'chevron open' : 'chevron'} />
			</button>
			{#if showWeightHistory}
				<div class="history-list">
					{#each measurements as m (m._id)}
						<div class="history-item">
							<div class="history-main">
								<div class="history-info">
									<span class="history-date">{formatDate(m.date)}</span>
									<span class="history-summary">{summaryParts(m)}</span>
								</div>
								<div class="history-actions">
									<a class="icon-btn edit" href="/fitness/{measureSlug}/edit/{m._id}" aria-label="Edit measurement">
										<Pencil size={14} />
									</a>
									<button class="icon-btn delete" onclick={() => deleteMeasurement(m._id)} aria-label="Delete measurement">
										<Trash2 size={14} />
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	{#if savedSex === 'female'}
		<PeriodTracker periods={data.periods ?? []} {lang} sharedWith={data.periodSharedWith ?? []} />
	{/if}

	{#each data.sharedPeriods ?? [] as shared (shared.owner)}
		<PeriodTracker periods={shared.entries} {lang} readOnly ownerName={shared.owner} />
	{/each}
</div>

<style>
	.measure-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
	}

	/* Header with inline profile */
	.page-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.profile-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.profile-sex-icon {
		display: flex;
		color: var(--color-text-secondary);
	}
	.profile-summary {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		letter-spacing: 0.02em;
	}
	.profile-edit-btn {
		display: flex;
		align-items: center;
		padding: 0.25rem;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-tertiary);
		opacity: 0.6;
		transition: opacity 0.15s;
	}
	.profile-edit-btn:hover {
		opacity: 1;
		color: var(--color-text-secondary);
	}
	.profile-fields {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
		justify-content: flex-end;
		flex-wrap: wrap;
	}
	.sex-pills {
		display: flex;
		gap: 0.4rem;
	}
	.sex-pill {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.65rem;
		border: 1px solid var(--color-border);
		border-radius: 20px;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 150ms;
	}
	.sex-pill.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.profile-save-btn {
		padding: 0.4rem 0.75rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.8rem;
		cursor: pointer;
		white-space: nowrap;
		align-self: flex-end;
		margin-bottom: 0.4rem;
	}
	.profile-save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-bottom: 0.4rem;
		flex-shrink: 0;
	}
	.form-group label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.form-group input {
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-bg-elevated);
		color: inherit;
		font-size: 0.85rem;
	}
	.form-group input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	/* --- Add form --- */
	.add-form {
		max-width: 480px;
		margin-inline: auto;
		width: 100%;
	}

	.date-row {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}

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

	.section-body {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-top: none;
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
		padding: 0.75rem 0.85rem;
		margin-bottom: 0.5rem;
	}
	.section-toggle:has(+ .section-body) {
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		margin-bottom: 0;
	}

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

	.bp-launch {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		width: 100%;
		padding: 0.9rem 1rem;
		margin-top: 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		color: var(--color-text-primary);
		text-decoration: none;
		cursor: pointer;
		transition: all var(--transition-normal);
		position: relative;
		overflow: hidden;
	}
	.bp-launch::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			color-mix(in oklab, var(--color-primary) 8%, transparent),
			transparent 60%
		);
		pointer-events: none;
	}
	.bp-launch:hover {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-md);
		transform: translateY(-1px);
	}
	.bp-launch-icon {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		flex-shrink: 0;
		border-radius: 50%;
		background: color-mix(in oklab, var(--color-primary) 14%, transparent);
		color: var(--color-primary);
	}
	.bp-launch-text {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		flex: 1;
		min-width: 0;
	}
	.bp-launch-title {
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: -0.005em;
	}
	.bp-launch-sub {
		font-size: 0.72rem;
		color: var(--color-text-secondary);
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Body parts (latest) */
	.bp-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.6rem;
	}
	.bp-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.35rem;
		padding: 0.7rem 0.5rem 0.6rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		cursor: pointer;
		color: inherit;
		font: inherit;
		text-decoration: none;
		position: relative;
		transition: border-color var(--transition-normal), box-shadow var(--transition-normal), transform var(--transition-normal);
	}
	.bp-card:hover {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-sm);
	}
	.bp-img-wrap {
		display: grid;
		place-items: center;
		width: 3.25rem;
		height: 3.25rem;
		flex-shrink: 0;
		border-radius: 50%;
		background: var(--color-bg-secondary);
		color: var(--color-text-secondary);
	}
	.bp-img {
		width: 2.4rem;
		height: 2.4rem;
		object-fit: contain;
	}
	.bp-img-svg {
		mask-image: var(--bp-svg-src);
		-webkit-mask-image: var(--bp-svg-src);
		mask-size: contain;
		-webkit-mask-size: contain;
		mask-repeat: no-repeat;
		-webkit-mask-repeat: no-repeat;
		mask-position: center;
		-webkit-mask-position: center;
		background-color: var(--color-text-primary);
	}
	@media (prefers-color-scheme: dark) {
		img.bp-img { filter: invert(1); }
	}
	:global(:root[data-theme="dark"]) img.bp-img { filter: invert(1); }
	:global(:root[data-theme="light"]) img.bp-img { filter: none; }
	.bp-meta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		min-width: 0;
		width: 100%;
	}
	.bp-label {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-secondary);
	}
	.bp-value {
		font-size: 1rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
		letter-spacing: -0.01em;
	}
	.bp-value.paired {
		font-size: 0.78rem;
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: center;
		gap: 0.2rem;
	}
	.bp-value em {
		font-style: normal;
		font-weight: 600;
		font-size: 0.62rem;
		color: var(--color-text-tertiary);
		margin-right: 0.15rem;
		letter-spacing: 0.05em;
	}
	.bp-side {
		white-space: nowrap;
	}
	.bp-side-sep {
		color: var(--color-text-tertiary);
	}
	.bp-unit {
		margin-left: 0.2rem;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
	}
	@media (max-width: 420px) {
		.bp-grid { gap: 0.45rem; }
		.bp-card { padding: 0.55rem 0.35rem; }
		.bp-img-wrap { width: 2.6rem; height: 2.6rem; }
		.bp-img { width: 1.9rem; height: 1.9rem; }
		.bp-label { font-size: 0.58rem; }
		.bp-value { font-size: 0.88rem; }
		.bp-value.paired { font-size: 0.7rem; }
	}
	@media (min-width: 768px) {
		.bp-grid { gap: 0.85rem; }
		.bp-card {
			flex-direction: row;
			align-items: center;
			text-align: left;
			gap: 0.85rem;
			padding: 0.9rem 1rem;
		}
		.bp-img-wrap {
			width: 3.75rem;
			height: 3.75rem;
		}
		.bp-img {
			width: 2.75rem;
			height: 2.75rem;
		}
		.bp-meta {
			align-items: flex-start;
			text-align: left;
			gap: 0.25rem;
		}
		.bp-value.paired {
			justify-content: flex-start;
		}
		.bp-label {
			font-size: 0.68rem;
		}
		.bp-value {
			font-size: 1.15rem;
		}
	}

	/* History */
	.history-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		color: inherit;
	}
	.history-toggle h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.history-toggle :global(.chevron) {
		transition: transform 0.2s;
	}
	.history-toggle :global(.chevron.open) {
		transform: rotate(90deg);
	}
	.history-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.history-item {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 0.6rem 0.75rem;
	}
	.history-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}
	.history-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.history-date {
		font-size: 0.8rem;
		font-weight: 600;
	}
	.history-summary {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.history-actions {
		display: flex;
		gap: 0.3rem;
		flex-shrink: 0;
	}
	.icon-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
	}
	.icon-btn.edit:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.icon-btn.delete {
		border-color: transparent;
		opacity: 0.5;
	}
	.icon-btn.delete:hover {
		border-color: var(--nord11);
		color: var(--nord11);
		opacity: 1;
	}

	@media (max-width: 480px) {
		.stat-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
