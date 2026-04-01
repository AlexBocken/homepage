<script>
	let { data } = $props();
	const isEnglish = data.lang === 'en';
	const recipeLang = data.recipeLang;

	let processing = $state(false);
	let singleProcessing = $state('');
	/** @type {any} */
	let batchResult = $state(null);
	/** @type {any} */
	let singleResult = $state(null);
	let errorMsg = $state('');
	let recipeName = $state('');

	async function generateAll() {
		processing = true;
		errorMsg = '';
		batchResult = null;

		try {
			const response = await fetch(`/api/${recipeLang}/nutrition/generate-all`, {
				method: 'POST',
			});
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to generate nutrition mappings');
			}

			batchResult = result;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			processing = false;
		}
	}

	async function generateSingle() {
		if (!recipeName.trim()) return;
		singleProcessing = recipeName.trim();
		singleResult = null;
		errorMsg = '';

		try {
			const response = await fetch(`/api/${recipeLang}/nutrition/generate/${encodeURIComponent(recipeName.trim())}`, {
				method: 'POST',
			});
			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || 'Failed to generate nutrition mappings');
			}

			singleResult = result;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			singleProcessing = '';
		}
	}
</script>

<style>
	.container {
		max-width: 1000px;
		margin: 2rem auto;
		padding: 2rem;
	}
	h1 {
		color: var(--nord0);
		margin-bottom: 0.5rem;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme="light"])) h1 { color: white; }
	}
	:global(:root[data-theme="dark"]) h1 { color: white; }

	.subtitle {
		color: var(--nord3);
		margin-bottom: 2rem;
	}

	.section {
		background: var(--nord6, #eceff4);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme="light"])) .section { background: var(--nord1); }
	}
	:global(:root[data-theme="dark"]) .section { background: var(--nord1); }

	.section h2 {
		margin-top: 0;
		font-size: 1.3rem;
	}

	.input-row {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.input-row input {
		flex: 1;
		min-width: 200px;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border, #ccc);
		border-radius: 6px;
		font-size: 1rem;
		background: transparent;
		color: inherit;
	}

	button {
		padding: 0.5rem 1.25rem;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		cursor: pointer;
		background: var(--nord10, #5e81ac);
		color: white;
		transition: opacity 150ms;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	button:hover:not(:disabled) {
		opacity: 0.85;
	}
	.btn-danger {
		background: var(--nord11, #bf616a);
	}

	.result-box {
		margin-top: 1rem;
		padding: 1rem;
		border-radius: 6px;
		background: var(--nord0, #2e3440);
		color: var(--nord6, #eceff4);
		font-family: monospace;
		font-size: 0.85rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.result-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	.result-table th,
	.result-table td {
		text-align: left;
		padding: 0.3rem 0.6rem;
		border-bottom: 1px solid var(--nord3, #4c566a);
	}
	.result-table th {
		color: var(--nord9, #81a1c1);
	}

	.coverage-bar {
		display: inline-block;
		height: 6px;
		border-radius: 3px;
		background: var(--nord14, #a3be8c);
		vertical-align: middle;
	}
	.coverage-bar-bg {
		display: inline-block;
		width: 60px;
		height: 6px;
		border-radius: 3px;
		background: var(--nord3, #4c566a);
		vertical-align: middle;
		margin-right: 0.4rem;
	}

	.error {
		color: var(--nord11, #bf616a);
		margin-top: 0.75rem;
		font-weight: bold;
	}

	.summary {
		display: flex;
		gap: 2rem;
		flex-wrap: wrap;
		margin-top: 0.75rem;
		font-size: 1.1rem;
	}
	.summary-stat {
		text-align: center;
	}
	.summary-stat .value {
		font-size: 1.8rem;
		font-weight: bold;
		color: var(--nord10, #5e81ac);
	}
	.summary-stat .label {
		font-size: 0.85rem;
		color: var(--nord3);
	}
</style>

<svelte:head>
	<title>{isEnglish ? 'Nutrition Mappings' : 'Nährwert-Zuordnungen'}</title>
</svelte:head>

<div class="container">
	<h1>{isEnglish ? 'Nutrition Mappings' : 'Nährwert-Zuordnungen'}</h1>
	<p class="subtitle">
		{isEnglish
			? 'Generate ingredient-to-calorie mappings using ML embeddings. Manually edited mappings are preserved.'
			: 'Zutatenzuordnungen zu Kaloriendaten mittels ML-Embeddings generieren. Manuell bearbeitete Zuordnungen bleiben erhalten.'}
	</p>

	<!-- Single recipe -->
	<div class="section">
		<h2>{isEnglish ? 'Single Recipe' : 'Einzelnes Rezept'}</h2>
		<div class="input-row">
			<input
				type="text"
				placeholder={isEnglish ? 'Recipe short_name (e.g., maccaroni)' : 'Rezept short_name (z.B. maccaroni)'}
				bind:value={recipeName}
				onkeydown={(e) => e.key === 'Enter' && generateSingle()}
			/>
			<button disabled={!!singleProcessing || !recipeName.trim()} onclick={generateSingle}>
				{singleProcessing ? (isEnglish ? 'Processing...' : 'Verarbeite...') : (isEnglish ? 'Generate' : 'Generieren')}
			</button>
		</div>

		{#if singleResult}
			<div class="result-box">
				<p>{singleResult.count} {isEnglish ? 'ingredients mapped' : 'Zutaten zugeordnet'}</p>
				<table class="result-table">
					<thead><tr><th>#</th><th>{isEnglish ? 'Ingredient' : 'Zutat'}</th><th>{isEnglish ? 'Match' : 'Treffer'}</th><th>{isEnglish ? 'Confidence' : 'Konfidenz'}</th><th>g/unit</th></tr></thead>
					<tbody>
						{#each singleResult.mappings as m, i}
							<tr>
								<td>{i + 1}</td>
								<td>{m.ingredientName}</td>
								<td>{m.nutritionDbName || '—'}</td>
								<td>{m.matchConfidence ? (m.matchConfidence * 100).toFixed(0) + '%' : '—'}</td>
								<td>{m.gramsPerUnit || '—'}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Batch all recipes -->
	<div class="section">
		<h2>{isEnglish ? 'Batch: All Recipes' : 'Batch: Alle Rezepte'}</h2>
		<p>{isEnglish
			? 'Regenerate nutrition mappings for all recipes. This may take a few minutes on first run (ML model loading).'
			: 'Nährwertzuordnungen für alle Rezepte neu generieren. Beim ersten Durchlauf kann dies einige Minuten dauern (ML-Modell wird geladen).'}
		</p>
		<button class="btn-danger" disabled={processing} onclick={generateAll}>
			{processing ? (isEnglish ? 'Processing all recipes...' : 'Verarbeite alle Rezepte...') : (isEnglish ? 'Generate All' : 'Alle generieren')}
		</button>

		{#if batchResult}
			<div class="summary">
				<div class="summary-stat">
					<div class="value">{batchResult.recipes}</div>
					<div class="label">{isEnglish ? 'Recipes' : 'Rezepte'}</div>
				</div>
				<div class="summary-stat">
					<div class="value">{batchResult.totalMapped}/{batchResult.totalIngredients}</div>
					<div class="label">{isEnglish ? 'Ingredients Mapped' : 'Zutaten zugeordnet'}</div>
				</div>
				<div class="summary-stat">
					<div class="value">{batchResult.coverage}</div>
					<div class="label">{isEnglish ? 'Coverage' : 'Abdeckung'}</div>
				</div>
			</div>

			<div class="result-box">
				<table class="result-table">
					<thead><tr><th>{isEnglish ? 'Recipe' : 'Rezept'}</th><th>{isEnglish ? 'Mapped' : 'Zugeordnet'}</th><th>{isEnglish ? 'Coverage' : 'Abdeckung'}</th></tr></thead>
					<tbody>
						{#each batchResult.details as detail}
							<tr>
								<td>{detail.name}</td>
								<td>{detail.mapped}/{detail.total}</td>
								<td>
									<span class="coverage-bar-bg">
										<span class="coverage-bar" style="width: {detail.total ? (detail.mapped / detail.total * 60) : 0}px"></span>
									</span>
									{detail.total ? Math.round(detail.mapped / detail.total * 100) : 0}%
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	{#if errorMsg}
		<p class="error">{errorMsg}</p>
	{/if}
</div>
