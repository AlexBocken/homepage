<script lang="ts">
  import type { VerseData } from '$lib/data/mysteryDescriptions';

  let {
    reference = '',
    title = '',
    verseData = null,
    lang = 'de',
    onClose
  }: {
    reference?: string,
    title?: string,
    verseData?: VerseData | null,
    lang?: string,
    onClose: () => void
  } = $props();

  const isEnglish = $derived(lang === 'en');

  let book: string = $state(verseData?.book || '');
  let chapter: number = $state(verseData?.chapter || 0);
  let verses: Array<{ verse: number; text: string }> = $state(verseData?.verses || []);
  let loading = $state(false);
  let error = $state(verseData ? '' : (lang === 'en' ? 'No verse data available' : 'Keine Versdaten verfügbar'));

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
  <div class="modal-content">
    <div class="modal-header">
      <div class="header-content">
        {#if title}
          <h3 class="modal-title">
            {#if title.includes(':')}
              {title.split(':')[0]}:<br>{title.split(':')[1]}
            {:else}
              {title}
            {/if}
          </h3>
        {/if}
        <p class="modal-reference">{reference}</p>
      </div>
      <button class="close-button" onclick={onClose} aria-label={isEnglish ? 'Close' : 'Schließen'}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div class="modal-body">
      {#if loading}
        <p class="loading">{isEnglish ? 'Loading...' : 'Lädt...'}</p>
      {:else if error}
        <p class="error">{error}</p>
      {:else if verses.length > 0}
        <div class="verses">
          {#each verses as verse}
            <p class="verse">
              <span class="verse-number">{verse.verse}</span>
              <span class="verse-text">{verse.text}</span>
            </p>
          {/each}
        </div>
      {:else}
        <p class="error">{isEnglish ? 'No verses found' : 'Keine Verse gefunden'}</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    backdrop-filter: blur(10px);
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: show-backdrop 200ms ease forwards;
  }

  @keyframes show-backdrop {
    from {
      backdrop-filter: blur(0px);
      background: rgba(0, 0, 0, 0);
    }
    to {
      backdrop-filter: blur(10px);
      background: rgba(0, 0, 0, 0.3);
    }
  }

  @media(prefers-color-scheme: light) {
    .modal-backdrop {
      background: rgba(255, 255, 255, 0.3);
    }

    @keyframes show-backdrop {
      from {
        backdrop-filter: blur(0px);
        background: rgba(255, 255, 255, 0);
      }
      to {
        backdrop-filter: blur(10px);
        background: rgba(255, 255, 255, 0.3);
      }
    }
  }

  .modal-content {
    background: var(--nord0);
    border-radius: 12px;
    max-width: 600px;
    width: 100%;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    position: relative;
  }

  @media(prefers-color-scheme: light) {
    .modal-content {
      background: var(--nord6);
    }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem;
    border-bottom: 1px solid var(--nord3);
  }

  @media(prefers-color-scheme: light) {
    .modal-header {
      border-bottom: 1px solid var(--nord4);
    }
  }

  .header-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .modal-title {
    margin: 0;
    color: var(--nord10);
    font-size: 1.3rem;
    font-weight: 700;
  }

  .modal-reference {
    margin: 0;
    color: var(--nord8);
    font-size: 1rem;
    font-weight: 600;
  }

  .close-button {
    position: absolute;
    top: -1rem;
    right: -1rem;
    background-color: var(--nord11);
    border: none;
    cursor: pointer;
    padding: 1rem;
    border-radius: var(--radius-pill);
    color: white;
    transition: var(--transition-normal);
    box-shadow: 0 0 1em 0.2em rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
  }

  .close-button svg {
    width: 2rem;
    height: 2rem;
  }

  .close-button:hover {
    background-color: var(--nord0);
    transform: scale(1.2, 1.2);
    box-shadow: 0 0 1em 0.4em rgba(0, 0, 0, 0.3);
  }

  .close-button:active {
    transition: 50ms;
    scale: 0.8 0.8;
  }

  .modal-body {
    padding: 1rem;
    overflow-y: auto;
  }

  .loading,
  .error {
    text-align: center;
    color: var(--nord4);
    font-style: italic;
  }

  @media(prefers-color-scheme: light) {
    .loading,
    .error {
      color: var(--nord2);
    }
  }

  .error {
    color: var(--nord11);
  }

  .verses {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .verse {
    display: flex;
    gap: 0.75rem;
    line-height: 1.6;
    color: var(--nord4);
    margin: 0;
  }

  @media(prefers-color-scheme: light) {
    .verse {
      color: var(--nord0);
    }
  }

  .verse-number {
    color: var(--nord10);
    font-weight: 700;
    min-width: 2rem;
    font-size: 0.9rem;
  }

  .verse-text {
    flex: 1;
    font-size: 1.1rem;
  }
</style>
