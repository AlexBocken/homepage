import type { Handle, HandleServerError, ServerInit } from "@sveltejs/kit"
import { redirect } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { building } from "$app/environment"
import * as auth from "./auth"
import { initializeScheduler } from "./lib/server/scheduler"
import { dbConnect } from "./utils/db"
import { errorWithVerse, getRandomVerse } from "$lib/server/errorQuote"
import { warmLiturgicalCache } from "$lib/server/liturgicalCalendar"

/** Map URL path to BCP 47 lang tag. Mirrors the [recipeLang] / [faithLang]
 *  param matchers — keep in sync if new locale slugs are added.
 *  @returns 'de' | 'en' | 'la'
 */
function langFromPath(pathname: string): 'de' | 'en' | 'la' {
	const first = pathname.split('/').filter(Boolean)[0] ?? '';
	if (first === 'recipes' || first === 'faith') return 'en';
	if (first === 'fides') return 'la';
	return 'de';
}

async function htmlLang({ event, resolve }: Parameters<Handle>[0]) {
	const lang = langFromPath(event.url.pathname);
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang),
	});
}

/** Apply headers to a response, transparently cloning it if the original
 *  has immutable headers. Auth.js (and certain fetch error/redirect responses)
 *  hand back frozen Headers, and a direct `.set()` on those throws
 *  `TypeError: immutable` — which would mask the underlying error and 500
 *  the request. Cloning preserves the body stream and status. */
function applyHeaders(response: Response, entries: Array<[string, string]>): Response {
	try {
		for (const [k, v] of entries) response.headers.set(k, v);
		return response;
	} catch (err) {
		if (err instanceof TypeError) {
			const headers = new Headers(response.headers);
			for (const [k, v] of entries) headers.set(k, v);
			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers
			});
		}
		throw err;
	}
}

/** Routes that must never appear in search-engine indexes. Search-results pages
 *  are thin/duplicate content; admin/edit/auth-walled pages have no public value
 *  and shouldn't burn crawl budget. Sets X-Robots-Tag rather than per-page meta
 *  so the rule lives in one place and also covers JSON/API responses.
 */
const NOINDEX_PATTERNS: RegExp[] = [
	/^\/api(\/|$)/,
	/^\/(rezepte|recipes)\/(search|admin|administration|add|edit|favorites|to-try)(\/|$)/,
	/^\/login$/,
	/^\/logout$/,
	/^\/(register|registrieren)(\/|$)/,
	/^\/(settings|einstellungen)(\/|$)/,
	/^\/tasks(\/|$)/,
	/^\/fitness(\/|$)/,
	/^\/cospend(\/|$)/,
	/^\/expenses(\/|$)/,
];

async function noindex({ event, resolve }: Parameters<Handle>[0]) {
	const response = await resolve(event);
	if (NOINDEX_PATTERNS.some((p) => p.test(event.url.pathname))) {
		return applyHeaders(response, [['X-Robots-Tag', 'noindex, nofollow']]);
	}
	return response;
}

/** Baseline security headers, set on every response.
 *
 *  - X-Frame-Options + CSP frame-ancestors block this site from being
 *    iframed onto attacker pages (clickjacking on /login, /cospend,
 *    /fitness, etc.). Both directives are sent: modern browsers honour
 *    frame-ancestors and ignore the legacy header; older ones (IE11) only
 *    understand X-Frame-Options.
 *  - Strict-Transport-Security tells browsers to refuse plain-HTTP for
 *    bocken.org and any subdomain for one year, preventing protocol
 *    downgrade. Browsers ignore the header on http:// loads, so dev on
 *    localhost is unaffected. `preload` deliberately omitted — the HSTS
 *    preload list is hard to leave; revisit only after a stable production
 *    deployment.
 */
async function securityHeaders({ event, resolve }: Parameters<Handle>[0]) {
	const response = await resolve(event);
	return applyHeaders(response, [
		['X-Frame-Options', 'DENY'],
		['Content-Security-Policy', "frame-ancestors 'none'"],
		['Strict-Transport-Security', 'max-age=31536000; includeSubDomains']
	]);
}

