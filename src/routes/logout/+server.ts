import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const callbackUrl = url.searchParams.get('callbackUrl') || '/';
	
	// Create a minimal page that immediately triggers logout in the same window
	const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Logout</title>
</head>
<body>
	<form id="signout-form" method="POST" action="/auth/signout">
		<input type="hidden" name="callbackUrl" value="${callbackUrl}" />
	</form>
	<script>
		// Immediately submit the form to trigger logout flow
		document.getElementById('signout-form').submit();
	</script>
</body>
</html>`;

	return new Response(html, {
		headers: {
			'Content-Type': 'text/html'
		}
	});
};