<script lang="ts">
	import Sparkles from '@lucide/svelte/icons/sparkles';

	/**
	 * Ask the server to describe a recipe image. The endpoint writes both the
	 * German and the English alt text straight to the recipe, so the caller has to
	 * catch up somehow: pass `onGenerated` and the new text is handed over to be
	 * dropped into the form's own state. Without it the page reloads to pick the
	 * change up, which is only safe where nothing is half-edited.
	 */
	let { shortName, imageIndex, onGenerated = undefined } = $props<{
		shortName: string;
		imageIndex: number;
		onGenerated?: (alt: { de: string; en: string }) => void;
	}>();

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
				body: JSON.stringify({ shortName, imageIndex })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Failed to generate alt text');
			}

			if (onGenerated) {
				onGenerated(data.altText);
				success = 'Alt text written into the fields — save to keep it.';
			} else {
				success = `Generated: DE: "${data.altText.de}" | EN: "${data.altText.en}"`;
				setTimeout(() => window.location.reload(), 2000);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}
</script>

<button type="button" class="gen-btn" onclick={generateAltText} disabled={loading}>
	<Sparkles size={14} />
	{loading ? 'Describing image…' : 'Describe image (AI)'}
</button>

{#if success}
	<p class="message success">{success}</p>
{/if}

{#if error}
	<p class="message error">{error}</p>
{/if}

<style>
	.gen-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.85rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--color-text-secondary);
		font: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: color var(--transition-fast, 120ms), border-color var(--transition-fast, 120ms);
	}
	.gen-btn:hover:not(:disabled) {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
	.gen-btn:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}
	.gen-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.message {
		margin: 0.4rem 0 0;
		font-size: 0.78rem;
		line-height: 1.4;
	}
	.success { color: var(--green); }
	.error { color: var(--red); }
</style>
