<script>
	export let data
	const admin = data.user?.access.includes('admin') ?? false
</script>
<style>
form label,
form label input
{
	display: block;
}
</style>
<section>
	<h2>Change Profile pictures</h2>
</section>

<section>
	<h2>Change password</h2>
	<form>
		<label>
		Altes Passwort:
			<input type="password" >
		</label>
		<label>
		Neues Passwort:
			<input type="password" >
		</label>
		<label>
		Neues Passwort wiederholen:
			<input type="password" >
		</label>
	</form>
</section>

{#if admin}
<section>
	<h2>Change user permissions</h2>
</section>
{/if}