async function timing({ event, resolve }: Parameters<Handle>[0]) {
	const marks: Record<string, number> = {};
	event.locals.timing = {
		mark(name, dur) {
			marks[name] = (marks[name] ?? 0) + dur;
		},
		async measure(name, fn) {
			const t0 = performance.now();
			try {
				return await fn();
			} finally {
				this.mark(name, performance.now() - t0);
			}
		}
	};
	const t0 = performance.now();
	const response = await resolve(event);
	marks.total = performance.now() - t0;
	const header = Object.entries(marks)
		.map(([k, v]) => `${k};dur=${v.toFixed(1)}`)
		.join(', ');
	return applyHeaders(response, [['Server-Timing', header]]);
}

export const init: ServerInit = async () => {
  // SvelteKit runs prerendering/analysis inside a worker_threads worker (see
  // @sveltejs/kit utils/fork.js) whose JS heap is capped well below the main
  // thread's. `init` fires there too, so warming the romcal cache during a
  // build exhausts that worker's heap → ERR_WORKER_OUT_OF_MEMORY and a failed
  // build. None of it is needed at build time: no prerendered route touches the
  // DB, and connecting to Mongo / starting the payment scheduler from a build
  // is undesirable regardless. Skip startup work while building.
  if (building) return;

  console.log('🚀 Server starting - initializing database connection...');
  try {
    await dbConnect();
    console.log('✅ Database connected successfully');
    initializeScheduler();
    console.log('✅ Recurring payment scheduler initialized');
  } catch (error) {
    console.error('❌ Failed to connect to database on startup:', error);
    // Don't crash the server - API routes will attempt reconnection
  }

  // Warm liturgical calendar cache in the background — non-blocking so the
  // server starts accepting requests immediately; any request arriving before
  // warmup completes falls back to lazy computation (still correct, just cold).
  const t0 = performance.now();
  warmLiturgicalCache()
    .then(() => console.log(`✅ Liturgical calendar cache warmed in ${Math.round(performance.now() - t0)}ms`))
    .catch((error) => console.error('⚠️ Liturgical calendar warmup failed:', error));
};

async function authorization({ event, resolve }: Parameters<Handle>[0]) {
	const session = await event.locals.timing.measure('auth', () => event.locals.auth());
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

	// Protect fitness routes and API endpoints. The run map/card images are an
	// exception: they self-authorize (session ownership OR a per-run share
	// token) so they can be fetched for OG/share previews without a login.
	const isPublicRunImage = /^\/api\/fitness\/sessions\/[^/]+\/(map|card)\.webp$/.test(url.pathname);
	if (!isPublicRunImage && (url.pathname.startsWith('/fitness') || url.pathname.startsWith('/api/fitness'))) {
		if (!session) {
			if (url.pathname.startsWith('/api/fitness')) {
				await errorWithVerse(fetch, url.pathname, 401, 'Authentication required.');
			}
			const callbackUrl = encodeURIComponent(url.pathname + url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
	}

	// Protect self-service settings page and user API (any logged-in user)
	if (url.pathname.startsWith('/settings') || url.pathname.startsWith('/api/user')) {
		if (!session) {
			if (url.pathname.startsWith('/api/user')) {
				await errorWithVerse(fetch, url.pathname, 401, 'Anmeldung erforderlich.');
			}
			const callbackUrl = encodeURIComponent(url.pathname + url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
	}

	// If the request is still here, just proceed as normally
	return resolve(event);
}

/** Browser/crawler probes for these paths are routine 404s — not bugs.
 *  Skip the noisy console.error so real errors stay visible. */
const SILENT_404_PATHS = new Set(['/favicon.ico', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png']);

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
  if (!(status === 404 && SILENT_404_PATHS.has(event.url.pathname))) {
    console.error('Error occurred:', { error, status, message, url: event.url.pathname });
  }

  const bibleQuote = await getRandomVerse(event.fetch, event.url.pathname);
  const isEnglish = event.url.pathname.startsWith('/faith/') || event.url.pathname.startsWith('/recipes/');

  return {
    message,
    bibleQuote,
    lang: isEnglish ? 'en' : 'de'
  };
};

export const handle: Handle = sequence(
	timing,
	htmlLang,
	noindex,
	securityHeaders,
	auth.handle,
	authorization
);
