<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { canonSlug, councilSlug, m, type FaithLang } from '$lib/js/faithI18n';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const sectionHref = (id: string) => resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/[catechism=catechismLang]/[ref=cccRef]', { faithLang: data.faithLang, katechese: data.katechese, catechism: data.catechism, ref: id });
	const registerHref = $derived(resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/[catechism=catechismLang]/register', { faithLang: data.faithLang, katechese: data.katechese, catechism: data.catechism }));
	const glossaryHref = $derived(resolve('/[faithLang=faithLang]/[katechese=katecheseLang]/[catechism=catechismLang]/glossar', { faithLang: data.faithLang, katechese: data.katechese, catechism: data.catechism }));
	// The two bodies the Catechism cites most after Scripture, and which its
	// footnotes now link into.
	const councilHref = $derived(resolve('/[faithLang=faithLang]/[council=councilLang]', { faithLang: data.faithLang, council: councilSlug(lang) }));
	const canonHref = $derived(resolve('/[faithLang=faithLang]/[canon=canonLang]', { faithLang: data.faithLang, canon: canonSlug(lang) }));

	/** "1322–1419", or nothing for a division that only holds other divisions. */
	const span = (range: [number, number] | null) => (range ? `${range[0]}–${range[1]}` : '');
</script>

<Seo title={`${t.ccc_title} — Bocken`} description={t.ccc_description} lang={lang} />

<article>
	<header>
		<h1>{t.ccc_title}</h1>
		<p class="lead">{t.ccc_description}</p>

		<form class="jump" method="GET" action="">
			<label for="ccc-jump">{t.ccc_search}</label>
			<div class="field">
				<input id="ccc-jump" name="n" type="text" inputmode="numeric" autocomplete="off" value={data.asked} placeholder={t.ccc_search_placeholder} aria-describedby="ccc-jump-hint" />
				<button type="submit">{t.ccc_search_go}</button>
			</div>
			<p class="hint" id="ccc-jump-hint">{t.ccc_search_hint}</p>
		</form>

		<nav class="ways">
			<a href={registerHref}>{t.ccc_register}</a>
			<a href={glossaryHref}>{t.ccc_glossary}</a>
			<a href={councilHref}>{t.council_title}</a>
			<a href={canonHref}>{t.canon_title}</a>
		</nav>
	</header>

	<nav aria-label={t.ccc_contents}>
		{#each data.toc as part (part.id)}
			<section class="part">
				<h2>
					{#if part.range}<a href={sectionHref(part.id)}>{part.title}</a>{:else}{part.title}{/if}
					{#if part.range}<span class="span">{span(part.range)}</span>{/if}
				</h2>
				{#each part.children as division (division.id)}
					<div class="division">
						<h3>
							{#if division.range}<a href={sectionHref(division.id)}>{division.title}</a>{:else}{division.title}{/if}
							{#if division.range}<span class="span">{span(division.range)}</span>{/if}
						</h3>
						{#each division.children as chapter (chapter.id)}
							<div class="chapter">
								<h4>
									{#if chapter.range}<a href={sectionHref(chapter.id)}>{chapter.title}</a>{:else}{chapter.title}{/if}
									{#if chapter.range}<span class="span">{span(chapter.range)}</span>{/if}
								</h4>
								{#if chapter.children.length}
									<ul>
										{#each chapter.children as article (article.id)}
											<li>
												<a href={sectionHref(article.id)}>{article.title}</a>
												<span class="span">{span(article.range)}</span>
												{#if article.children.length}
													<ul class="inner">
														{#each article.children as piece (piece.id)}
															<li><a href={sectionHref(piece.id)}>{piece.title}</a> <span class="span">{span(piece.range)}</span></li>
														{/each}
													</ul>
												{/if}
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
			</section>
		{/each}
	</nav>

	<footer>
		<p>{t.ccc_copyright}</p>
	</footer>
</article>

<style>
	article {
		max-width: 1000px;
		margin-inline: auto;
		padding-block: 2rem 4rem;
	}
	h1 {
		font-size: var(--text-2xl);
		text-align: center;
		margin-bottom: 0.5rem;
	}
	.lead {
		max-width: 60ch;
		margin: 0 auto 2rem;
		text-align: center;
		color: var(--color-text-secondary);
	}

	/* ---- the jump box ---- */
	.jump {
		max-width: 34rem;
		margin: 0 auto 3rem;
	}
	.jump label {
		display: block;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin-bottom: 0.4rem;
	}
	.field {
		display: flex;
		gap: 0.5rem;
	}
	input {
		flex: 1;
		min-width: 0;
		padding: 0.6em 1em;
		font: inherit;
		color: var(--color-text-primary);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
	}
	input:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}
	button {
		padding: 0.6em 1.4em;
		font: inherit;
		cursor: pointer;
		color: var(--color-text-on-primary);
		background: var(--color-primary);
		border: none;
		border-radius: var(--radius-pill);
		transition: background var(--transition-fast);
	}
	button:hover {
		background: var(--color-primary-hover);
	}
	.hint {
		margin: 0.5rem 0 0;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}
	.ways {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		/* The contents begin straight after, so the row needs room under it. */
		margin: 1.5rem 0 3rem;
	}
	.ways a {
		padding: 0.4em 1.1em;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: var(--text-sm);
		transition: color var(--transition-fast), border-color var(--transition-fast);
	}
	.ways a:hover,
	.ways a:focus-visible {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	/* ---- the contents ---- */
	.part {
		margin-bottom: 2.5rem;
		padding: 1.5rem;
		background: var(--color-surface);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-sm);
	}
	h2 {
		font-size: var(--text-xl);
		margin: 0 0 1rem;
		line-height: 1.3;
	}
	h3 {
		font-size: var(--text-lg);
		margin: 1.5rem 0 0.5rem;
		line-height: 1.3;
	}
	h4 {
		font-size: var(--text-base);
		font-weight: 600;
		margin: 1rem 0 0.3rem;
		color: var(--color-text-secondary);
		line-height: 1.3;
	}
	ul {
		margin: 0.25rem 0 0;
		padding-left: 1.1rem;
		list-style: none;
	}
	li {
		margin: 0.3rem 0;
		line-height: 1.4;
	}
	.inner {
		padding-left: 1rem;
		border-left: 1px solid var(--color-border);
		margin-top: 0.25rem;
	}
	/* app.css colours every link with `a:not(:visited)`, which has exactly the
	   specificity of a Svelte-scoped `a` rule — so which of the two wins comes
	   down to the order the stylesheets happen to land in, and the links flicker
	   to link-blue once the page hydrates. Matching its shape settles it. */
	a:not(:visited),
	a:visited {
		color: inherit;
		text-decoration: none;
		border-bottom: 1px solid transparent;
		transition: border-color var(--transition-fast), color var(--transition-fast);
	}
	a:hover,
	a:focus-visible {
		color: var(--color-primary);
		border-bottom-color: currentcolor;
	}
	.span {
		margin-left: 0.5ch;
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	footer {
		margin-top: 3rem;
		text-align: center;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	@media (max-width: 560px) {
		article {
			padding-inline: 1rem;
		}
		.part {
			padding: 1rem;
		}
		h1 {
			font-size: var(--text-xl);
		}
	}
</style>
