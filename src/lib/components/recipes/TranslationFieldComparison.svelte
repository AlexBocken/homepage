<script lang="ts">
	interface Props {
		label: string;
		germanValue: string;
		englishValue: string;
		fieldName: string;
		readonly?: boolean;
		multiline?: boolean;
		onchange?: (value: string) => void;
	}

	let {
		label,
		germanValue,
		englishValue,
		fieldName,
		readonly = false,
		multiline = false,
		onchange
	}: Props = $props();

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement | HTMLTextAreaElement;
		onchange?.(target.value);
	}
</script>

<style>
.field-comparison {
	margin-bottom: 1rem;
}

.field-label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-weight: 600;
	color: var(--color-text-secondary);
	margin-bottom: 0.4rem;
	font-size: var(--text-sm);
	text-transform: uppercase;
	letter-spacing: 0.06em;
}
.field-label::before{
	content: '';
	width: 0.35rem;
	height: 0.35rem;
	border-radius: 50%;
	background: var(--color-primary);
}

.pair {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 0.75rem;
	align-items: stretch;
}
@media (max-width: 640px) {
	.pair {
		grid-template-columns: 1fr;
	}
}

.lang-column {
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
	min-width: 0;
}
.lang-chip {
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	color: var(--color-text-tertiary);
	display: flex;
	align-items: center;
	gap: 0.35rem;
}

.field-value {
	padding: 0.6rem 0.75rem;
	background: var(--color-bg-tertiary);
	border-radius: var(--radius-md);
	color: var(--color-text-primary);
	border: 1px solid var(--color-border);
	min-height: 2.6rem;
	font-size: 0.95rem;
	box-sizing: border-box;
	width: 100%;
	font-family: inherit;
	transition: border-color 150ms ease, box-shadow 150ms ease;
}

.field-value.readonly {
	background: var(--color-bg-secondary);
	color: var(--color-text-secondary);
	opacity: 0.95;
}

input.field-value,
textarea.field-value {
	resize: vertical;
}

input.field-value:focus,
textarea.field-value:focus {
	outline: none;
	border-color: var(--color-primary);
	box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
}

textarea.field-value {
	min-height: 5rem;
}

.readonly-text {
	white-space: pre-wrap;
	word-wrap: break-word;
}

:global(.readonly-text strong) {
	display: block;
	margin-top: 0.75rem;
	margin-bottom: 0.35rem;
	color: var(--color-primary);
}
:global(.readonly-text strong:first-child) {
	margin-top: 0;
}

:global(.readonly-text ul),
:global(.readonly-text ol) {
	margin: 0.4rem 0;
	padding-left: 1.25rem;
}

:global(.readonly-text li) {
	margin: 0.2rem 0;
	color: var(--color-text-secondary);
}
</style>

<div class="field-comparison">
	<div class="field-label">{label}</div>
	<div class="pair">
		<div class="lang-column">
			<span class="lang-chip">Deutsch</span>
			<div class="field-value readonly readonly-text">
				{germanValue || '—'}
			</div>
		</div>
		<div class="lang-column">
			<span class="lang-chip">English</span>
			{#if readonly}
				<div class="field-value readonly readonly-text">
					{englishValue || '—'}
				</div>
			{:else if multiline}
				<textarea
					class="field-value"
					value={englishValue}
					oninput={handleInput}
					placeholder="Enter {label.toLowerCase()}…"
				></textarea>
			{:else}
				<input
					type="text"
					class="field-value"
					value={englishValue}
					oninput={handleInput}
					placeholder="Enter {label.toLowerCase()}…"
				/>
			{/if}
		</div>
	</div>
</div>
