<script>

	let {
		tag = '',
		selected = false,
		onToggle = () => {},
		removable = true
	} = $props();

	function handleClick() {
		onToggle(tag);
	}
</script>

<style>
	.tag-chip {
		all: unset;
		padding: 0.4rem 0.8rem;
		border-radius: 1000px;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 100ms ease;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		user-select: none;
		white-space: nowrap;
	}

	.tag-chip.available {
		background: var(--nord2);
		color: var(--nord6);
	}

	.tag-chip.available:hover {
		background: var(--nord3);
		transform: scale(1.05);
	}

	.tag-chip.selected {
		background: var(--nord10);
		color: white;
	}

	.tag-chip.selected:hover {
		background: var(--nord9);
		transform: scale(1.05);
	}

	.tag-chip:active {
		transform: scale(0.95);
	}

	.remove-icon {
		font-size: 0.8rem;
		font-weight: bold;
		margin-left: 0.2rem;
	}
</style>

<button
	class="tag-chip"
	class:available={!selected}
	class:selected={selected}
	onclick={handleClick}
	type="button"
	aria-pressed={selected}
>
	{tag}
	{#if selected && removable}
		<span class="remove-icon" aria-hidden="true">×</span>
	{/if}
</button>
