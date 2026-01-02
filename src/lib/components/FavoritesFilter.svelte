<script>
	import "$lib/css/nordtheme.css";
	import Toggle from './Toggle.svelte';

	let {
		enabled = false,
		onToggle = () => {},
		isLoggedIn = false,
		lang = 'de'
	} = $props();

	const isEnglish = $derived(lang === 'en');
	const label = $derived(isEnglish ? 'Favorites Only' : 'Nur Favoriten');
	const loginRequiredLabel = $derived(isEnglish ? 'Login required' : 'Anmeldung erforderlich');

	let checked = $state(enabled);

	$effect(() => {
		checked = enabled;
	});

	function handleChange() {
		onToggle(checked);
	}
</script>

<style>
	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
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
		color: var(--nord6);
		font-weight: 600;
		margin-bottom: 0.25rem;
		text-align: center;
	}

	@media (max-width: 968px) {
		.filter-label {
			font-size: 0.85rem;
			text-align: left;
		}
	}

	.login-required {
		font-size: 0.85rem;
		color: var(--nord3);
		font-style: italic;
		padding: 0.5rem 0;
	}
</style>

<div class="filter-section">
	<div class="filter-label">{label}</div>
	{#if isLoggedIn}
		<Toggle
			bind:checked={checked}
			label=""
			on:change={handleChange}
		/>
	{:else}
		<div class="login-required">{loginRequiredLabel}</div>
	{/if}
</div>
