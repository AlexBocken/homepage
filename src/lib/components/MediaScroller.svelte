<script>
import "$lib/components/nordtheme.css"
</script>
<style>
.media-scroller {
  display: flex;
  flex-direction: row;
  flex-wrap:nowrap;
  overflow-x: auto;
  gap: 2rem;
  padding: 3rem;
  background-color: var(--nord2);
}


</style>
<div class="media-scroller snaps-inline">
	<slot></slot>
</div>
