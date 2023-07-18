<script>
	import Header from '$lib/components/Header.svelte'
  	import { setCookie } from 'svelte-cookie';

	export async function createJWT() {
	    const res = await fetch('/api/login',
	    		{method: 'POST',
			body: JSON.stringify({
				username: "testuser2",
				password: "password",
			})
			}
			)
	    const jwt = await res.json()
	    setCookie('UserSession', jwt, {expires: 7})
	}
</script>
<style>
</style>

<Header>
<ul class=site_header slot=links>
	<li><a href="/rezepte">Rezepte</a></li>
	<li><a href="/bilder">Bilder</a></li>
	<li><a href="/git">Git</a></li>
	<li><a href="/transmission">Transmission</a></li>
</ul>

<h1>Log In</h1>
<form action="?/login" method=POST>
	<label>
		Username
		<input type="text" name="username">
	</label>
	<label>
		Passwort
		<input  name="password" type="password">
	</label>

	<button type="submit">Log In</button>
</form>
</Header>
