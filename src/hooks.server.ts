import type { Handle, HandleServerError } from "@sveltejs/kit"
import { redirect } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import * as auth from "./auth"
import { initializeScheduler } from "./lib/server/scheduler"
import { dbConnect } from "./utils/db"
import { errorWithVerse, getRandomVerse } from "$lib/server/errorQuote"

// Initialize database connection on server startup
console.log('🚀 Server starting - initializing database connection...');
await dbConnect().then(() => {
  console.log('✅ Database connected successfully');
  // Initialize the recurring payment scheduler after DB is ready
  initializeScheduler();
  console.log('✅ Recurring payment scheduler initialized');
}).catch((error) => {
  console.error('❌ Failed to connect to database on startup:', error);
  // Don't crash the server - API routes will attempt reconnection
});

async function authorization({ event, resolve }: Parameters<Handle>[0]) {
	const session = await event.locals.auth();
	event.locals.session = session;
	const { fetch, url } = event;

	// Protect rezepte routes
	if (url.pathname.startsWith('/rezepte/edit') || url.pathname.startsWith('/rezepte/add')) {
		if (!session) {
			const callbackUrl = encodeURIComponent(url.pathname + url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
		else if (!session.user?.groups?.includes('rezepte_users')) {
			await errorWithVerse(fetch, url.pathname, 403,
				'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich. Falls du glaubst, dass dies ein Fehler ist, wende dich bitte an Alexander.');
		}
	}

	// Protect cospend routes and API endpoints
	if (url.pathname.startsWith('/cospend') || url.pathname.startsWith('/expenses') || url.pathname.startsWith('/api/cospend')) {
		if (!session) {
			// Allow share-token access to shopping list routes
			const isShoppingRoute = url.pathname.startsWith('/cospend/list') || url.pathname.startsWith('/expenses/list') || url.pathname.startsWith('/api/cospend/list');
			const shareToken = url.searchParams.get('token');
			if (isShoppingRoute && shareToken) {
				const { validateShareToken } = await import('$lib/server/shoppingAuth');
				if (await validateShareToken(shareToken)) {
					return resolve(event);
				}
			}

			// For API routes, return 401 instead of redirecting
			if (url.pathname.startsWith('/api/cospend')) {
				await errorWithVerse(fetch, url.pathname, 401,
					'Anmeldung erforderlich. Du musst angemeldet sein, um auf diesen Bereich zugreifen zu können.');
			}
			// For page routes, redirect to login
			const callbackUrl = encodeURIComponent(url.pathname + url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
		else if (!session.user?.groups?.includes('cospend')) {
			await errorWithVerse(fetch, url.pathname, 403,
				'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich. Falls du glaubst, dass dies ein Fehler ist, wende dich bitte an Alexander.');
		}
	}

	// Protect tasks routes and API endpoints
	if (url.pathname.startsWith('/tasks') || url.pathname.startsWith('/api/tasks')) {
		if (!session) {
			if (url.pathname.startsWith('/api/tasks')) {
				await errorWithVerse(fetch, url.pathname, 401, 'Anmeldung erforderlich.');
			}
			const callbackUrl = encodeURIComponent(url.pathname + url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
		else if (!session.user?.groups?.includes('task_users')) {
			await errorWithVerse(fetch, url.pathname, 403,
				'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich. Falls du glaubst, dass dies ein Fehler ist, wende dich bitte an Alexander.');
		}
	}

	// Protect fitness routes and API endpoints
	if (url.pathname.startsWith('/fitness') || url.pathname.startsWith('/api/fitness')) {
		if (!session) {
			if (url.pathname.startsWith('/api/fitness')) {
				await errorWithVerse(fetch, url.pathname, 401, 'Authentication required.');
			}
			const callbackUrl = encodeURIComponent(url.pathname + url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
	}

	// If the request is still here, just proceed as normally
	return resolve(event);
}

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
  console.error('Error occurred:', { error, status, message, url: event.url.pathname });

  const bibleQuote = await getRandomVerse(event.fetch, event.url.pathname);
  const isEnglish = event.url.pathname.startsWith('/faith/') || event.url.pathname.startsWith('/recipes/');

  return {
    message,
    bibleQuote,
    lang: isEnglish ? 'en' : 'de'
  };
};

export const handle: Handle = sequence(
	auth.handle,
	authorization
);
