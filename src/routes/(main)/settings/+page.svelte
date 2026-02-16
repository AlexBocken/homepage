<script>
  import {enhance} from '$app/forms';
	export let data
  let password;
	const admin = data.user?.access.includes('admin') ?? false

</script>
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
	border-radius: var(--radius-pill);
	margin-top: 1em;
	transition: var(--transition-fast);
	cursor: pointer;
}
form button:hover, form button:focus-visible {
	background-color: var(--color-accent-hover);
	scale: 1.1;
}
form button:active { background-color: var(--color-accent-active); }
@media screen and (max-width: 600px) {
	form { margin-top: 0; }
}
input:invalid + div{
  display: none;
}
input:valid + div{
  position: absolute;
  color: green;
  bottom: 0.25rem;
  right: -0.25rem;
  font-size: 1.5rem;
  width: 1em;
  height: 1em;
}
form label,
form label input
{
  position: relative;
	display: block;
}
input.hide{
  display:none;
}
</style>
<section>
	<h2>Change Profile pictures</h2>
</section>

<section>
  <form action="?/change_password" method=POST use:enhance>
	<h2>Passwort ändern</h2>
    <input type="text" bind:value={data.user.username} class=hide name="username" required> 
		<label>
		Altes Passwort:
			<input type="password" name="old_password" required>
		</label>
		<label>
		Neues Passwort:
			<input type="password" name="new_password" required bind:value={password} minlength=10>
      <div>✔️</div>
		</label>
		<label>
		Neues Passwort wiederholen:
			<input type="password" name="new_password_rep" required pattern={password}>
      <div>✔️</div>
		</label>
    <button type="submit">Ändern</button>
	</form>
</section>

{#if admin}
<section>
	<h2>Change user permissions</h2>
</section>
{/if}
