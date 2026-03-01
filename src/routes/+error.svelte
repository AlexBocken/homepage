<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import Header from '$lib/components/Header.svelte';

  let status = $derived($page.status);
  let error = $derived($page.error);

  // Get session data if available (may not be available in error context)
  let session = $derived($page.data?.session);
  let user = $derived(session?.user);

  // Get Bible quote and language from SSR via handleError hook
  let bibleQuote = $derived($page.error?.bibleQuote);
  let isEnglish = $derived($page.error?.lang === 'en');

  function getErrorTitle(status) {
    if (isEnglish) {
      switch (status) {
        case 401: return 'Login Required';
        case 403: return 'Access Denied';
        case 404: return 'Page Not Found';
        case 500: return 'Server Error';
        default: return 'Error';
      }
    }
    switch (status) {
      case 401: return 'Anmeldung erforderlich';
      case 403: return 'Zugriff verweigert';
      case 404: return 'Seite nicht gefunden';
      case 500: return 'Serverfehler';
      default: return 'Fehler';
    }
  }

  function getErrorDescription(status) {
    if (isEnglish) {
      switch (status) {
        case 401: return 'You must be logged in to access this page.';
        case 403: return 'You do not have permission for this area.';
        case 404: return 'The requested page could not be found.';
        case 500: return 'An unexpected error occurred. Please try again later.';
        default: return 'An unexpected error occurred.';
      }
    }
    switch (status) {
      case 401: return 'Du musst angemeldet sein, um auf diese Seite zugreifen zu können.';
      case 403: return 'Du hast keine Berechtigung für diesen Bereich.';
      case 404: return 'Die angeforderte Seite konnte nicht gefunden werden.';
      case 500: return 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.';
      default: return 'Es ist ein unerwarteter Fehler aufgetreten.';
    }
  }

  function getErrorIcon(status) {
    switch (status) {
      case 401:
        return '🔐';
      case 403:
        return '🚫';
      case 404:
        return '🔍';
      case 500:
        return '⚠️';
      default:
        return '❌';
    }
  }

  function goHome() {
    goto('/');
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      goto('/');
    }
  }

  function login() {
    goto('/login');
  }
</script>

<svelte:head>
  <title>{getErrorTitle(status)} - Alexander's Website</title>
</svelte:head>

