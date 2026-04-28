<script lang="ts">
	type Item = {
		id: string;
		n?: number;
		short: string;
		title?: string;
		href: string;
		group?: string;
	};

	type Props = {
		title: string;
		items: Item[];
		activeId: string;
		onItemClick?: (e: MouseEvent, id: string) => void;
	};

	let { title, items, activeId, onItemClick }: Props = $props();

	function handle(e: MouseEvent, id: string) {
		if (onItemClick) onItemClick(e, id);
	}

	function groupChanged(items: Item[], i: number): boolean {
		if (i === 0) return Boolean(items[0].group);
		return items[i].group !== items[i - 1].group;
	}
</script>

<aside class="toc" aria-label={title}>
	<div class="toc-title">{title}</div>
	<ol class="toc-list">
		{#each items as item, i (item.id)}
			{#if item.group && groupChanged(items, i)}
				<li class="toc-group">{item.group}</li>
			{/if}
			<li>
				<a
					href={item.href}
					class:active={activeId === item.id}
					class:no-num={item.n === undefined}
					onclick={(e) => handle(e, item.id)}
					title={item.title ?? item.short}
				>
					{#if item.n !== undefined}
						<span class="toc-num">{String(item.n).padStart(2, '0')}</span>
					{/if}
					<span class="toc-label">{item.short}</span>
				</a>
			</li>
		{/each}
	</ol>
</aside>

<style>
	.toc {
		position: fixed;
		left: 16px;
		top: 96px;
		max-height: calc(100vh - 120px);
		overflow-y: auto;
		width: 220px;
		padding: 14px 14px 14px 16px;
		background: color-mix(in oklab, var(--color-bg-secondary) 88%, transparent);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		z-index: 50;
		font-family: var(--font-sans);
		scrollbar-width: thin;
	}
	.toc-title {
		font-size: 0.7rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		margin: 0 0 10px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--color-border);
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
	}
	.toc-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.toc-group {
		font-size: 0.62rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		margin: 10px 0 4px;
		padding: 0 8px;
	}
	.toc-list li:first-child.toc-group {
		margin-top: 0;
	}
	.toc-list a {
		display: grid;
		grid-template-columns: 26px 1fr;
		align-items: baseline;
		gap: 8px;
		padding: 6px 8px;
		border-radius: var(--radius-sm);
		text-decoration: none;
		color: var(--color-text-secondary);
		font-size: 0.82rem;
		line-height: 1.25;
		border-left: 2px solid transparent;
		transition:
			background var(--transition-fast),
			color var(--transition-fast),
			border-color var(--transition-fast);
	}
	.toc-list a.no-num {
		grid-template-columns: 1fr;
	}
	.toc-list a:hover {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}
	.toc-list a.active {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		border-left-color: var(--color-primary);
		font-weight: 600;
	}
	.toc-num {
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
	.toc-list a.active .toc-num {
		color: var(--color-primary);
	}
	.toc-label {
		text-wrap: balance;
	}

	@media (max-width: 1180px) {
		.toc {
			display: none;
		}
	}
</style>
