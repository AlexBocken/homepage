<script>
import "$lib/css/action_button.css"
import { Dumbbell } from 'lucide-svelte';

let { href, elapsed = '0:00', paused = false } = $props();
</script>

<style>
.container{
position: fixed;
bottom:0;
right:0;
width: 1rem;
height: 1rem;
padding: 2rem;
border-radius: var(--radius-pill);
margin: 2rem;
transition: var(--transition-normal);
background-color: var(--red);
display: grid;
justify-content: center;
align-content: center;
z-index: 100;
text-decoration: none;
}
@media screen and (max-width: 500px) {
	.container{
		margin: 1rem;
	}
}

.timer {
	font-variant-numeric: tabular-nums;
	font-weight: 700;
	font-size: 0.85rem;
	color: white;
	line-height: 1;
	text-align: center;
}
.timer.paused {
	color: var(--nord13);
}

:root{
    --angle: 15deg;
}
.container:hover,
.container:focus-within
{
	background-color: var(--nord0);
box-shadow: 0em 0em 0.5em 0.5em rgba(0,0,0,0.2);
	animation: shake 0.5s;
	animation-fill-mode: forwards;
}

@keyframes shake{
    0%{
      transform: rotate(0)
		scale(1,1);
    }
    25%{
    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
      	transform: rotate(var(--angle))
      		scale(1.2,1.2)
      ;
    }
    50%{

    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
      	transform: rotate(calc(-1* var(--angle)))
      		scale(1.2,1.2);
    }
    74%{

    	box-shadow: 0em 0em 1em 0.2em rgba(0, 0, 0, 0.6);
  	transform: rotate(var(--angle))
  		scale(1.2, 1.2);
	}
	100%{
      transform: rotate(0)
      scale(1.2,1.2);
    }
  }
</style>
<a class="container action_button" {href} aria-label="Return to active workout">
	<span class="timer" class:paused>{elapsed}</span>
	<Dumbbell size={26} color="white" />
</a>
