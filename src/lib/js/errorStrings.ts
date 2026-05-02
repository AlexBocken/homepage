export function getErrorTitle(status: number, isEnglish: boolean): string {
  if (isEnglish) {
    switch (status) {
      case 401: return 'Login Required';
      case 403: return 'Access Denied';
      case 404: return 'Page Not Found';
      case 500: return 'Server Error';
      case 502: return 'Bad Gateway';
      case 503: return 'Service Temporarily Unavailable';
      case 504: return 'Gateway Timeout';
      default: return 'Error';
    }
  }
  switch (status) {
    case 401: return 'Anmeldung erforderlich';
    case 403: return 'Zugriff verweigert';
    case 404: return 'Seite nicht gefunden';
    case 500: return 'Serverfehler';
    case 502: return 'Bad Gateway';
    case 503: return 'Server vorübergehend nicht erreichbar';
    case 504: return 'Gateway-Zeitüberschreitung';
    default: return 'Fehler';
  }
}

export function getErrorDescription(status: number, isEnglish: boolean): string {
  if (isEnglish) {
    switch (status) {
      case 401: return 'You must be logged in to access this page.';
      case 403: return 'You do not have permission for this area.';
      case 404: return 'The requested page could not be found.';
      case 500: return 'An unexpected error occurred. Please try again later.';
      case 502: return 'The site is briefly offline. Please try again in a few minutes.';
      case 503: return 'The site is briefly offline. Please try again in a few minutes.';
      case 504: return 'The upstream is taking too long to respond. Please try again shortly.';
      default: return 'An unexpected error occurred.';
    }
  }
  switch (status) {
    case 401: return 'Du musst angemeldet sein, um auf diese Seite zugreifen zu können.';
    case 403: return 'Du hast keine Berechtigung für diesen Bereich.';
    case 404: return 'Die angeforderte Seite konnte nicht gefunden werden.';
    case 500: return 'Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es später erneut.';
    case 502: return 'Die Seite ist gerade kurz offline. Bitte in ein paar Minuten erneut probieren.';
    case 503: return 'Die Seite ist gerade kurz offline. Bitte in ein paar Minuten erneut probieren.';
    case 504: return 'Der Server braucht zu lange zum Antworten. Bitte gleich nochmal probieren.';
    default: return 'Es ist ein unerwarteter Fehler aufgetreten.';
  }
}

export interface BibleQuote {
  text: string;
  reference: string;
}

// Generated at prebuild time by scripts/generate-error-quotes.ts from the
// allioli (DE) + drb (EN) TSV bibles. Curated reference list lives in that
// script; this JSON is the resolved verse text + display reference.
import errorQuotesData from '$lib/data/errorQuotes.json';
const errorQuotes = errorQuotesData as Record<string, { de: BibleQuote; en: BibleQuote }>;

export function getErrorBibleQuote(status: number, isEnglish: boolean): BibleQuote | null {
  const entry = errorQuotes[String(status)];
  if (!entry) return null;
  return isEnglish ? entry.en : entry.de;
}

export const errorLabels = {
  login: { en: 'Log in', de: 'Anmelden' },
  tryAgain: { en: 'Try again', de: 'Erneut versuchen' },
  goBack: { en: 'Go back', de: 'Zurück' },
  homepage: { en: 'Homepage', de: 'Startseite' }
} as const;

export function pick(pair: { en: string; de: string }, isEnglish: boolean): string {
  return isEnglish ? pair.en : pair.de;
}
