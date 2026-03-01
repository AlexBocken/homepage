<script>
	import { onMount } from 'svelte';

	let stats = $state({
		totalWithImages: 0,
		missingColor: 0,
		withColor: 0,
	});

	let processing = $state(false);
	let filter = $state('missing');
	let limit = $state(50);
	let results = $state([]);
	let errorMsg = $state('');

	onMount(async () => {
		await fetchStats();
	});

	async function fetchStats() {
		try {
			const response = await fetch('/api/recalculate-image-colors');
			if (response.ok) {
				stats = await response.json();
			}
		} catch (err) {
			console.error('Failed to fetch stats:', err);
		}
	}

	async function processBatch() {
		processing = true;
		errorMsg = '';
		results = [];

		try {
			const response = await fetch('/api/recalculate-image-colors', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filter, limit }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to process batch');
			}

			results = data.results || [];
			await fetchStats();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			processing = false;
		}
	}
</script>

<style>
	.container {
		max-width: 1200px;
		margin: 2rem auto;
		padding: 2rem;
	}
	h1 {
		color: var(--nord0);
		margin-bottom: 2rem;
	}
	@media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) h1 { color: white; }
  }
:global(:root[data-theme="dark"]) h1 {
	color: white;
}
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.stat-card {
		padding: 1.5rem;
		background-color: var(--nord6);
		border-radius: 0.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
	@media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .stat-card { background-color: var(--nord0); }
  }
:global(:root[data-theme="dark"]) .stat-card {
	background-color: var(--nord0);
}
	.stat-label {
		font-size: 0.9rem;
		color: var(--nord3);
		margin-bottom: 0.5rem;
	}
	.stat-value {
		font-size: 2rem;
		font-weight: bold;
		color: var(--nord10);
	}
	.controls {
		background-color: var(--nord6);
		padding: 1.5rem;
		border-radius: 0.5rem;
		margin-bottom: 2rem;
	}
	@media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .controls { background-color: var(--nord1); }
  }
:global(:root[data-theme="dark"]) .controls {
	background-color: var(--nord1);
}
	.control-group {
		margin-bottom: 1rem;
	}
	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
	}
	select, input {
		padding: 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid var(--nord4);
		background-color: white;
	}
	@media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) select,
:global(:root:not([data-theme="light"])) input {
			background-color: var(--nord0);
			color: white;
			border-color: var(--nord2);
		}
  }
:global(:root[data-theme="dark"]) select,
:global(:root[data-theme="dark"]) input {
	background-color: var(--nord0);
			color: white;
			border-color: var(--nord2);
}
	button {
		padding: 0.75rem 1.5rem;
		background-color: var(--nord8);
		color: white;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 1rem;
		font-weight: bold;
		transition: background-color 0.2s;
	}
	button:hover { background-color: var(--nord7); }
	button:disabled {
		background-color: var(--nord3);
		cursor: not-allowed;
	}
	.results {
		margin-top: 2rem;
	}
	.result-item {
		padding: 1rem;
		background-color: var(--nord6);
		border-radius: 0.25rem;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	@media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .result-item { background-color: var(--nord1); }
  }
:global(:root[data-theme="dark"]) .result-item {
	background-color: var(--nord1);
}
	.color-swatch {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.25rem;
		border: 1px solid var(--nord4);
		flex-shrink: 0;
	}
	.result-info {
		flex: 1;
	}
	.result-error {
		color: var(--nord11);
		font-size: 0.85rem;
	}
	.error {
		padding: 1rem;
		background-color: var(--nord11);
		color: white;
		border-radius: 0.25rem;
		margin-bottom: 1rem;
	}
</style>

<div class="container">
	<h1>Image Dominant Colors</h1>

	<div class="stats">
		<div class="stat-card">
			<div class="stat-label">Recipes with Images</div>
			<div class="stat-value">{stats.totalWithImages}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Missing Color</div>
			<div class="stat-value">{stats.missingColor}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">With Color</div>
			<div class="stat-value">{stats.withColor}</div>
		</div>
	</div>

	<div class="controls">
		<div class="control-group">
			<label for="filter">Filter:</label>
			<select id="filter" bind:value={filter}>
				<option value="missing">Only Missing Colors</option>
				<option value="all">All Recipes (Recalculate)</option>
			</select>
		</div>

		<div class="control-group">
			<label for="limit">Batch Size:</label>
			<input id="limit" type="number" bind:value={limit} min="1" max="500" />
		</div>

		<button onclick={processBatch} disabled={processing}>
			{processing ? 'Processing...' : 'Extract Colors'}
		</button>
	</div>

	{#if errorMsg}
		<div class="error">{errorMsg}</div>
	{/if}

	{#if results.length > 0}
		<div class="results">
			<h2>Results ({results.filter(r => r.status === 'ok').length} ok, {results.filter(r => r.status === 'error').length} failed)</h2>
			{#each results as result}
				<div class="result-item">
					{#if result.status === 'ok'}
						<div class="color-swatch" style="background-color: {result.color}"></div>
					{/if}
					<div class="result-info">
						<strong>{result.name}</strong> ({result.shortName})
						{#if result.status === 'ok'}
							<code>{result.color}</code>
						{/if}
						{#if result.status === 'error'}
							<div class="result-error">{result.error}</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
