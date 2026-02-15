<style>
form {
	background-color: var(--color-bg-secondary);
	display: flex;
	flex-direction: column;
	max-width: 600px;
	gap: 0.5em;
	margin-inline: auto;
	justify-content: center;
	align-items: center;
	padding-block: 2rem;
	margin-block: 2rem;
}
form label { font-size: 1.2em; }
form input { display: block; font-size: 1.2rem; }
form button {
	background-color: var(--color-accent);
	color: var(--color-text-on-accent);
	border: none;
	padding: 0.5em 1em;
	font-size: 1.3em;
	border-radius: 1000px;
	margin-top: 1em;
	transition: 100ms;
	cursor: pointer;
}
form button:hover, form button:focus-visible {
	background-color: var(--color-accent-hover);
	scale: 1.1;
}
form button:active { background-color: var(--color-accent-active); }
form p { max-width: 400px; margin-top: 0; }
form h4 { margin-bottom: 0; }
@media screen and (max-width: 600px) {
	form { margin-top: 0; }
}
</style>

<form action="?/register" method=POST>
	<h1>Registrieren</h1>
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
