<script lang="ts">
	export let username;
	console.log("username UESRHEADER", username)
	function show_options(){
		const el = document.querySelector("#options")
		el.hidden = !el.hidden
	}
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

/* (B2) BOTTOM "CALLOUT TAIL" */
.bottom.speech::after {
  /* (B2-1) DOWN TRIANGLE */
  border-top-color: #a53d38;
  border-bottom: 0;

  /* (B2-2) POSITION AT BOTTOM */
  bottom: -20px; left: 50%;
  margin-left: -20px;
}

/* (C) DIFFERENT TAIL POSITIONS */
/* (C1) TOP */
.top.speech::after {
  /* (C1-1) UP TRIANGLE */
  border-bottom-color: var(--bg_color);
  border-top: 0;

  /* (C1-2) POSITION AT TOP */
  top: -20px; left:87%;
  margin-left: -20px;
}

/* (C2) LEFT */
.left.speech::after {
  /* (C2-1) LEFT TRIANGLE */
  border-right-color: black;
  border-left: 0;

  /* (C2-2) POSITION AT LEFT */
  left: -20px; top: 50%;
  margin-top: -20px;
}

/* (C3) RIGHT */
.right.speech::after {
  /* (C3-1) RIGHT TRIANGLE */
  border-left-color: black;
  border-right: 0;

  /* (C3-2) POSITION AT RIGHT */
  right: -20px; top: 50%;
  margin-top: -20px;
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
	}
	img{
		height: 2.5rem;
		border-radius: 50%;
		object-fit: cover;
		object-position: center;
	}
	#options{
		--bg_color: var(--nord3);
		box-sizing: border-box;
		border-radius: 5px;
		position: absolute;
		right: calc( -1*var(--margin-right) + 0.25rem);
		top: calc(100% + 20px);
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
</style>

{#if username}
	<button on:click={show_options}><img src="https://new.bocken.org/static/user/thumb/{username}.webp">
		<div id=options class="speech top" hidden>
			<ul>
				<li><a href="/logout">Log Out</a></li>
			</ul>
		</div>
	</button>
{:else}
	<a class=entry href=/login>Log In</a>
{/if}
