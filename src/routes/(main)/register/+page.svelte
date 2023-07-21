<style>
	form{
		background-color: var(--nord5);
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
	label{
		font-size: 1.2em;
	}
	input{
		display: block;
		font-size: 1.2rem;
	}
	button{
		 background-color: var(--red);
		 color: white;
		 border: none;
		 padding: 0.5em 1em;
		 font-size: 1.3em;
		 border-radius: 1000px;
		 margin-top: 1em;
	}
	@media screen and (max-width: 600px){
		form{
			margin-top: 0;
		}
	}

</style>

<form action="?/register" method=POST>
	<h1>Register</h1>
	<label>
		Username
		<input type="text" name="username">
	</label>
	<label>
		Passwort
		<input  name="password" type="password">
	</label>
	<button type="submit">Register</button>
</form>
