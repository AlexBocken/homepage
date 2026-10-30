import type { Handle, HandleServerError, ServerInit } from "@sveltejs/kit"
import { redirect } from "@sveltejs/kit"
import { sequence } from "@sveltejs/kit/hooks"
import { building } from "$app/environment"
import * as auth from "./auth"
import { initializeScheduler } from "./lib/server/scheduler"
import { dbConnect } from "./utils/db"
import { errorLang, errorWithVerse, getRandomVerse } from "$lib/server/errorQuote"
import { pathLang } from "$lib/js/slugs"
import { FINANCE_OWNER } from "$lib/config/users"
import { warmLiturgicalCache } from "$lib/server/liturgicalCalendar"

async function htmlLang({ event, resolve }: Parameters<Handle>[0]) {
	// Pages without a language slug follow the visitor's saved choice.
	const preferred = event.cookies.get('preferred_lang');
	const lang = event.url.pathname === '/' && (preferred === 'en' || preferred === 'de') ? preferred : pathLang(event.url.pathname);
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
	/^\/admin(\/|$)/,
	/^\/login$/,
	/^\/logout$/,
	/^\/(register|registrieren)(\/|$)/,
	/^\/(settings|einstellungen)(\/|$)/,
	// The route builder is a login-gated tool, not content.
	/^\/(hikes|wanderungen)\/route-builder(\/|$)/,
	/^\/tasks(\/|$)/,
	/^\/fitness(\/|$)/,
	/^\/(period|periode)(\/|$)/,
	/\.ics$/, // ICS subscription feeds (period + liturgical calendars)
	/^\/cospend(\/|$)/,
	/^\/expenses(\/|$)/,
	/^\/finances(\/|$)/,
	// One reader's Bible plan and log.
	/^\/(glaube|faith|fides)\/(bibel|bible|biblia)\/plan(\/|$)/,
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

  // Warm the BLS+USDA food search index in the background. Dynamic import keeps
  // the ~20 MB nutrition data modules out of the hooks build graph; loaded here
  // only at runtime. Any search arriving before this finishes just builds lazily.
  const tIdx = performance.now();
  import('$lib/server/nutritionSearchIndex')
    .then((m) => {
      m.warmFoodSearchIndex();
      console.log(`✅ Food search index built in ${Math.round(performance.now() - tIdx)}ms`);
    })
    .catch((error) => console.error('⚠️ Food search index warmup failed:', error));

  // Build the recipe nutrition ranker (n-gram indexes over ~14.6k BLS/USDA entries,
  // a few seconds) so the first nutrition match doesn't wait for it.
  const tRank = performance.now();
  import('$lib/server/nutritionMatcher')
    .then((m) => m.warmNutritionMatcher())
    .then(() => console.log(`✅ Nutrition ranker built in ${Math.round(performance.now() - tRank)}ms`))
    .catch((error) => console.error('⚠️ Nutrition ranker warmup failed:', error));

  // Train the shopping list's category classifier (a few seconds) so the
  // first item added doesn't wait for it. Dynamic import for the same reason.
  const tShop = performance.now();
  import('$lib/server/shoppingCategorizer')
    .then((m) => m.warmShoppingCategorizer())
    .then(() => console.log(`✅ Shopping categorizer trained in ${Math.round(performance.now() - tShop)}ms`))
    .catch((error) => console.error('⚠️ Shopping categorizer warmup failed:', error));

  // Warm the recipes' per-100g nutrition cache. The listing filters on it and
  // sends an 8-hour Cache-Control, so a first visitor arriving before it exists
  // would have an empty payload cached in front of them for the rest of the
  // day. Doing it here means that request never has to calculate anything.
  // Same dynamic import for the same reason as above.
  const tNut = performance.now();
  import('$lib/server/recipeNutritionCache')
    .then(async (m) => {
      const { filled, empty } = await m.fillMissingRecipeNutrition();
      if (filled || empty) {
        console.log(
          `✅ Recipe nutrition cache warmed in ${Math.round(performance.now() - tNut)}ms (${filled} calculated, ${empty} without usable mappings)`
        );
      }
    })
    .catch((error) => console.error('⚠️ Recipe nutrition warmup failed:', error));

  // Score every recipe pair for "Ähnliche Rezepte" so no detail page request
  // has to. Time-sliced, so serving requests meanwhile stays responsive; one
  // that arrives first waits briefly, then gets the hand-picked recipes only.
  import('$lib/server/recipeSimilarityIndex')
    .then((m) => m.warmRecipeSimilarity())
    .catch((error) => console.error('⚠️ Recipe similarity warmup failed:', error));
};

