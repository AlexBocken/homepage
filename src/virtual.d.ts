// Virtual modules served by plugins in vite.config.ts.

declare module 'virtual:faith-routes' {
	/** Every `/src/routes/[faithLang=faithLang]/**\/+page.svelte` path, sorted. */
	const paths: string[];
	export default paths;
}
