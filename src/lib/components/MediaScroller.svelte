<script>
import "$lib/css/nordtheme.css"
export let title
</script>
<style>
.media-scroller {
  display: flex;
  flex-direction: row;
  flex-wrap:nowrap;
  overflow-x: auto;
  gap: 2rem;
  padding: 3rem;
}
.media_scroller_wrapper{
  background-color: var(--nord2);
}
h2{
	color: var(--nord6);
	padding-top: 2rem;
 	margin: 1em 0em 0em 4rem;
	font-size: 3rem;
}


</style>
<div class=media_scroller_wrapper>
{#if title}
	<h2>{title}</h2>
{/if}
<div class="media-scroller snaps-inline">
	<slot></slot>
</div>
</div>
