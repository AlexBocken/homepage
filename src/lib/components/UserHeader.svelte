<script lang="ts">
	import { onMount } from "svelte";
	export let username;
	function toggle_options(){
		const el = document.querySelector("#options")
		el.hidden = !el.hidden
	}
	let src="https://new.bocken.org/static/user/thumb/" +  username + ".webp"
	onMount( () => {
		document.addEventListener("click", (e) => {
			const el = document.querySelector("#button")
			if(!el.contains(e.target)){
				document.querySelector("#options").hidden = true
			}
		})
	})
</script>
<style>
	/* (A) SPEECH BOX */
.speech {
  /* (A1) FONT */
   font-size: 1.1em;

  /* (A2) COLORS */
  color: #fff;
  background: var(--bg_color);

  /* (A3) DIMENSIONS + POSITION */
  position: relative;
  border-radius: 10px;
}

/* (B) ADD SPEECH "CALLOUT TAIL" */
/* (B1) USE ::AFTER TO CREATE THE "TAIL" */
.speech::after {
  /* (B1-1) ATTACH TRANSPARENT BORDERS */
  content: "";
  border: 20px solid transparent;

  /* (B1-2) NECESSARY TO POSITION THE "TAIL" */
  position: absolute;
}

/* (C) DIFFERENT TAIL POSITIONS */
/* (C1) TOP */
.top.speech::after {
  /* (C1-1) UP TRIANGLE */
  border-bottom-color: var(--bg_color);
  border-top: 0;

  /* (C1-2) POSITION AT TOP */
  top: -10px; left:84.5%;
  margin-left: -20px;
}


	button{
		--margin-right: 1rem;
		position: relative;
		background-color: transparent;
		border: none;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		margin-right: var(--margin-right);
		background-color: var(--nord4);
		background-position: center;
		background-size: contain;
	}
	#options{
		--bg_color: var(--nord3);
		box-sizing: border-box;
		border-radius: 5px;
		position: absolute;
		right: calc( -1*var(--margin-right) + 0.25rem);
		top: calc(100% + 10px);
		background-color: var(--bg_color);
		width: 30ch;
		padding: 1rem;
	}
	#options ul{
		color: white;
		font-size: 1.2rem;
		width: 100%;
		list-style-type: none;
		padding: 0;
	}
	#options li{
		margin-block: 0.5rem;
		text-align: left;
	}
	#options li a{
		text-decoration: none;
		color: white;
		text-align: left;
		transition: 100ms;
	}
	#options li:hover a{
		color: var(--red);
	}
	/* (B2) BOTTOM "CALLOUT TAIL" */
h2{
	margin-block: 0;
}
@media screen and (max-width: 800px){
	#options{
		top: unset;
		bottom: calc(100% + 15px);
		right: -200%;
		z-index: 99999999999999999999;
	}
	.top.speech::after {
	  /* (B2-1) DOWN TRIANGLE */
	  border-top-color: #a53d38;
	  border-bottom: 0;
		z-index: 99999999999999999999;

	  /* (B2-2) POSITION AT BOTTOM */
	  bottom: -20px; left: 50%;
	  margin-left: -20px;
	}
	button{
		margin-bottom: 2rem;
	}
}
</style>

{#if username}
	<button on:click={toggle_options} style="background-image: url({src})" id=button>
	<div id=options class="speech top" hidden>
			<h2>{username}</h2>
			<ul>
				<!--<li><a href="/settings">Einstellungen</a></li>-->
				<li><a href="/logout" >Log Out</a></li>
			</ul>
		</div>
	</button>
{:else}
	<a class=entry href=/login>Log In</a>
{/if}