/** Cache the decoded session keyed by the raw session-token cookie(s).
 *
 *  A single page render fans out into many same-origin `event.fetch('/api/…')`
 *  calls, and each one re-runs this whole hook chain — including a fresh JWE
 *  decrypt of the session cookie in `locals.auth()`. That decrypt is CPU-bound
 *  (~3–5ms) and, on Node's single thread, the parallel internal fetches
 *  serialize on it, so a page firing ~10 internal requests pays it ~10× back to
 *  back. Because a JWT session cookie is immutable for its lifetime (groups etc.
 *  are baked in at sign-in — the app is already "stale until re-login"), the
 *  same cookie value always decodes to the same session. So we cache the
 *  in-flight promise keyed by the exact cookie value(s): the burst of internal
 *  fetches during one render shares a single decrypt. A short TTL bounds memory
 *  and staleness; a missing cookie is never cached (logout must resolve live). */
type ResolvedSession = Awaited<ReturnType<App.Locals['auth']>>;
const SESSION_CACHE = new Map<string, { promise: Promise<ResolvedSession>; ts: number }>();
const SESSION_TTL = 10_000;

function sessionCookieKey(event: Parameters<Handle>[0]['event']): string | undefined {
	// Auth.js splits large session tokens into `…session-token.0`, `.1`, … —
	// concatenate every chunk so a chunked cookie still keys correctly.
	const chunks = event.cookies.getAll().filter((c) => c.name.includes('session-token'));
	if (!chunks.length) return undefined;
	return chunks.map((c) => `${c.name}=${c.value}`).join(';');
}

function resolveSession(event: Parameters<Handle>[0]['event']): Promise<ResolvedSession> {
	const key = sessionCookieKey(event);
	if (!key) return event.locals.auth(); // no session cookie → never cache
	const now = Date.now();
	const hit = SESSION_CACHE.get(key);
	if (hit && now - hit.ts < SESSION_TTL) return hit.promise;
	const promise = event.locals.auth();
	SESSION_CACHE.set(key, { promise, ts: now });
	// A failed decode must not be served for the rest of the TTL.
	promise.catch(() => SESSION_CACHE.delete(key));
	if (SESSION_CACHE.size > 500) {
		for (const [k, v] of SESSION_CACHE) if (now - v.ts >= SESSION_TTL) SESSION_CACHE.delete(k);
	}
	return promise;
}

type HookEvent = Parameters<Handle>[0]['event'];
type Session = NonNullable<ResolvedSession>;

/** One protected area of the site. Logged-out requests get a 401 (APIs) or a
 *  redirect to the login (pages); logged-in ones failing `allowed` get a 403.
 *  Gates are checked in order and every matching one applies. */
type Gate = {
	match: (pathname: string) => boolean;
	/** Which matched paths are APIs, answered with a 401 instead of a redirect. */
	api: (pathname: string) => boolean;
	/** Who may enter once logged in; any logged-in user when omitted. */
	allowed?: (session: Session) => boolean;
	/** Lets a request through before any session check (share and API tokens). */
	bypass?: (event: HookEvent, session: ResolvedSession) => Promise<boolean>;
	/** The 401 message, when not the default. */
	unauthenticated?: string;
};

const LOGIN_REQUIRED = 'Anmeldung erforderlich.';
const ACCESS_DENIED =
	'Zugriff verweigert. Du hast keine Berechtigung für diesen Bereich. Falls du glaubst, dass dies ein Fehler ist, wende dich bitte an Alexander.';

const under = (...prefixes: string[]) => (pathname: string) =>
	prefixes.some((prefix) => pathname.startsWith(prefix));
const inGroup = (group: string) => (session: Session) => !!session.user?.groups?.includes(group);
// Private single-owner areas check the Authentik username rather than a group,
// since they're for exactly one person. Nicknames are compared lowercased (as
// elsewhere, e.g. the fitness period subscriptions route).
const isOwner = (session: Session) => session.user?.nickname?.toLowerCase() === FINANCE_OWNER;

// The run map/card images self-authorize (session ownership OR a per-run share
// token) so they can be fetched for OG/share previews without a login.
const RUN_IMAGE = /^\/api\/fitness\/sessions\/[^/]+\/(map|card)\.webp$/;

