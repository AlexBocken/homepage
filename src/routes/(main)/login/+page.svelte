<script>
import "$lib/css/form.css"
import "$lib/css/nordtheme.css"
</script>
<form action="?/login" method=POST>
	<h1>Log In</h1>
	<p>
		Note: This is a separate account to all the services running on this server.
		Please only use this login if you want to edit recipes.
		In the future, this login will be merged with the other services.
	</p>
	<label>
		Benutzername
		<input type="text" name="username" required>
	</label>
	<label>
		Passwort
		<input  name="password" type="password" required>
	</label>

	<button type="submit">Log In</button>
	<p>Noch keinen Account? <a href=/register>Hier registrieren</a>.</p>
</form>
