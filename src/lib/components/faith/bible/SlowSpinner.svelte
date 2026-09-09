<script lang="ts">
	/**
	 * What a peek or a sheet shows while its fetch is out. A quick answer keeps
	 * the quiet ellipsis those panels always had; only once the wait passes
	 * `delay` does a turning ring take its place, so a slow network says
	 * something is happening and a fast one never flashes a spinner.
	 *
	 * Mount it only while the fetch is out — the timer runs from mount, and
	 * unmounting is what cancels it.
	 */
	import { onMount } from 'svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	interface Props {
		/** Announced while the ring turns, and shown in place of it when the reader asks for less motion. */
		label: string;
		/** How long the fetch may take before the ring appears. */
		delay?: number;
	}
	const { label, delay = 400 }: Props = $props();

	let slow = $state(false);
	onMount(() => {
		const timer = setTimeout(() => (slow = true), delay);
		return () => clearTimeout(timer);
	});
</script>

<p class="wait" role="status">
	{#if slow}
		<LoaderCircle size={15} strokeWidth={2.2} aria-hidden="true" />
		<span class="label">{label}</span>
	{:else}
		<span aria-hidden="true">…</span>
	{/if}
</p>

<style>
	.wait {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		color: var(--color-text-secondary);
		font-family: var(--font-ui, Helvetica, Arial, 'Noto Sans', sans-serif);
		font-size: 0.78rem;
	}
	.wait :global(svg) {
		flex: none;
		animation: peek-spin 0.85s linear infinite;
	}
	/* The label is for screen readers; the turning ring carries it visually. */
	.label {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	@keyframes peek-spin {
		to {
			transform: rotate(360deg);
		}
	}
	/* No turning for a reader who asked for less motion: the words say it instead. */
	@media (prefers-reduced-motion: reduce) {
		.wait :global(svg) {
			display: none;
		}
		.label {
			position: static;
			width: auto;
			height: auto;
			margin: 0;
			overflow: visible;
			clip-path: none;
		}
	}
</style>
