<script>
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import TaskForm from '$lib/components/tasks/TaskForm.svelte';

  let { data } = $props();

  function done() {
    goto(resolve('/tasks'));
  }
</script>

<svelte:head><title>Aufgabe bearbeiten - Bocken</title></svelte:head>

<div class="form-route">
  <TaskForm task={data.task} onsaved={done} onclosed={done} />
</div>

<style>
  .form-route {
    max-width: 560px;
    margin: 0 auto;
    padding: 1.5rem 1rem 4rem;
  }
</style>
