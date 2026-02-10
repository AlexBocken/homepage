<script lang="ts">
	let { shortName, imageIndex } = $props<{ shortName: string; imageIndex: number }>();

	let loading = $state(false);
	let error = $state('');
	let success = $state('');

	async function generateAltText() {
		loading = true;
		error = '';
		success = '';

		try {
			const response = await fetch('/api/generate-alt-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shortName,
					imageIndex,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to generate alt text');
			}

			success = `Generated: DE: "${data.altText.de}" | EN: "${data.altText.en}"`;

			// Reload page to show updated alt text
			setTimeout(() => {
				window.location.reload();
			}, 2000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<style>
	button {
		padding: 0.5rem 1rem;
		background-color: var(--nord8);
		color: white;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background-color 0.2s;
	}

	button:hover {
		background-color: var(--nord7);
	}

	button:disabled {
		background-color: var(--nord3);
		cursor: not-allowed;
	}

	.message {
		margin-top: 0.5rem;
		padding: 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.85rem;
	}

	.success {
		background-color: var(--nord14);
		color: var(--nord0);
	}

	.error {
		background-color: var(--nord11);
		color: white;
	}
</style>

<button onclick={generateAltText} disabled={loading}>
	{loading ? '🤖 Generating...' : '✨ Generate Alt Text (AI)'}
</button>

{#if success}
	<div class="message success">{success}</div>
{/if}

{#if error}
	<div class="message error">{error}</div>
{/if}
