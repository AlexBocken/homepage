<script>
	import Header from '$lib/components/Header.svelte'
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
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

  	export async function registerUserTest(){
  	   const res = await fetch('/api/register',
  	  		{method: 'POST',
  	      	body: JSON.stringify({
  	      		username: "testuser2",
  	      		password: "password",
  	      		access: ["rezepte", "abrechnung", "flims" ]
  	      	})
  	      	}
  	      	)
  	    console.log("res:", res);
  	    const j = await res.json()
  	    console.log("response:", j)
  	}

	export async function readJWTSS(){
	     const res = await fetch('/api/verify',
	    		{method: 'GET',
			credentials: 'include',
			}
			)
		const item = await res.json()
		console.log(res)
		console.log(item)
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

<section>
<h2><a href="/rezepte">Rezepte</a></h2>
</section>

<section>
<h2><a href="/bilder">Bilder</a></h2>
</section>

<section>
<h2><a href="/git">Git</a></h2>
</section>

<section>
<h2><a href="/transmission">Transmission Web Viewer</a></h2>
</section>

  <button on:click={registerUserTest}>Test User Registration</button>
  <button on:click={createJWT}>Log In</button>
  <button on:click={readJWTSS}>Test reading cookie</button>
</Header>
