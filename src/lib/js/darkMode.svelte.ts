/**
 * Which theme the page is showing, for code that cannot read CSS variables —
 * Chart.js colours, map tiles, canvas drawing.
 *
 * The explicit choice lives in `<html data-theme="dark|light">`; without one
 * the OS preference decides. Both can change while a page is open (the theme
 * toggle, the OS switching at dusk), so anything that paints with theme
 * colours has to follow both.
 */

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Whether the page is dark right now. False during SSR. */
export function isDarkTheme(): boolean {
	if (typeof document === 'undefined') return false;
	const theme = document.documentElement.getAttribute('data-theme');
	if (theme === 'dark') return true;
	if (theme === 'light') return false;
	return window.matchMedia(DARK_QUERY).matches;
}

/**
 * Call `cb` whenever the theme may have changed: the OS preference flips, or
 * `data-theme` on `<html>` is written. Returns the unsubscribe function. For
 * imperative consumers (charts rebuilt on a theme switch); components that only
 * need the current value use `createDarkMode()`.
 */
export function onThemeChange(cb: () => void): () => void {
	const mql = window.matchMedia(DARK_QUERY);
	mql.addEventListener('change', cb);
	const obs = new MutationObserver(cb);
	obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
	return () => {
		mql.removeEventListener('change', cb);
		obs.disconnect();
	};
}

/**
 * Reactive dark-mode flag for a component: `const theme = createDarkMode()`
 * during init, then read `theme.dark` anywhere — markup, `$derived`, handlers.
 * Listens from mount until the component is destroyed.
 *
 * Backed by `$state` (not `createSubscriber`) on purpose: a subscriber only
 * notices changes while an effect is reading it, so a `$derived` read from an
 * event handler would keep its first value forever.
 */
export function createDarkMode() {
	let dark = $state(isDarkTheme());
	$effect(() =>
		onThemeChange(() => {
			dark = isDarkTheme();
		})
	);
	return {
		get dark() {
			return dark;
		}
	};
}
