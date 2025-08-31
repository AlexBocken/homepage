import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const callbackUrl = url.searchParams.get('callbackUrl') || '/';
	
	// Create a minimal page that immediately triggers auth in the same window
	const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Login</title>
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