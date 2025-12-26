<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let label: string;
	export let germanValue: string;
	export let englishValue: string;
	export let fieldName: string;
	export let readonly: boolean = false;
	export let multiline: boolean = false;

	const dispatch = createEventDispatcher();

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement | HTMLTextAreaElement;
		dispatch('change', {
			field: fieldName,
			value: target.value
		});
	}
</script>

<style>
.field-comparison {
	margin-bottom: 1rem;
}

.field-label {
	font-weight: 600;
	color: var(--nord4);
	margin-bottom: 0.5rem;
	font-size: 0.9rem;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

@media(prefers-color-scheme: light) {
	.field-label {
		color: var(--nord2);
	}
}

.field-value {
	padding: 0.75rem;
	background: var(--nord0);
	border-radius: 4px;
	color: var(--nord6);
	border: 1px solid var(--nord3);
	min-height: 3rem;
}

@media(prefers-color-scheme: light) {
	.field-value {
		background: var(--nord5);
		color: var(--nord0);
		border-color: var(--nord3);
	}
}

.field-value.readonly {
	opacity: 0.8;
}

input.field-value,
textarea.field-value {
	width: 100%;
	font-family: inherit;
	font-size: 1rem;
	box-sizing: border-box;
	resize: vertical;
}

input.field-value:focus,
textarea.field-value:focus {
	outline: 2px solid var(--nord14);
	border-color: var(--nord14);
}

textarea.field-value {
	min-height: 6rem;
}

.readonly-text {
	white-space: pre-wrap;
	word-wrap: break-word;
}

:global(.readonly-text strong) {
	display: block;
	margin-top: 1rem;
	margin-bottom: 0.5rem;
	color: var(--nord8);
}

:global(.readonly-text strong:first-child) {
	margin-top: 0;
}

:global(.readonly-text ul),
:global(.readonly-text ol) {
	margin: 0.5rem 0;
	padding-left: 1.5rem;
}

:global(.readonly-text li) {
	margin: 0.25rem 0;
	color: var(--nord4);
}

@media(prefers-color-scheme: light) {
	:global(.readonly-text strong) {
		color: var(--nord10);
	}

	:global(.readonly-text li) {
		color: var(--nord2);
	}
}
</style>

<div class="field-comparison">
	<div class="field-label">{label}</div>
	{#if readonly}
		<div class="field-value readonly readonly-text">
			{germanValue || '(empty)'}
		</div>
	{:else if multiline}
		<textarea
			class="field-value"
			value={englishValue}
			on:input={handleInput}
			placeholder="Enter {label.toLowerCase()}..."
		/>
	{:else}
		<input
			type="text"
			class="field-value"
			value={englishValue}
			on:input={handleInput}
			placeholder="Enter {label.toLowerCase()}..."
		/>
	{/if}
</div>