<Header>
  {#snippet links()}
    <ul class="site_header">
    </ul>
  {/snippet}

  <main class="error-page">
    <div class="error-container">
      <div class="error-icon">
        {getErrorIcon(status)}
      </div>

      <h1 class="error-title">
        {getErrorTitle(status)}
      </h1>

      <div class="error-code">
        {isEnglish ? 'Error' : 'Fehler'} {status}
      </div>

      <p class="error-description">
        {getErrorDescription(status)}
      </p>

      {#if error?.details}
        <div class="error-details">
          {error.details}
        </div>
      {/if}

      <div class="error-actions">
        {#if status === 401}
          <button class="btn btn-primary" onclick={login}>
            {isEnglish ? 'Log In' : 'Anmelden'}
          </button>
          <button class="btn btn-secondary" onclick={goHome}>
            {isEnglish ? 'Go to Homepage' : 'Zur Startseite'}
          </button>
        {:else if status === 500}
          <button class="btn btn-primary" onclick={goHome}>
            {isEnglish ? 'Go to Homepage' : 'Zur Startseite'}
          </button>
          <button class="btn btn-secondary" onclick={goBack}>
            {isEnglish ? 'Try Again' : 'Erneut versuchen'}
          </button>
        {:else}
          <button class="btn btn-primary" onclick={goHome}>
            {isEnglish ? 'Go to Homepage' : 'Zur Startseite'}
          </button>
          <button class="btn btn-secondary" onclick={goBack}>
            {isEnglish ? 'Go Back' : 'Zurück'}
          </button>
        {/if}
      </div>

      <!-- Bible Quote Section -->
      {#if bibleQuote}
        <div class="bible-quote">
          <div class="quote-text">
            {isEnglish ? '"' : '„'}{bibleQuote.text}{isEnglish ? '"' : '"'}
          </div>
          <div class="quote-reference">
            — {bibleQuote.reference}
          </div>
        </div>
      {/if}
    </div>
  </main>
</Header>

<style>
  .error-page {
    min-height: calc(100vh - 6rem);
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fbf9f3;
    padding: 2rem;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-page {
      background: var(--background-dark);
    }
  }
:global(:root[data-theme="dark"]) .error-page {
	background: var(--background-dark);
}

  .error-container {
    background: var(--nord5);
    border-radius: 1rem;
    padding: 3rem;
    max-width: 600px;
    width: 100%;
    text-align: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-container {
      background: var(--nord1);
      border-color: var(--nord2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
  }
:global(:root[data-theme="dark"]) .error-container {
	background: var(--nord1);
      border-color: var(--nord2);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

  .error-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
    opacity: 0.8;
  }

  .error-title {
    font-size: 2.5rem;
    color: var(--nord0);
    margin-bottom: 0.5rem;
    font-weight: 700;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-title {
      color: var(--nord6);
    }
  }
:global(:root[data-theme="dark"]) .error-title {
	color: var(--nord6);
}

  .error-code {
    font-size: 1.2rem;
    color: var(--nord3);
    font-weight: 600;
    margin-bottom: 1.5rem;
    opacity: 0.8;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-code {
      color: var(--nord4);
    }
  }
:global(:root[data-theme="dark"]) .error-code {
	color: var(--nord4);
}

  .error-description {
    font-size: 1.1rem;
    color: var(--nord2);
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-description {
      color: var(--nord5);
    }
  }
:global(:root[data-theme="dark"]) .error-description {
	color: var(--nord5);
}

  .error-details {
    background: var(--nord4);
    border-radius: 0.5rem;
    padding: 1rem;
    margin: 1.5rem 0;
    font-size: 0.9rem;
    color: var(--nord0);
    border-left: 4px solid var(--blue);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .error-details {
      background: var(--nord2);
      color: var(--nord6);
    }
  }
:global(:root[data-theme="dark"]) .error-details {
	background: var(--nord2);
      color: var(--nord6);
}

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin: 2rem 0;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 1rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--blue), var(--lightblue));
    color: white;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, var(--lightblue), var(--blue));
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(94, 129, 172, 0.3);
  }

  .btn-secondary {
    background: var(--nord4);
    color: var(--nord0);
    border: 1px solid var(--nord3);
  }

  .btn-secondary:hover {
    background: var(--nord3);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .btn-secondary {
      background: var(--nord2);
      color: var(--nord6);
      border-color: var(--nord3);
    }

    :global(:root:not([data-theme="light"])) .btn-secondary:hover {
      background: var(--nord3);
    }
  }
:global(:root[data-theme="dark"]) .btn-secondary {
	background: var(--nord2);
      color: var(--nord6);
      border-color: var(--nord3);
}
:global(:root[data-theme="dark"]) .btn-secondary:hover {
	background: var(--nord3);
}


  .bible-quote {
    margin: 2.5rem 0;
    padding: 2rem;
    background: linear-gradient(135deg, var(--nord5), var(--nord4));
    border-radius: 0.75rem;
    border-left: 4px solid var(--blue);
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .bible-quote {
      background: linear-gradient(135deg, var(--nord2), var(--nord3));
    }
  }
:global(:root[data-theme="dark"]) .bible-quote {
	background: linear-gradient(135deg, var(--nord2), var(--nord3));
}

  .quote-text {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--nord0);
    margin-bottom: 1rem;
    text-align: left;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .quote-text {
      color: var(--nord6);
    }
  }
:global(:root[data-theme="dark"]) .quote-text {
	color: var(--nord6);
}

  .quote-reference {
    font-size: 0.9rem;
    color: var(--nord2);
    font-weight: 600;
    text-align: right;
    font-style: normal;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .quote-reference {
      color: var(--nord4);
    }
  }
:global(:root[data-theme="dark"]) .quote-reference {
	color: var(--nord4);
}


  @media (max-width: 600px) {
    .error-container {
      padding: 2rem;
      margin: 1rem;
    }

    .error-title {
      font-size: 2rem;
    }

    .error-actions {
      flex-direction: column;
      align-items: center;
    }

    .btn {
      width: 100%;
      max-width: 250px;
    }


    .bible-quote {
      padding: 1.5rem;
    }

    .quote-text {
      font-size: 1rem;
    }
  }
</style>
