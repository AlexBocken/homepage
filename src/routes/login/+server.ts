import type { RequestHandler } from './$types';

/** Only allow same-origin relative paths as a post-auth redirect target, then
 *  HTML-escape for the attribute context. Anything external (`//evil`, `http:…`)
 *  or containing markup is dropped to `/`. Guards against reflected XSS and open
 *  redirect via the `callbackUrl` query param. */
function safeCallbackUrl(raw: string | null): string {
	const value = raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export const GET: RequestHandler = async ({ url }) => {
	const callbackUrl = safeCallbackUrl(url.searchParams.get('callbackUrl'));

	// Create a minimal page with site styling that immediately triggers auth
	const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Login</title>
	<style>
		:root{
			--nord0: #2E3440;
			--nord1: #3B4252;
			--nord4: #D8DEE9;
		}
		body {
			background-color: var(--nord1);
			color: var(--nord4);
			font-family: sans-serif;
			margin: 0;
			padding: 0;
			min-height: 100vh;
		}
	</style>
</head>
<body>
	<form id="signin-form" method="POST" action="/auth/signin/authentik">
		<input type="hidden" name="callbackUrl" value="${callbackUrl}" />
	</form>
	<script>
		// Immediately submit the form to trigger auth flow
		document.getElementById('signin-form').submit();
	</script>
</body>
</html>`;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html'
		}
	});
};