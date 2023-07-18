<script>
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

<h1>Register</h1>
<form action="?/register" method=POST>
	<label>
		Username
		<input type="text" name="username">
	</label>
	<label>
		Passwort
		<input  name="password" type="password">
	</label>
	<label>
		Rezepte
		<input type="checkbox" name="rezepte">
	</label>
	<label>
		Abrechnungen
		<input type="checkbox" name="abrechnung">
	</label>
	<label>
		Flims
		<input type="checkbox" name="flims">
	</label>

	<button type="submit">Register</button>
</form>
