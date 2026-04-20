export function getErrorTitle(status: number, isEnglish: boolean): string {
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

export function getErrorDescription(status: number, isEnglish: boolean): string {
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

export const errorLabels = {
  login: { en: 'Log in', de: 'Anmelden' },
  tryAgain: { en: 'Try again', de: 'Erneut versuchen' },
  goBack: { en: 'Go back', de: 'Zurück' },
  homepage: { en: 'Homepage', de: 'Startseite' }
} as const;

export function pick(pair: { en: string; de: string }, isEnglish: boolean): string {
  return isEnglish ? pair.en : pair.de;
}
