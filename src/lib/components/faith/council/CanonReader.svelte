<script lang="ts">
	/**
	 * One division of the Code of Canon Law — the title or chapter a canon
	 * stands in, as the book prints it, with each canon's number in the margin
	 * and addressable by `#c1055`.
	 */
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { Canon } from '$lib/faith/councilTypes';

	interface Props {
		lang: FaithLang;
		where: string[];
		canons: Canon[];
		/** Canons a citation asked for, marked so the eye finds them. */
		highlight?: { from: number; to: number } | null;
	}
	const { lang, where, canons, highlight = null }: Props = $props();
	const t = $derived(m[lang]);
	const marked = (n: number) => !!highlight && n >= highlight.from && n <= highlight.to;
</script>

<article class="code">
	<header>
		<p class="crumbs">{#each where.slice(0, -1) as crumb, i (i)}<span>{crumb}</span>{/each}</p>
		<h1>{where[where.length - 1] ?? t.canon_title}</h1>
		<p class="span">{t.canon_canon} {canons[0]?.n}–{canons[canons.length - 1]?.n}</p>
	</header>

	<div class="body">
		{#each canons as canon (canon.n)}
			<div class="text" id="c{canon.n}" class:marked={marked(canon.n)}>
				<p class="para">
					<a class="n" href="#c{canon.n}" aria-label="{t.canon_canon} {canon.n}">{canon.n}</a>{@html canon.html}
				</p>
			</div>
		{/each}
	</div>
</article>

<style>
	.code {
		--serif: Georgia, 'Noto Serif', 'Times New Roman', serif;
		--font-ui: Helvetica, Arial, 'Noto Sans', sans-serif;
		--measure: 40rem;
		--gutter: 3.5rem;
		font-family: var(--serif);
		font-size: 1.05rem;
		line-height: 1.65;
		color: var(--color-text-primary);
	}
	/* app.css sets the sans on `*`, which beats inheritance. */
	.code :global(*) {
		font-family: inherit;
	}

	header {
		max-width: var(--measure);
		margin: 0 auto 2.5rem;
		text-align: center;
	}
	.crumbs {
		margin: 0 0 0.75rem;
		font-family: var(--font-ui);
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		line-height: 1.5;
	}
	.crumbs span:not(:last-child)::after {
		content: ' › ';
	}
	h1 {
		font-size: var(--text-xl);
		font-weight: 600;
		line-height: 1.3;
		margin: 0;
		text-wrap: balance;
	}
	.span {
		margin: 0.5rem 0 0;
		font-family: var(--font-ui);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.body {
		margin-inline: auto;
		padding-left: var(--gutter);
		max-width: calc(var(--gutter) + var(--measure));
	}
	.text {
		scroll-margin-top: 6rem;
	}
	.para {
		position: relative;
		margin: 0 0 1.1rem;
	}
	.n {
		position: absolute;
		left: calc(var(--gutter) * -1);
		width: calc(var(--gutter) - 0.5rem);
		text-align: right;
		font-family: var(--font-ui);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		text-decoration: none;
		line-height: 1.9;
	}
	.n:hover,
	.n:focus-visible {
		color: var(--color-primary);
	}

	.text.marked,
	.text:target {
		background: color-mix(in srgb, var(--orange) 16%, transparent);
		border-radius: var(--radius-sm);
		box-shadow: 0 0 0 0.4rem color-mix(in srgb, var(--orange) 16%, transparent);
	}

	@media (max-width: 900px) {
		.code {
			--gutter: 0rem;
			font-size: 1rem;
		}
		.n {
			position: static;
			display: inline;
			width: auto;
			margin-right: 0.5ch;
			line-height: inherit;
		}
	}
</style>
