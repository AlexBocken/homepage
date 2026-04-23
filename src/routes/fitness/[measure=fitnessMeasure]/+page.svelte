<script>
	import { page } from '$app/stores';
	import { Pencil, Trash2, ChevronRight, Venus, Mars, Weight, Percent, Plus, Minus, X, Check, UserCog, Sparkles } from '@lucide/svelte';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import SaveFab from '$lib/components/SaveFab.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import frontSvgRaw from '$lib/assets/muscle-front.svg?raw';
	const BP_VIEW_TOP = 100;
	const BP_VIEW_BOTTOM = 1060;
	const BP_VIEW_H = BP_VIEW_BOTTOM - BP_VIEW_TOP;
	const bpFrontSvg = frontSvgRaw.replace(
		'viewBox="0 0 660.46 1206.46"',
		`viewBox="0 ${BP_VIEW_TOP} 660.46 ${BP_VIEW_H}"`
	);

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const measureSlug = $derived(lang === 'en' ? 'measure' : 'messen');
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
	let bannerDismissed = $state(false);
	/** @type {HTMLElement | undefined} */
	let profileFormEl = $state(undefined);

	const profileComplete = $derived(!!(data.profile?.sex && data.profile?.heightCm && data.profile?.birthYear));
	const showSetupBanner = $derived(!profileComplete && !bannerDismissed && !profileEditing);

	function openProfileEdit() {
		profileEditing = true;
		setTimeout(() => {
			profileFormEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}, 40);
	}

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
	const lastBodyFat = $derived(latest.bodyFatPercent?.value ?? null);

	let formDate = $state(new Date().toISOString().slice(0, 10));
	let formWeight = $state('');
	let formBodyFat = $state('');

	const formDirty = $derived(!!formWeight || !!formBodyFat);

	const hasAnyBodyPart = $derived(bodyPartFields.some((f) => f.value != null));
	const latestBpDate = $derived(latest.measurements?.date ?? null);
	function formatLatestBp() {
		if (!latestBpDate) return t('no_measurements_yet', lang);
		const d = new Date(latestBpDate);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
		const rtf = new Intl.RelativeTimeFormat(lang === 'de' ? 'de-DE' : 'en-US', { numeric: 'auto' });
		let rel;
		if (diffDays < 30) rel = rtf.format(-diffDays, 'day');
		else if (diffDays < 365) rel = rtf.format(-Math.floor(diffDays / 30), 'month');
		else rel = rtf.format(-Math.floor(diffDays / 365), 'year');
		return `${t('last_measured', lang)} · ${rel}`;
	}

	/** @typedef {{ key: string, filled: boolean } & ({ shape: 'dot', x: number, y: number } | { shape: 'band', x1: number, x2: number, y: number })} BpMarker */
	/** @type {BpMarker[]} */
	const bpMarkers = $derived([
		{ key: 'neck',         shape: 'dot',  x: 330, y: 190,               filled: latestBp.neck != null },
		{ key: 'shoulders',    shape: 'band', x1: 170, x2: 510, y: 245,     filled: latestBp.shoulders != null },
		{ key: 'chest',        shape: 'band', x1: 200, x2: 470, y: 320,     filled: latestBp.chest != null },
		{ key: 'leftBicep',    shape: 'dot',  x: 150, y: 360,               filled: latestBp.leftBicep != null },
		{ key: 'rightBicep',   shape: 'dot',  x: 510, y: 360,               filled: latestBp.rightBicep != null },
		{ key: 'leftForearm',  shape: 'dot',  x: 95,  y: 450,               filled: latestBp.leftForearm != null },
		{ key: 'rightForearm', shape: 'dot',  x: 565, y: 450,               filled: latestBp.rightForearm != null },
		{ key: 'waist',        shape: 'dot',  x: 330, y: 495,               filled: latestBp.waist != null },
		{ key: 'hips',         shape: 'dot',  x: 330, y: 570,               filled: latestBp.hips != null },
		{ key: 'leftThigh',    shape: 'dot',  x: 250, y: 720,               filled: latestBp.leftThigh != null },
		{ key: 'rightThigh',   shape: 'dot',  x: 410, y: 720,               filled: latestBp.rightThigh != null },
		{ key: 'leftCalf',     shape: 'dot',  x: 230, y: 980,              filled: latestBp.leftCalf != null },
		{ key: 'rightCalf',    shape: 'dot',  x: 430, y: 980,              filled: latestBp.rightCalf != null }
	]);
	const filledCount = $derived(bpMarkers.filter((m) => m.filled).length);
	const totalParts = 13;

	/** @param {number} delta */
	function stepWeight(delta) {
		const cur = Number(formWeight) || lastWeight || 0;
		formWeight = (Math.round((cur + delta) * 10) / 10).toFixed(1);
	}

	/** @param {number} delta */
	function stepBodyFat(delta) {
		const cur = Number(formBodyFat) || lastBodyFat || 0;
		formBodyFat = (Math.round((cur + delta) * 10) / 10).toFixed(1);
	}

	/**
	 * @param {WheelEvent} e
	 * @param {(delta: number) => void} stepFn
	 */
	function onMetricWheel(e, stepFn) {
		if (!e.deltaY) return;
		e.preventDefault();
		stepFn(e.deltaY < 0 ? 0.1 : -0.1);
	}

	// --- Inline history edit ---
	/** @type {string | null} */
	let editingId = $state(null);
	let editDate = $state('');
	let editWeight = $state('');
	let editBodyFat = $state('');
	let editSaving = $state(false);

	/** @param {any} m */
	function startEdit(m) {
		editingId = m._id;
		editDate = new Date(m.date).toISOString().slice(0, 10);
		editWeight = m.weight != null ? String(m.weight) : '';
		editBodyFat = m.bodyFatPercent != null ? String(m.bodyFatPercent) : '';
	}
	function cancelEdit() {
		editingId = null;
	}
	/** @param {any} m */
	async function saveEdit(m) {
		editSaving = true;
		try {
			/** @type {Record<string, unknown>} */
			const body = { date: editDate };
			body.weight = editWeight ? Number(editWeight) : null;
			body.bodyFatPercent = editBodyFat ? Number(editBodyFat) : null;
			const res = await fetch(`/api/fitness/measurements/${m._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				const updated = await res.json();
				const next = updated.measurement ?? updated;
				measurements = measurements.map((x) => (x._id === m._id ? next : x));
				try {
					const latestRes = await fetch('/api/fitness/measurements/latest');
					if (latestRes.ok) latest = await latestRes.json();
				} catch {}
				toast.success(lang === 'en' ? 'Updated' : 'Aktualisiert');
				editingId = null;
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to update');
			}
		} catch { toast.error('Failed to update'); }
		editSaving = false;
	}
	/** @param {KeyboardEvent} e @param {any} m */
	function onEditKey(e, m) {
		if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
		else if (e.key === 'Enter') { e.preventDefault(); saveEdit(m); }
	}


	/**
	 * @param {KeyboardEvent} e
	 * @param {(delta: number) => void} stepFn
	 */
	function onMetricKey(e, stepFn) {
		const size = e.shiftKey ? 1.0 : 0.1;
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			stepFn(size);
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			stepFn(-size);
		}
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
	<h1 class="sr-only">{t('measure_title', lang)}</h1>

	{#if showSetupBanner}
		<div class="setup-banner" role="status">
			<span class="setup-banner-icon" aria-hidden="true"><Sparkles size={18} /></span>
			<span class="setup-banner-text">{t('profile_setup_cta', lang)}</span>
			<button type="button" class="setup-banner-cta" onclick={openProfileEdit}>
				{t('set_up_profile', lang)}
			</button>
			<button type="button" class="setup-banner-dismiss" onclick={() => bannerDismissed = true} aria-label={t('dismiss', lang)}>
				<X size={14} />
			</button>
		</div>
	{/if}

	{#if profileEditing}
		<div class="profile-fields" bind:this={profileFormEl}>
			<button type="button" class="profile-close-btn" onclick={() => profileEditing = false} aria-label={t('cancel', lang)}>
				<X size={14} />
			</button>
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
	<div class="main-col">
		<button type="button" class="edit-profile-link top" onclick={openProfileEdit}>
			<UserCog size={14} />
			<span>{t('edit_profile', lang)}</span>
		</button>
		<form class="add-form" onsubmit={(e) => { e.preventDefault(); saveMeasurement(); }}>
		<div class="date-row">
			<DatePicker bind:value={formDate} {lang} />
		</div>

		<div class="metric-grid">
			<div class="metric-card">
				<div class="metric-icon"><Weight size={22} /></div>
				<div class="metric-stepper" onwheel={(e) => onMetricWheel(e, stepWeight)}>
					<button type="button" class="step-btn" onclick={() => stepWeight(-0.1)} aria-label="-0.1">
						<Minus size={18} />
					</button>
					<div class="metric-input-wrap">
						<input
							id="m-weight"
							type="number"
							step="0.1"
							bind:value={formWeight}
							placeholder={lastWeight != null ? Number(lastWeight).toFixed(1) : '0.0'}
							class="metric-input"
							inputmode="decimal"
							onkeydown={(e) => onMetricKey(e, stepWeight)}
						/>
						<span class="metric-unit">kg</span>
					</div>
					<button type="button" class="step-btn" onclick={() => stepWeight(0.1)} aria-label="+0.1">
						<Plus size={18} />
					</button>
				</div>
				<label for="m-weight" class="metric-label">{lang === 'en' ? 'Weight' : 'Gewicht'}</label>
				{#if formWeight}
					<button type="button" class="metric-clear" onclick={() => formWeight = ''}>
						<X size={12} /> {lang === 'en' ? 'Clear' : 'Leeren'}
					</button>
				{/if}
			</div>

			<div class="metric-card bf">
				<div class="metric-icon"><Percent size={22} /></div>
				<div class="metric-stepper" onwheel={(e) => onMetricWheel(e, stepBodyFat)}>
					<button type="button" class="step-btn" onclick={() => stepBodyFat(-0.1)} aria-label="-0.1">
						<Minus size={18} />
					</button>
					<div class="metric-input-wrap">
						<input
							id="m-bf"
							type="number"
							step="0.1"
							bind:value={formBodyFat}
							placeholder={lastBodyFat != null ? Number(lastBodyFat).toFixed(1) : '0.0'}
							class="metric-input"
							inputmode="decimal"
							onkeydown={(e) => onMetricKey(e, stepBodyFat)}
						/>
						<span class="metric-unit">%</span>
					</div>
					<button type="button" class="step-btn" onclick={() => stepBodyFat(0.1)} aria-label="+0.1">
						<Plus size={18} />
					</button>
				</div>
				<label for="m-bf" class="metric-label">{lang === 'en' ? 'Body Fat' : 'Körperfett'}</label>
				{#if formBodyFat}
					<button type="button" class="metric-clear" onclick={() => formBodyFat = ''}>
						<X size={12} /> {lang === 'en' ? 'Clear' : 'Leeren'}
					</button>
				{/if}
			</div>
		</div>

		<a class="bp-card" href="/fitness/{measureSlug}/body-parts">
			<div class="bp-figure" aria-hidden="true">
				<div class="muscle-base">{@html bpFrontSvg}</div>
				<svg class="dot-overlay" viewBox="0 {BP_VIEW_TOP} 660.46 {BP_VIEW_H}" preserveAspectRatio="xMidYMid meet">
					{#each bpMarkers as m, i (m.key)}
						{#if m.shape === 'band'}
							<line
								x1={m.x1}
								y1={m.y}
								x2={m.x2}
								y2={m.y}
								class="dot band"
								class:filled={m.filled}
								stroke-linecap="round"
								style:animation-delay="{80 + i * 35}ms"
							/>
						{:else}
							<circle
								cx={m.x}
								cy={m.y}
								r="22"
								class="dot"
								class:filled={m.filled}
								style:animation-delay="{80 + i * 35}ms"
							/>
						{/if}
					{/each}
				</svg>
			</div>
			<div class="bp-content">
				<span class="bp-eyebrow">{t('body_parts', lang)}</span>
				<span class="bp-title">{t('measure_body_parts', lang)}</span>
				<span class="bp-meta">
					<span class="bp-count"><b>{filledCount}</b>/{totalParts}</span>
					<span class="bp-dot-sep">·</span>
					<span class="bp-sub">{hasAnyBodyPart ? formatLatestBp() : t('measure_body_parts_sub', lang)}</span>
				</span>
			</div>
			<ChevronRight size={18} class="bp-chevron" />
		</a>

		{#if formDirty && !workout.active}
			<SaveFab disabled={saving} label={t('save_measurement', lang)} />
		{/if}
	</form>

		{#if savedSex === 'female'}
			<div class="period-slot">
				<PeriodTracker periods={data.periods ?? []} {lang} sharedWith={data.periodSharedWith ?? []} />
			</div>
		{/if}
	</div>

	{#if measurements.length > 0}
		<section class="history-section">
			<button class="history-toggle" onclick={() => showWeightHistory = !showWeightHistory}>
				<h2>{t('past_measurements', lang)}</h2>
				<ChevronRight size={14} class={showWeightHistory ? 'chevron open' : 'chevron'} />
			</button>
			<div class="history-list" class:collapsed={!showWeightHistory}>
					{#each measurements as m (m._id)}
						<div class="history-item" class:editing={editingId === m._id}>
							{#if editingId === m._id}
								<div class="edit-row">
									<input
										type="date"
										bind:value={editDate}
										class="edit-input edit-date"
										onkeydown={(e) => onEditKey(e, m)}
									/>
									<div class="edit-num">
										<input
											type="number"
											step="0.1"
											bind:value={editWeight}
											placeholder="--"
											class="edit-input"
											inputmode="decimal"
											onkeydown={(e) => onEditKey(e, m)}
										/>
										<span class="edit-unit">kg</span>
									</div>
									<div class="edit-num">
										<input
											type="number"
											step="0.1"
											bind:value={editBodyFat}
											placeholder="--"
											class="edit-input"
											inputmode="decimal"
											onkeydown={(e) => onEditKey(e, m)}
										/>
										<span class="edit-unit">%</span>
									</div>
									<div class="edit-actions">
										<button type="button" class="edit-btn cancel" onclick={cancelEdit} aria-label={t('cancel', lang)}>
											<X size={14} />
										</button>
										<button type="button" class="edit-btn save" onclick={() => saveEdit(m)} disabled={editSaving} aria-label={t('save', lang)}>
											<Check size={14} />
										</button>
									</div>
									<a class="edit-more" href="/fitness/{measureSlug}/edit/{m._id}" aria-label={t('edit_measurement', lang)}>
										{lang === 'en' ? 'Full edit →' : 'Alle Felder →'}
									</a>
								</div>
							{:else}
								<div class="history-main">
									<div class="history-info">
										<span class="history-date">{formatDate(m.date)}</span>
										<span class="history-summary">{summaryParts(m)}</span>
									</div>
									<div class="history-actions">
										<button class="icon-btn edit" onclick={() => startEdit(m)} aria-label="Edit measurement">
											<Pencil size={14} />
										</button>
										<button class="icon-btn delete" onclick={() => deleteMeasurement(m._id)} aria-label="Delete measurement">
											<Trash2 size={14} />
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/each}
			</div>
		</section>
	{/if}

</div>

<style>
	.measure-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.main-col {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 480px;
		margin-inline: auto;
		width: 100%;
	}
	.history-section {
		max-width: 480px;
		margin-inline: auto;
		width: 100%;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
	}

	/* Setup banner — only visible when profile incomplete */
	.setup-banner {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.9rem;
		border-radius: var(--radius-lg);
		background: color-mix(in oklab, var(--color-primary) 10%, var(--color-surface));
		border: 1px solid color-mix(in oklab, var(--color-primary) 35%, transparent);
	}
	.setup-banner-icon {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		border-radius: 50%;
		background: color-mix(in oklab, var(--color-primary) 22%, transparent);
		color: var(--color-primary);
	}
	.setup-banner-text {
		flex: 1;
		font-size: 0.85rem;
		line-height: 1.35;
		color: var(--color-text-primary);
	}
	.setup-banner-cta {
		flex-shrink: 0;
		padding: 0.4rem 0.85rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-pill);
		font-weight: 600;
		font-size: 0.8rem;
		cursor: pointer;
		transition: background var(--transition-normal);
	}
	.setup-banner-cta:hover {
		background: var(--color-primary-hover);
	}
	.setup-banner-dismiss {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		padding: 0;
		flex-shrink: 0;
		background: none;
		border: none;
		border-radius: 50%;
		color: var(--color-text-tertiary);
		cursor: pointer;
		opacity: 0.6;
		transition: opacity var(--transition-fast, 120ms), background var(--transition-fast, 120ms);
	}
	.setup-banner-dismiss:hover {
		opacity: 1;
		background: color-mix(in oklab, var(--color-text-primary) 8%, transparent);
	}
	@media (max-width: 480px) {
		.setup-banner {
			flex-wrap: wrap;
			padding-right: 2.25rem;
			gap: 0.5rem 0.75rem;
		}
		.setup-banner-text {
			flex-basis: calc(100% - 2.75rem);
			font-size: 0.8rem;
		}
		.setup-banner-cta {
			margin-left: auto;
		}
		.setup-banner-dismiss {
			position: absolute;
			top: 0.4rem;
			right: 0.4rem;
		}
	}

	.profile-fields {
		position: relative;
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
		flex-wrap: wrap;
		padding: 0.75rem 0.9rem 0.9rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
	}
	.profile-close-btn {
		position: absolute;
		top: 0.35rem;
		right: 0.35rem;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		padding: 0;
		background: none;
		border: none;
		border-radius: 50%;
		color: var(--color-text-tertiary);
		cursor: pointer;
		opacity: 0.7;
		transition: opacity var(--transition-fast, 120ms), background var(--transition-fast, 120ms);
	}
	.profile-close-btn:hover {
		opacity: 1;
		background: color-mix(in oklab, var(--color-text-primary) 8%, transparent);
	}

	.edit-profile-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		border-radius: var(--radius-pill);
		transition: color var(--transition-fast, 120ms), background var(--transition-fast, 120ms);
	}
	.edit-profile-link.top {
		align-self: flex-start;
		margin-left: -0.5rem;
	}
	.edit-profile-link:hover {
		color: var(--color-text-primary);
		background: color-mix(in oklab, var(--color-text-primary) 6%, transparent);
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

	.metric-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.metric-card {
		--accent: var(--color-primary);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-md);
		padding: 1.5rem 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		transition: border-color var(--transition-normal);
	}
	.metric-card:focus-within {
		border-color: color-mix(in oklab, var(--accent) 50%, var(--color-border));
	}
	.metric-card.bf {
		--accent: var(--orange);
	}

	.metric-icon {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		background: color-mix(in oklab, var(--accent) 14%, transparent);
		color: var(--accent);
		margin-bottom: 0.1rem;
	}
	.metric-stepper {
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
		transition: background var(--transition-normal), border-color var(--transition-normal), transform var(--transition-fast, 120ms);
	}
	.step-btn:hover {
		background: var(--color-bg-elevated);
		border-color: var(--accent, var(--color-primary));
	}
	.step-btn:active {
		background: var(--accent, var(--color-primary));
		color: var(--color-text-on-primary);
		border-color: var(--accent, var(--color-primary));
		transform: scale(0.94);
	}
	.metric-input-wrap {
		display: flex;
		align-items: baseline;
		gap: 0.15rem;
	}
	.metric-input {
		field-sizing: content;
		min-width: 2ch;
		max-width: 6ch;
		border: none;
		background: transparent;
		font-size: 2.6rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
		text-align: center;
		font-variant-numeric: tabular-nums;
		-moz-appearance: textfield;
		appearance: textfield;
		padding: 0;
	}
	.metric-input::placeholder {
		color: var(--color-text-tertiary);
	}
	.metric-input::-webkit-inner-spin-button,
	.metric-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.metric-input:focus {
		outline: none;
	}
	.metric-unit {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.metric-label {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-text-tertiary);
	}
	.metric-clear {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.25rem;
		padding: 0.25rem 0.7rem;
		border: none;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.7rem;
		cursor: pointer;
		transition: background var(--transition-normal), color var(--transition-normal);
	}
	.metric-clear:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.bp-card {
		display: grid;
		grid-template-columns: 150px 1fr auto;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 1rem 1.1rem 1rem 0.6rem;
		margin-top: 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		color: var(--color-text-primary);
		text-decoration: none;
		cursor: pointer;
		transition: border-color var(--transition-normal), box-shadow var(--transition-normal), transform var(--transition-normal);
	}
	.bp-card:hover {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-md);
		transform: translateY(-1px);
	}
	.bp-figure {
		position: relative;
		height: 200px;
		aspect-ratio: 660 / 960;
		margin-inline: auto;
	}
	.muscle-base,
	.dot-overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.muscle-base :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
	}
	.muscle-base :global(g:not(#body):not(#head) path) {
		fill: color-mix(in oklab, var(--color-text-primary) 7%, transparent);
		stroke: var(--color-text-secondary);
		stroke-width: 1;
		stroke-linejoin: round;
	}
	.muscle-base :global(#body path),
	.muscle-base :global(#body line),
	.muscle-base :global(#head path) {
		stroke: var(--color-text-secondary) !important;
		fill: none;
		stroke-width: 2 !important;
	}
	.dot-overlay {
		pointer-events: none;
	}
	.dot {
		fill: var(--color-surface);
		stroke: var(--color-text-tertiary);
		stroke-width: 3;
		opacity: 0;
		transform-origin: center;
		transform-box: fill-box;
		animation: bp-dot-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
		transition: fill var(--transition-normal), stroke var(--transition-normal);
	}
	.dot.filled {
		fill: var(--color-primary);
		stroke: var(--color-surface);
		stroke-width: 3;
	}
	.dot.band {
		fill: none;
		stroke: var(--color-text-tertiary);
		stroke-width: 18;
		stroke-dasharray: 0 32;
		transform: none;
		animation: bp-band-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
	}
	.dot.band.filled {
		stroke: var(--color-primary);
	}
	.bp-card:hover .dot:not(.filled) {
		stroke: var(--color-primary);
	}
	@keyframes bp-dot-in {
		from { opacity: 0; transform: scale(0.3); }
		to   { opacity: 1; transform: scale(1); }
	}
	@keyframes bp-band-in {
		from { opacity: 0; }
		to   { opacity: 1; }
	}
	.bp-content {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}
	.bp-eyebrow {
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}
	.bp-title {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		line-height: 1.2;
	}
	.bp-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		column-gap: 0.4rem;
		row-gap: 0.1rem;
		margin-top: 0.25rem;
		font-size: 0.72rem;
		color: var(--color-text-secondary);
		line-height: 1.3;
		min-width: 0;
	}
	.bp-count {
		font-size: 0.82rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		flex-shrink: 0;
	}
	.bp-count b {
		color: var(--color-primary);
		font-weight: 700;
	}
	.bp-dot-sep {
		color: var(--color-text-tertiary);
		flex-shrink: 0;
	}
	.bp-sub {
		min-width: 0;
	}
	.bp-card :global(.bp-chevron) {
		color: var(--color-text-tertiary);
		flex-shrink: 0;
		transition: transform var(--transition-normal), color var(--transition-normal);
	}
	.bp-card:hover :global(.bp-chevron) {
		color: var(--color-primary);
		transform: translateX(2px);
	}

	@media (max-width: 480px) {
		.bp-card {
			grid-template-columns: 118px 1fr auto;
			gap: 0.65rem;
			padding: 0.85rem 0.85rem 0.85rem 0.5rem;
		}
		.bp-figure { height: 160px; }
		.bp-title { font-size: 1rem; }
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
		margin-bottom: 0.75rem;
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

	/* History collapse (mobile only) */
	.history-list.collapsed { display: none; }

	/* Inline history edit */
	.history-item.editing {
		background: color-mix(in oklab, var(--color-primary) 8%, var(--color-surface));
		border: 1px solid color-mix(in oklab, var(--color-primary) 40%, transparent);
		padding: 0.55rem 0.65rem;
	}
	.edit-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}
	.edit-input {
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-sm);
		padding: 0.28rem 0.4rem;
		font-size: 0.8rem;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
		min-width: 0;
	}
	.edit-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.edit-input.edit-date {
		flex: 1 1 120px;
		min-width: 110px;
	}
	.edit-num {
		display: inline-flex;
		align-items: baseline;
		gap: 0.15rem;
	}
	.edit-num .edit-input {
		width: 55px;
		text-align: right;
	}
	.edit-num .edit-input::-webkit-inner-spin-button,
	.edit-num .edit-input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.edit-unit {
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
		font-weight: 600;
	}
	.edit-actions {
		display: flex;
		gap: 0.3rem;
		margin-left: auto;
	}
	.edit-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		transition: background var(--transition-fast, 120ms), color var(--transition-fast, 120ms);
	}
	.edit-btn.save {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.edit-btn.save:hover:not(:disabled) { background: var(--color-primary-hover); }
	.edit-btn.save:disabled { opacity: 0.5; cursor: not-allowed; }
	.edit-btn.cancel {
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}
	.edit-btn.cancel:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.edit-more {
		flex-basis: 100%;
		font-size: 0.68rem;
		color: var(--color-text-tertiary);
		text-decoration: none;
		padding-top: 0.1rem;
	}
	.edit-more:hover { color: var(--color-primary); }

	/* Desktop 2-col layout */
	@media (min-width: 1024px) {
		.measure-page {
			display: grid;
			grid-template-columns: minmax(0, 760px) 340px;
			grid-auto-flow: dense;
			gap: 1.25rem 2rem;
			align-items: start;
			justify-content: center;
		}
		.measure-page > :not(.main-col):not(.history-section) {
			grid-column: 1 / -1;
		}
		.main-col {
			grid-column: 1;
			max-width: none;
			margin-inline: 0;
			width: auto;
		}
		.add-form {
			max-width: none;
			margin-inline: 0;
			width: auto;
		}
		.history-section {
			grid-column: 2;
			align-self: start;
		}
		.history-list.collapsed { display: flex; }
		.history-toggle { pointer-events: none; }
		.history-toggle :global(.chevron) { display: none; }
	}

	/* Weight + body fat side-by-side once there's room (tablet and up) */
	@media (min-width: 560px) {
		.main-col,
		.add-form,
		.history-section {
			max-width: 760px;
		}
		.metric-grid {
			grid-template-columns: 1fr 1fr;
		}
	}


</style>
