<script lang="ts">
	let {
		value = $bindable(''),
		unit = undefined,
		readonly = false,
		status = 'idle',
		onsubmit
	}: {
		value?: string;
		unit?: string;
		readonly?: boolean;
		/** Colours the box after grading. */
		status?: 'idle' | 'correct' | 'wrong';
		onsubmit: () => void;
	} = $props();

	let input: HTMLInputElement | undefined = $state();

	export function focus() {
		input?.focus();
	}

	// Number pads on phones have no letters or minus, so offer the few that answers need.
	const KEYS = ['k', 'M', 'B', '%', '−', '/'];

	function append(key: string) {
		if (readonly) return;
		value = key === '−' ? (value.startsWith('-') ? value.slice(1) : `-${value}`) : value + key;
		input?.focus();
	}
</script>

<form
	class="answer"
	onsubmit={(e) => {
		e.preventDefault();
		onsubmit();
	}}
>
	<div class="box" class:correct={status === 'correct'} class:wrong={status === 'wrong'}>
		<input
			bind:this={input}
			bind:value
			{readonly}
			inputmode="decimal"
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck="false"
			enterkeyhint="go"
			aria-label="Your answer"
			placeholder="Answer"
		/>
		{#if unit}<span class="unit">{unit}</span>{/if}
	</div>
	<div class="keys" aria-label="Insert">
		{#each KEYS as key (key)}
			<button type="button" tabindex="-1" onclick={() => append(key)} disabled={readonly}>{key}</button>
		{/each}
	</div>
</form>

<style>
	.answer {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.box {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--color-bg-tertiary);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 0.25rem 1rem;
		transition: border-color var(--transition-normal);
	}
	.box:focus-within {
		border-color: var(--color-primary);
	}
	.box.correct {
		border-color: var(--green);
	}
	.box.wrong {
		border-color: var(--red);
	}
	input {
		flex: 1;
		min-width: 0;
		background: none;
		border: none;
		outline: none;
		color: var(--color-text-primary);
		font-size: 1.8rem;
		padding: 0.4rem 0;
	}
	.unit {
		color: var(--color-text-secondary);
		font-size: 1.1rem;
	}
	.keys {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}
	.keys button {
		flex: 1;
		min-width: 2.6rem;
		padding: 0.45rem 0;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-size: 1rem;
		cursor: pointer;
		transition: background var(--transition-fast);
	}
	.keys button:hover:not(:disabled) {
		background: var(--color-bg-elevated);
	}
	/* The pad keys only help on touch screens; a keyboard types them directly. */
	@media (hover: hover) and (pointer: fine) {
		.keys {
			display: none;
		}
	}
</style>
