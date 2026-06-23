<script>
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import TaskForm from '$lib/components/tasks/TaskForm.svelte';
  import StickerPopup from '$lib/components/tasks/StickerPopup.svelte';
  import { getStickerForTags } from '$lib/utils/stickers';

  /** @type {any} */
  let awardedSticker = $state(null);

  function done() {
    goto(resolve('/tasks'));
  }

  /** Create the task, mark it done right away, and reveal the sticker reward. */
  async function createAndComplete(/** @type {any} */ task) {
    // Roll the sticker client-side so the popup can show immediately, and warm
    // the image cache so the cat is decoded by the time it bounces in.
    const sticker = getStickerForTags(task.tags ?? [], task.difficulty || 'medium');
    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.src = `/stickers/${sticker.image}`;
    }
    awardedSticker = sticker;

    await fetch(`/api/tasks/${task._id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stickerId: sticker.id })
    });
  }
</script>

<svelte:head><title>Neue Aufgabe - Bocken</title></svelte:head>

<div class="form-route">
  <TaskForm onsaved={done} onclosed={done} oncompleted={createAndComplete} />
</div>

{#if awardedSticker}
  <StickerPopup sticker={awardedSticker} onclose={done} />
{/if}

<style>
  .form-route {
    max-width: 560px;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }
</style>
