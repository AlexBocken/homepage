<script>
	import { createLanguageContext } from "$lib/contexts/languageContext.js";
	import LanguageToggle from "$lib/components/LanguageToggle.svelte";
	import LanguageSelector from "$lib/components/LanguageSelector.svelte";
	import Angelus from "$lib/components/prayers/Angelus.svelte";
	import "$lib/css/christ.css";

	// Create language context for prayer components
	createLanguageContext();
</script>

<svelte:head>
	<title>Angelus - The Angel of the Lord</title>
	<meta name="description" content="Pray the Angelus prayer in Latin, German, and English" />
</svelte:head>

<div class="angelus-page">
	<div class="header">
		<h1>Angelus</h1>
		<div class="controls">
			<LanguageSelector />
			<LanguageToggle />
		</div>
	</div>

	<div class="prayer-content">
		<Angelus />
	</div>
</div>

<style>
	.angelus-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	h1 {
		color: var(--nord6);
		margin: 0;
	}

	@media (prefers-color-scheme: light) {
		h1 {
			color: black;
		}
	}

	.controls {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.prayer-content {
		background-color: var(--accent-dark);
		padding: 2rem;
		border-radius: 0.5rem;
		box-shadow: 0 0 1em rgba(0, 0, 0, 0.5);
	}

	@media (max-width: 600px) {
		.header {
			flex-direction: column;
			align-items: flex-start;
		}

		.prayer-content {
			padding: 1rem;
		}
	}
</style>
