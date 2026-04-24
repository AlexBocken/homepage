<script lang="ts">
  import type { Snippet, Component } from 'svelte';
  import Lock from '@lucide/svelte/icons/lock';
  import Ban from '@lucide/svelte/icons/ban';
  import SearchX from '@lucide/svelte/icons/search-x';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  interface BibleQuote {
    text: string;
    reference: string;
  }

  interface Props {
    status: number;
    title: string;
    description: string;
    details?: string;
    bibleQuote?: BibleQuote | null;
    isEnglish?: boolean;
    icon?: Component;
    actions?: Snippet;
  }

  let {
    status,
    title,
    description,
    details,
    bibleQuote,
    isEnglish = true,
    icon,
    actions
  }: Props = $props();

  function defaultIcon(status: number): Component {
    switch (status) {
      case 401: return Lock;
      case 403: return Ban;
      case 404: return SearchX;
      case 500: return TriangleAlert;
      default: return CircleAlert;
    }
  }

  let Icon = $derived(icon ?? defaultIcon(status));
  let openQuote = $derived(isEnglish ? '\u201C' : '\u201E');
  let closeQuote = $derived(isEnglish ? '\u201D' : '\u201C');
</script>

<main class="error-page">
  <article class="error-article">
    <header class="eyebrow">
      <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
      <span class="eyebrow-label">
        {isEnglish ? 'Error' : 'Fehler'}
      </span>
    </header>

    <div class="code" aria-hidden="true">{status}</div>

    <h1 class="title">{title}</h1>
    <p class="description">{description}</p>

    {#if details}
      <p class="details">{details}</p>
    {/if}

    {#if actions}
      <nav class="actions">
        {@render actions()}
      </nav>
    {/if}

    {#if bibleQuote}
      <hr class="rule" />
      <figure class="quote">
        <blockquote class="quote-text">
          {openQuote}{bibleQuote.text}{closeQuote}
        </blockquote>
        <figcaption class="quote-reference">{bibleQuote.reference}</figcaption>
      </figure>
    {/if}
  </article>
</main>

<style>
  .error-page {
    min-height: calc(100vh - 6rem);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: clamp(3rem, 10vh, 8rem) 1.5rem 4rem;
    background: var(--color-bg-primary);
  }

  .error-article {
    width: 100%;
    max-width: 640px;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-tertiary);
    margin-bottom: 1rem;
  }

  .eyebrow-label {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .code {
    font-size: clamp(7rem, 22vw, 14rem);
    font-weight: 200;
    line-height: 0.9;
    letter-spacing: -0.05em;
    color: var(--color-text-primary);
    margin: 0 0 1.5rem;
    font-variant-numeric: lining-nums tabular-nums;
  }

  .title {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--color-text-primary);
    margin: 0 0 0.5rem;
  }

  .description {
    font-size: 1.0625rem;
    line-height: 1.55;
    color: var(--color-text-secondary);
    margin: 0;
    max-width: 44ch;
  }

  .details {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
    font-size: 0.8125rem;
    color: var(--color-text-tertiary);
    margin: 1.25rem 0 0;
    padding-left: 0.875rem;
    border-left: 1px solid var(--color-border);
    max-width: 44ch;
  }

  .actions {
    display: flex;
    gap: 1.75rem;
    margin: 2.25rem 0 0;
    flex-wrap: wrap;
  }

  :global(.error-article .link) {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-size: 0.95rem;
    cursor: pointer;
    color: var(--color-text-secondary);
    position: relative;
    transition: color var(--transition-normal, 200ms ease);
  }

  :global(.error-article .link::after) {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -2px;
    height: 1px;
    background: currentColor;
    opacity: 0.35;
    transition: opacity var(--transition-normal, 200ms ease);
  }

  :global(.error-article .link:hover) { color: var(--color-text-primary); }
  :global(.error-article .link:hover::after) { opacity: 1; }

  :global(.error-article .link-primary) { color: var(--color-primary); }
  :global(.error-article .link-primary:hover) {
    color: var(--color-primary-hover, var(--color-primary));
  }

  .rule {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 4rem 0 2.5rem;
    width: 3rem;
  }

  .quote {
    margin: 0;
  }

  .quote-text {
    font-family: Georgia, "Times New Roman", Cambria, serif;
    font-style: italic;
    font-size: clamp(1.25rem, 2.2vw, 1.625rem);
    line-height: 1.5;
    color: var(--color-text-primary);
    margin: 0 0 1rem;
    text-wrap: balance;
    hyphens: auto;
  }

  .quote-reference {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
  }

  @media (max-width: 560px) {
    .actions { gap: 1.25rem; }
    .rule { margin: 3rem 0 2rem; }
  }
</style>