const GATES: Gate[] = [
	{
		match: under('/rezepte/edit', '/rezepte/add'),
		api: () => false,
		allowed: inGroup('rezepte_users')
	},
	{
		match: under('/cospend', '/expenses', '/api/cospend'),
		api: under('/api/cospend'),
		allowed: inGroup('cospend'),
		unauthenticated:
			'Anmeldung erforderlich. Du musst angemeldet sein, um auf diesen Bereich zugreifen zu können.',
		async bypass({ url, request }, session) {
			if (session) return false;
			// Share-token access to the shopping list
			const shareToken = url.searchParams.get('token');
			if (shareToken && under('/cospend/list', '/expenses/list', '/api/cospend/list')(url.pathname)) {
				const { validateShareToken } = await import('$lib/server/shoppingAuth');
				if (await validateShareToken(shareToken)) return true;
			}
			// A valid cospend API token may reach the read-only export endpoint (for
			// the beancount importer). The endpoint re-verifies.
			if (url.pathname === '/api/cospend/export') {
				const { verifyCospendApiToken } = await import('$lib/server/cospendApiAuth');
				return !!(await verifyCospendApiToken(request, url));
			}
			return false;
		}
	},
	{
		match: under('/tasks', '/api/tasks'),
		api: under('/api/tasks'),
		allowed: inGroup('task_users')
	},
	{
		match: under('/finances', '/api/finances'),
		api: under('/api/finances'),
		allowed: isOwner,
		// A valid finance API token may reach the read-only overrides export (the
		// ledger repo's pull script), like the cospend export. Checked before the
		// session, as it always was.
		async bypass({ url, request }) {
			if (url.pathname !== '/api/finances/export') return false;
			const { verifyFinanceApiToken } = await import('$lib/server/financeApiAuth');
			return !!(await verifyFinanceApiToken(request, url));
		}
	},
	// Private case-interview math trainer; owner-only while it's a personal tool.
	{
		match: under('/case-math', '/api/case-math'),
		api: under('/api/case-math'),
		allowed: isOwner
	},
	// Site-wide maintenance tools act across every user's data (regenerating
	// everyone's run images, say), so group membership isn't the right gate.
	{
		match: under('/admin', '/api/admin'),
		api: under('/api/admin'),
		allowed: isOwner
	},
	// Fitness is open to any logged-in user. (The period ICS feed lives at the
	// public top-level /period and /periode routes, not under /api/fitness, and
	// self-authorizes via HTTP Basic Auth.)
	{
		match: (pathname) => !RUN_IMAGE.test(pathname) && under('/fitness', '/api/fitness')(pathname),
		api: under('/api/fitness'),
		unauthenticated: 'Authentication required.'
	},
	// The nutrition API is consumed by the fitness food search/diary and the
	// recipe editor, which are already gated to logged-in users, so nothing
	// legitimate loses access. Without this the endpoints were an open read API
	// over the bundled USDA/BLS tables.
	{
		match: under('/api/nutrition'),
		api: () => true
	},
	// Self-service settings (any logged-in user). The page is one route behind
	// the [settingsLang] matcher, so both slugs are guarded identically;
	// otherwise the German one falls through to the page load's requireSelf()
	// and 401s instead of redirecting to login.
	{
		match: under('/settings', '/einstellungen', '/api/user'),
		api: under('/api/user')
	},
	// The Bible reading plan and log are one reader's own (any logged-in user):
	// the page under all three faith slugs, the API under /api/<faith>/bibel/.
	{
		match: (pathname) =>
			/^\/(glaube|faith|fides)\/(bibel|bible|biblia)\/plan(\/|$)/.test(pathname) ||
			/^\/api\/(glaube|faith|fides)\/bibel\/(plan|gelesen)(\/|$)/.test(pathname),
		api: under('/api/')
	}
];

async function authorization({ event, resolve }: Parameters<Handle>[0]) {
	const session = await event.locals.timing.measure('auth', () => resolveSession(event));
	event.locals.session = session;
	const { fetch, url } = event;

	// Calendar clients (e.g. Thunderbird) probe these CalDAV/CardDAV discovery
	// paths before falling back to a plain ICS subscription. We don't run a
	// CalDAV/CardDAV server, so answer 404 directly — returning a Response here
	// avoids a noisy "Not found" SvelteKitError in the logs.
	if (url.pathname === '/.well-known/caldav' || url.pathname === '/.well-known/carddav') {
		return new Response('Not Found', { status: 404 });
	}

	for (const gate of GATES) {
		if (!gate.match(url.pathname)) continue;
		if (await gate.bypass?.(event, session)) return resolve(event);
		if (!session) {
			// APIs answer 401; pages send the reader to log in and back.
			if (gate.api(url.pathname)) {
				await errorWithVerse(fetch, url.pathname, 401, gate.unauthenticated ?? LOGIN_REQUIRED);
			}
			const callbackUrl = encodeURIComponent(url.pathname + url.search);
			redirect(303, `/login?callbackUrl=${callbackUrl}`);
		}
		else if (gate.allowed && !gate.allowed(session)) {
			await errorWithVerse(fetch, url.pathname, 403, ACCESS_DENIED);
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
  return {
    message,
    bibleQuote,
    lang: errorLang(event.url.pathname)
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
