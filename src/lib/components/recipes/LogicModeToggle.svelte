<script>
	import "$lib/css/nordtheme.css";

	let {
		useAndLogic = true,
		onToggle = () => {},
		lang = 'de'
	} = $props();

	const isEnglish = $derived(lang === 'en');
	const label = $derived(isEnglish ? 'Filter Mode' : 'Filter-Modus');
	const andLabel = $derived(isEnglish ? 'AND' : 'UND');
	const orLabel = $derived(isEnglish ? 'OR' : 'ODER');

	let checked = $state(useAndLogic);

	// Watch for changes to checked and call onToggle
	$effect(() => {
		const currentChecked = checked;
		onToggle(currentChecked);
	});
</script>

<style>
	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		max-width: 100%;
		align-items: center;
	}

	@media (max-width: 968px) {
		.filter-section {
			max-width: 500px;
			gap: 0.3rem;
			align-items: flex-start;
			margin: 0 auto;
			width: 100%;
		}
	}

	.filter-label {
		font-size: 0.9rem;
		color: var(--nord2);
		font-weight: 600;
		margin-bottom: 0.25rem;
		text-align: center;
	}

	@media (prefers-color-scheme: dark) {
		.filter-label {
			color: var(--nord6);
		}
	}

	@media (max-width: 968px) {
		.filter-label {
			font-size: 0.85rem;
			text-align: left;
		}
	}

	.toggle-container {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--nord4);
		font-weight: 600;
	}

	@media (prefers-color-scheme: dark) {
		.toggle-container {
			color: var(--nord6);
		}
	}

	.toggle-switch {
		position: relative;
		width: 44px;
		height: 24px;
		background: var(--nord10);
		border-radius: 24px;
		cursor: pointer;
		transition: background 0.3s ease;
	}

	.toggle-switch.or-mode {
		background: var(--nord13);
	}

	.toggle-knob {
		position: absolute;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: white;
		top: 2px;
		left: 2px;
		transition: transform 0.3s ease;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.toggle-switch.or-mode .toggle-knob {
		transform: translateX(20px);
	}

	.mode-label {
		min-width: 40px;
		text-align: center;
	}

	.mode-label.active {
		color: var(--nord10);
	}

	@media (prefers-color-scheme: dark) {
		.mode-label.active {
			color: var(--nord8);
		}
	}

	.toggle-switch.or-mode + .mode-label.or {
		color: var(--nord13);
	}
</style>

<div class="filter-section">
	<div class="filter-label">{label}</div>
	<div class="toggle-container">
		<span class="mode-label" class:active={checked}>{andLabel}</span>
		<div
			class="toggle-switch"
			class:or-mode={!checked}
			onclick={() => checked = !checked}
			role="button"
			tabindex="0"
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); checked = !checked; } }}
		>
			<div class="toggle-knob"></div>
		</div>
		<span class="mode-label or" class:active={!checked}>{orLabel}</span>
	</div>
</div>
