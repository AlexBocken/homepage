<script lang='ts'>
export let href
import "$lib/components/nordtheme.css"
import "$lib/css/action_button.css"
</script>

<style>
.container{
position: fixed;
bottom:0;
right:0;
width: 1rem;
height: 1rem;
padding: 2rem;
border-radius: 1000px;
margin: 2rem;
transition: 200ms;
background-color: var(--red);
display: grid;
justify-content: center;
align-content: center;
}
@media screen and (max-width: 500px) {
	.container{
		margin: 1rem;
	}
}
:global(.icon_svg){
width: 2rem;
height: 2rem;
fill: white;
}

:root{
    --angle: 15deg;
}
.container:hover,
.container:focus-within
{
	background-color: var(--nord0);
box-shadow: 0em 0em 0.5em 0.5em rgba(0,0,0,0.2);
	/*transform: scale(1.2,1.2);*/
	animation: shake 0.5s;
	animation-fill-mode: forwards;
}
:global(.container:hover .icon_svg),
:global(.container:focus-within .icon_svg){
	fill: white;
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
<a class="container action_button" {href}>
	<slot></slot>
</a>
