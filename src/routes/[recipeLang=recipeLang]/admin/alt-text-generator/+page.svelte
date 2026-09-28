<script lang="ts">
	import { onMount } from 'svelte';

	let stats = $state({
		totalWithImages: 0,
		missingAltText: 0,
		ollamaAvailable: false,
	});

	let processing = $state(false);
	let elapsed = $state(0);
	let filter = $state<'missing' | 'all'>('missing');
	let limit = $state(10);
	let results = $state<any[]>([]);
	let error = $state('');

	onMount(async () => {
		await fetchStats();
	});

	async function fetchStats() {
		try {
			const response = await fetch('/api/generate-alt-text-bulk');
			if (response.ok) {
				stats = await response.json();
			}
		} catch (err) {
			console.error('Failed to fetch stats:', err);
		}
	}

	async function processBatch() {
		processing = true;
		error = '';
		results = [];
		elapsed = 0;

		const startedAt = Date.now();
		const ticker = setInterval(() => {
			elapsed = Math.round((Date.now() - startedAt) / 1000);
		}, 1000);

		console.log('[alt-text] POST /api/generate-alt-text-bulk', { filter, limit });

		try {
			const response = await fetch('/api/generate-alt-text-bulk', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filter, limit }),
			});

			console.log(
				`[alt-text] response headers after ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
				response.status,
				response.headers.get('content-type')
			);

			// Read as text first: a proxy timeout or crash returns HTML, and response.json()
			// would throw an unhelpful "Unexpected token '<'" that hides the real status.
			const raw = await response.text();
			console.log(
				`[alt-text] body read after ${((Date.now() - startedAt) / 1000).toFixed(1)}s, ${raw.length} bytes:`,
				raw.slice(0, 500)
			);

			let data: any;
			try {
				data = JSON.parse(raw);
			} catch {
				throw new Error(`Server returned non-JSON (${response.status}): ${raw.slice(0, 200)}`);
			}

			if (!response.ok) {
				throw new Error(data.message || 'Failed to process batch');
			}

			results = data.results || [];
			console.log('[alt-text] done', data);

			// Refresh stats
			await fetchStats();
		} catch (err) {
			console.error('[alt-text] request failed:', err);
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			clearInterval(ticker);
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
		color: light-dark(var(--nord0), white);
		margin-bottom: 2rem;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		padding: 1.5rem;
		background-color: light-dark(var(--nord6), var(--nord0));
		border-radius: 0.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

	.status-indicator {
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		margin-left: 0.5rem;
	}

	.status-ok {
		background-color: var(--nord14);
	}

	.status-error {
		background-color: var(--nord11);
	}

	.controls {
		background-color: light-dark(var(--nord6), var(--nord1));
		padding: 1.5rem;
		border-radius: 0.5rem;
		margin-bottom: 2rem;
	}

	.control-group {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: bold;
	}

	select,
	input {
		padding: 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid light-dark(var(--nord4), var(--nord2));
		background-color: light-dark(white, var(--nord0));
		color: light-dark(FieldText, white);
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

	button:hover {
		background-color: var(--nord7);
	}

	button:disabled {
		background-color: var(--nord3);
		cursor: not-allowed;
	}

	.results {
		margin-top: 2rem;
	}

	.result-item {
		padding: 1rem;
		background-color: light-dark(var(--nord6), var(--nord1));
		border-radius: 0.25rem;
		margin-bottom: 0.5rem;
	}

	.error {
		padding: 1rem;
		background-color: var(--nord11);
		color: white;
		border-radius: 0.25rem;
		margin-bottom: 1rem;
	}

	.warning {
		padding: 1rem;
		background-color: var(--nord13);
		color: var(--nord0);
		border-radius: 0.25rem;
		margin-bottom: 1rem;
	}
</style>

<svelte:head><title>AI Alt Text Generator - Bocken</title></svelte:head>

<div class="container">
	<h1>🤖 AI Alt Text Generator</h1>

	<div class="stats">
		<div class="stat-card">
			<div class="stat-label">Total Recipes with Images</div>
			<div class="stat-value">{stats.totalWithImages}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">Missing Alt Text</div>
			<div class="stat-value">{stats.missingAltText}</div>
		</div>
		<div class="stat-card">
			<div class="stat-label">
				Ollama Status
				<span class="status-indicator" class:status-ok={stats.ollamaAvailable} class:status-error={!stats.ollamaAvailable}></span>
			</div>
			<div class="stat-value">{stats.ollamaAvailable ? 'Online' : 'Offline'}</div>
		</div>
	</div>

	{#if !stats.ollamaAvailable}
		<div class="warning">
			⚠️ Ollama is not running. Please start Ollama with: <code>ollama serve</code>
		</div>
	{/if}

	<div class="controls">
		<div class="control-group">
			<label for="filter">Filter:</label>
			<select id="filter" bind:value={filter}>
				<option value="missing">Only Missing Alt Text</option>
				<option value="all">All Recipes (Regenerate)</option>
			</select>
		</div>

		<div class="control-group">
			<label for="limit">Batch Size:</label>
			<input id="limit" type="number" bind:value={limit} min="1" max="100" />
		</div>

		<button onclick={processBatch} disabled={processing || !stats.ollamaAvailable}>
			{processing ? `🔄 Processing... (${elapsed}s)` : '✨ Generate Alt Texts'}
		</button>
	</div>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	{#if results.length > 0}
		<div class="results">
			<h2>Results</h2>
			{#each results as result}
				<div class="result-item">
					<strong>{result.name}</strong> ({result.shortName})
					<br />
					Processed: {result.processed} | Failed: {result.failed}
				</div>
			{/each}
		</div>
	{/if}
</div>
