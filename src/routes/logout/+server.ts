import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const callbackUrl = url.searchParams.get('callbackUrl') || '/';
	
	// Create an auto-submitting form that POSTs to Auth.js signout
	const html = `
<!DOCTYPE html>
<html>
<head>
	<title>Signing out...</title>
	<style>
		body { font-family: system-ui; text-align: center; padding: 2rem; }
		.spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
		@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
	</style>
</head>
<body>
	<h2>Signing out...</h2>
	<div class="spinner"></div>
	<form id="signout-form" method="POST" action="/auth/signout">
		<input type="hidden" name="callbackUrl" value="${callbackUrl}" />
	</form>
	<script>
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