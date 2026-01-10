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
	const label = $derived(isEnglish ? 'Favorites' : 'Favoriten');

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
</style>

<div class="filter-section">
	<div class="filter-label">{label}</div>
	<Toggle
		bind:checked={checked}
		label=""
		onchange={handleChange}
	/>
</div>
