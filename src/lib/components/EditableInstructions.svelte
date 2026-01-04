<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let instructions: any[] = [];
	export let translationMetadata: any[] | null | undefined = null;

	const dispatch = createEventDispatcher();

	function handleChange() {
		dispatch('change', { instructions });
	}

	function updateInstructionGroupName(groupIndex: number, event: Event) {
		const target = event.target as HTMLInputElement;
		instructions[groupIndex].name = target.value;
		handleChange();
	}

	function updateStep(groupIndex: number, stepIndex: number, event: Event) {
		const target = event.target as HTMLTextAreaElement;
		instructions[groupIndex].steps[stepIndex] = target.value;
		handleChange();
	}

	// Base recipe reference handlers
	function updateLabelOverride(groupIndex: number, event: Event) {
		const target = event.target as HTMLInputElement;
		instructions[groupIndex].labelOverride = target.value;
		handleChange();
	}

	function updateStepBefore(groupIndex: number, stepIndex: number, event: Event) {
		const target = event.target as HTMLTextAreaElement;
		if (!instructions[groupIndex].stepsBefore) {
			instructions[groupIndex].stepsBefore = [];
		}
		instructions[groupIndex].stepsBefore[stepIndex] = target.value;
		handleChange();
	}

	function updateStepAfter(groupIndex: number, stepIndex: number, event: Event) {
		const target = event.target as HTMLTextAreaElement;
		if (!instructions[groupIndex].stepsAfter) {
			instructions[groupIndex].stepsAfter = [];
		}
		instructions[groupIndex].stepsAfter[stepIndex] = target.value;
		handleChange();
	}

	// Check if a group name was re-translated
	function isGroupNameTranslated(groupIndex: number): boolean {
		return translationMetadata?.[groupIndex]?.nameTranslated ?? false;
	}

	// Check if a specific step was re-translated
	function isStepTranslated(groupIndex: number, stepIndex: number): boolean {
		return translationMetadata?.[groupIndex]?.stepsTranslated?.[stepIndex] ?? false;
	}
</script>

<style>
.instructions-editor {
	background: var(--nord0);
	border: 1px solid var(--nord3);
	border-radius: 4px;
	padding: 0.75rem;
}

@media(prefers-color-scheme: light) {
	.instructions-editor {
		background: var(--nord5);
		border-color: var(--nord3);
	}
}

.instruction-group {
	margin-bottom: 1.5rem;
}

.instruction-group:last-child {
	margin-bottom: 0;
}

.group-name {
	width: 100%;
	padding: 0.5rem;
	margin-bottom: 0.5rem;
	background: var(--nord1);
	border: 1px solid var(--nord3);
	border-radius: 4px;
	color: var(--nord6);
	font-weight: 600;
	font-size: 0.95rem;
}

@media(prefers-color-scheme: light) {
	.group-name {
		background: var(--nord6);
		color: var(--nord0);
	}
}

.step-item {
	margin-bottom: 0.75rem;
	display: flex;
	gap: 0.5rem;
	align-items: flex-start;
}

.step-number {
	min-width: 2rem;
	padding: 0.4rem 0.5rem;
	background: var(--nord3);
	border-radius: 4px;
	text-align: center;
	color: var(--nord6);
	font-weight: 600;
	font-size: 0.9rem;
}

@media(prefers-color-scheme: light) {
	.step-number {
		background: var(--nord4);
		color: var(--nord0);
	}
}

.step-item textarea {
	flex: 1;
	padding: 0.5rem;
	background: var(--nord1);
	border: 1px solid var(--nord3);
	border-radius: 4px;
	color: var(--nord6);
	font-size: 0.9rem;
	font-family: inherit;
	resize: vertical;
	min-height: 3rem;
}

@media(prefers-color-scheme: light) {
	.step-item textarea {
		background: var(--nord6);
		color: var(--nord0);
	}
}

.step-item textarea:focus {
	outline: 2px solid var(--nord14);
	border-color: var(--nord14);
}

/* Highlight re-translated items with red border */
.retranslated {
	border: 2px solid var(--nord11) !important;
	animation: highlight-flash 0.6s ease-out;
}

@keyframes highlight-flash {
	0% {
		box-shadow: 0 0 10px var(--nord11);
	}
	100% {
		box-shadow: 0 0 0 transparent;
	}
}

.reference-badge {
	display: inline-block;
	padding: 0.25rem 0.5rem;
	background: var(--nord9);
	color: var(--nord6);
	border-radius: 4px;
	font-size: 0.75rem;
	font-weight: 600;
	margin-bottom: 0.5rem;
}

.reference-section {
	padding: 0.5rem;
	background: var(--nord2);
	border-radius: 4px;
	margin-bottom: 0.5rem;
}

@media(prefers-color-scheme: light) {
	.reference-section {
		background: var(--nord4);
	}
}

.reference-section-label {
	font-size: 0.8rem;
	font-weight: 600;
	color: var(--nord8);
	margin-bottom: 0.25rem;
}
</style>

<div class="instructions-editor">
	{#each instructions as group, groupIndex}
		<div class="instruction-group">
			{#if group.type === 'reference'}
				<span class="reference-badge">🔗 Base Recipe Reference</span>

				{#if group.labelOverride !== undefined}
					<input
						type="text"
						class="group-name"
						value={group.labelOverride || ''}
						on:input={(e) => updateLabelOverride(groupIndex, e)}
						placeholder="Label override (optional)"
					/>
				{/if}

				{#if group.stepsBefore && group.stepsBefore.length > 0}
					<div class="reference-section">
						<div class="reference-section-label">Steps Before Base Recipe:</div>
						{#each group.stepsBefore as step, stepIndex}
							<div class="step-item">
								<div class="step-number">{stepIndex + 1}</div>
								<textarea
									class:retranslated={isStepTranslated(groupIndex, stepIndex)}
									value={step || ''}
									on:input={(e) => updateStepBefore(groupIndex, stepIndex, e)}
									placeholder="Step description"
								/>
							</div>
						{/each}
					</div>
				{/if}

				{#if group.stepsAfter && group.stepsAfter.length > 0}
					<div class="reference-section">
						<div class="reference-section-label">Steps After Base Recipe:</div>
						{#each group.stepsAfter as step, stepIndex}
							<div class="step-item">
								<div class="step-number">{stepIndex + 1}</div>
								<textarea
									class:retranslated={isStepTranslated(groupIndex, stepIndex)}
									value={step || ''}
									on:input={(e) => updateStepAfter(groupIndex, stepIndex, e)}
									placeholder="Step description"
								/>
							</div>
						{/each}
					</div>
				{/if}
			{:else}
				<input
					type="text"
					class="group-name"
					class:retranslated={isGroupNameTranslated(groupIndex)}
					value={group.name || ''}
					on:input={(e) => updateInstructionGroupName(groupIndex, e)}
					placeholder="Instruction section name"
				/>
				{#each group.steps as step, stepIndex}
					<div class="step-item">
						<div class="step-number">{stepIndex + 1}</div>
						<textarea
							class:retranslated={isStepTranslated(groupIndex, stepIndex)}
							value={step || ''}
							on:input={(e) => updateStep(groupIndex, stepIndex, e)}
							placeholder="Step description"
						/>
					</div>
				{/each}
			{/if}
		</div>
	{/each}
</div>
