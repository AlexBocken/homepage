import type { Handle, HandleServerError } from "@sveltejs/kit"
import { redirect } from "@sveltejs/kit"
import { error } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import * as auth from "./auth"
import { initializeScheduler } from "./lib/server/scheduler"
import { dbConnect } from "./utils/db"

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

	// Protect rezepte routes
	if (event.url.pathname.startsWith('/rezepte/edit') || event.url.pathname.startsWith('/rezepte/add')) {
		if (!session) {
			// Preserve the original URL the user was trying to access
			const callbackUrl = encodeURIComponent(event.url.pathname + event.url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
		else if (!session.user?.groups?.includes('rezepte_users')) {
			error(403, {
				message: 'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich. Falls du glaubst, dass dies ein Fehler ist, wende dich bitte an Alexander.'
			});
		}
	}

	// Protect cospend routes and API endpoints
	if (event.url.pathname.startsWith('/cospend') || event.url.pathname.startsWith('/api/cospend')) {
		if (!session) {
			// For API routes, return 401 instead of redirecting
			if (event.url.pathname.startsWith('/api/cospend')) {
				error(401, {
					message: 'Anmeldung erforderlich. Du musst angemeldet sein, um auf diesen Bereich zugreifen zu können.'
				});
			}
			// For page routes, redirect to login
			const callbackUrl = encodeURIComponent(event.url.pathname + event.url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
		else if (!session.user?.groups?.includes('cospend')) {
			error(403, {
				message: 'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich. Falls du glaubst, dass dies ein Fehler ist, wende dich bitte an Alexander.'
			});
		}
	}

	// Protect tasks routes and API endpoints
	if (event.url.pathname.startsWith('/tasks') || event.url.pathname.startsWith('/api/tasks')) {
		if (!session) {
			if (event.url.pathname.startsWith('/api/tasks')) {
				error(401, {
					message: 'Anmeldung erforderlich.'
				});
			}
			const callbackUrl = encodeURIComponent(event.url.pathname + event.url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
		else if (!session.user?.groups?.includes('task_users')) {
			error(403, {
				message: 'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich. Falls du glaubst, dass dies ein Fehler ist, wende dich bitte an Alexander.'
			});
		}
	}

	// Protect fitness routes and API endpoints
	if (event.url.pathname.startsWith('/fitness') || event.url.pathname.startsWith('/api/fitness')) {
		if (!session) {
			if (event.url.pathname.startsWith('/api/fitness')) {
				error(401, {
					message: 'Authentication required.'
				});
			}
			const callbackUrl = encodeURIComponent(event.url.pathname + event.url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
	}

	// If the request is still here, just proceed as normally
	return resolve(event);
}

// Bible verse functionality for error pages
async function getRandomVerse(fetch: typeof globalThis.fetch, pathname: string): Promise<{ text: string; reference: string } | null> {
  const isEnglish = pathname.startsWith('/faith/') || pathname.startsWith('/recipes/');
  const endpoint = isEnglish ? '/api/faith/bibel/zufallszitat' : '/api/glaube/bibel/zufallszitat';
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('Error getting random verse:', err);
    return null;
  }
}

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
  console.error('Error occurred:', { error, status, message, url: event.url.pathname });
  
  // Add Bible verse to error context
  const bibleQuote = await getRandomVerse(event.fetch, event.url.pathname);

  const isEnglish = event.url.pathname.startsWith('/faith/') || event.url.pathname.startsWith('/recipes/');

  return {
    message: message,
    bibleQuote,
    lang: isEnglish ? 'en' : 'de'
  };
};

export const handle: Handle = sequence(
	auth.handle,
	authorization
);
