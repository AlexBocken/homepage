<script>
import "$lib/css/form.css"
</script>

<form action="?/register" method=POST>
	<h1>Regrieren</h1>
	<label>
		Username
		<input type="text" name="username" required>
	</label>
	<label>
		Passwort
		<input  name="password" type="password" required>
	</label>
	<button type="submit">Registrieren</button>
	<h4>Hinweis:</h4>
	<p>Dein Account wird keine Rechte haben bis ein Administrator dir welche gibt. Bis dahin ist der Account relativ nutzlos.</p>
</form>
