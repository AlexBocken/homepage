<style>
	h1{
		text-align: center;
		font-size: 3em;
	}
	p{
		max-width: 600px;
		margin: 0 auto;
		font-size: 1.1em;
	}

</style>

<h1>Settlement Plan</h1>
<script lang="ts">
  import { onMount } from 'svelte';

  let name = '';
  let category = '';
  let date = new Date().toISOString().split('T')[0]; // format as yyyy-mm-dd
  let images: File[] = [];
  let description = '';
  let note = '';
  let tags = '';
  let original_amount = 0;
  let currency = 'CHF';
  let payment_method = '';

  let personal_amounts = [
    { user: 'alexander', amount: 0 },
    { user: 'anna', amount: 0 }
  ];

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('dateCreated', date);
    formData.append('description', description);
    formData.append('note', note);
    formData.append('tags', JSON.stringify(tags.split(',').map(tag => tag.trim())));
    formData.append('total_amount', total_amount.toString());
    formData.append('currency', currency);
    formData.append('payment_method', payment_method);
    formData.append('personal_amounts', JSON.stringify(personal_amounts));

    images.forEach((file, index) => {
      formData.append('images', file);
    });

    const res = await fetch('/api/cospend/add', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();
    alert(result.message);
  };
</script>

<form on:submit|preventDefault={handleSubmit} class="flex flex-col gap-4 max-w-xl">
  <label>
    Name:
    <input type="text" bind:value={name} required />
  </label>

  <label>
    Category:
    <input type="text" bind:value={category} />
  </label>

  <label>
    Date Created:
    <input type="date" bind:value={date} />
  </label>

  <label>
    Images:
    <input type="file" multiple accept="image/*" on:change={(e) => images = Array.from(e.target.files)} />
  </label>

  <label>
    Description:
    <textarea bind:value={description}></textarea>
  </label>

  <label>
    Note:
    <textarea bind:value={note}></textarea>
  </label>

  <label>
    Tags (comma separated):
    <input type="text" bind:value={tags} />
  </label>

  <label>
    Total Amount:
    <input type="number" bind:value={original_amount} step="0.01" required />
  </label>

  <fieldset>
    <legend>Personal Amounts</legend>
    {#each personal_amounts as entry, i}
      <div class="flex gap-2 items-center">
        <label>{entry.user}</label>
        <input type="number" bind:value={personal_amounts[i].amount} step="0.01" required />
      </div>
    {/each}
  </fieldset>

  <label>
    Currency:
    <select bind:value={currency}>
      <option value="CHF">CHF</option>
      <option value="EUR">EUR</option>
      <option value="USD">USD</option>
    </select>
  </label>

  <label>
    Payment Method:
    <select bind:value={payment_method}>
      <option value="">-- Select --</option>
      <option value="cash">Cash</option>
      <option value="bank_transfer">Bank Transfer</option>
      <option value="credit_card">Credit Card</option>
      <option value="twint">Twint</option>
    </select>
  </label>

  <button type="submit">Save Payment</button>
</form>
