<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getCategoryOptions } from '$lib/utils/categories';
  
  export let data;

  let formData = {
    title: '',
    description: '',
    amount: '',
    paidBy: data.session?.user?.nickname || '',
    date: new Date().toISOString().split('T')[0],
    category: 'groceries',
    splitMethod: 'equal',
    splits: []
  };

  let imageFile = null;
  let imagePreview = '';
  let users = [data.session?.user?.nickname || ''];
  let newUser = '';
  let splitAmounts = {};
  let loading = false;
  let error = null;
  
  $: categoryOptions = getCategoryOptions();

  onMount(() => {
    if (data.session?.user?.nickname) {
      addSplitForUser(data.session.user.nickname);
    }
  });

  function handleImageChange(event) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, WebP)');
        return;
      }

      imageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage() {
    imageFile = null;
    imagePreview = '';
  }

  function addUser() {
    if (newUser.trim() && !users.includes(newUser.trim())) {
      users = [...users, newUser.trim()];
      addSplitForUser(newUser.trim());
      newUser = '';
    }
  }

  function removeUser(userToRemove) {
    if (users.length > 1 && userToRemove !== data.session.user.nickname) {
      users = users.filter(u => u !== userToRemove);
      delete splitAmounts[userToRemove];
      splitAmounts = { ...splitAmounts };
    }
  }

  function addSplitForUser(username) {
    if (!splitAmounts[username]) {
      splitAmounts[username] = 0;
      splitAmounts = { ...splitAmounts };
    }
  }

  function calculateEqualSplits() {
    if (!formData.amount || users.length === 0) return;
    
    const amountNum = parseFloat(formData.amount);
    const splitAmount = amountNum / users.length;
    
    users.forEach(user => {
      if (user === formData.paidBy) {
        splitAmounts[user] = splitAmount - amountNum; // They get negative (they're owed)
      } else {
        splitAmounts[user] = splitAmount; // They owe positive amount
      }
    });
    splitAmounts = { ...splitAmounts };
  }

  function calculateFullPayment() {
    if (!formData.amount) return;
    
    const amountNum = parseFloat(formData.amount);
    
    users.forEach(user => {
      if (user === formData.paidBy) {
        splitAmounts[user] = -amountNum; // They paid it all, so they're owed the full amount
      } else {
        splitAmounts[user] = 0; // Others don't owe anything
      }
    });
    splitAmounts = { ...splitAmounts };
  }

  function handleSplitMethodChange() {
    if (formData.splitMethod === 'equal') {
      calculateEqualSplits();
    } else if (formData.splitMethod === 'full') {
      calculateFullPayment();
    }
  }

  async function uploadImage() {
    if (!imageFile) return null;
    
    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
      const response = await fetch('/api/cospend/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const result = await response.json();
      return result.path;
    } catch (err) {
      console.error('Image upload failed:', err);
      return null;
    }
  }

  async function handleSubmit() {
    if (!formData.title.trim() || !formData.amount || parseFloat(formData.amount) <= 0) {
      error = 'Please fill in all required fields with valid values';
      return;
    }

    if (users.length === 0) {
      error = 'Please add at least one user to split with';
      return;
    }

    loading = true;
    error = null;

    try {
      let imagePath = null;
      if (imageFile) {
        imagePath = await uploadImage();
      }

      const splits = users.map(user => ({
        username: user,
        amount: splitAmounts[user] || 0,
        proportion: formData.splitMethod === 'proportional' ? (splitAmounts[user] || 0) / parseFloat(formData.amount) : undefined
      }));

      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        image: imagePath,
        splits
      };

      const response = await fetch('/api/cospend/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment');
      }

      const result = await response.json();
      await goto('/cospend');

    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  $: if (formData.amount && formData.splitMethod && formData.paidBy) {
    handleSplitMethodChange();
  }
</script>

<svelte:head>
  <title>Add Payment - Cospend</title>
</svelte:head>

<main class="add-payment">
  <div class="header">
    <h1>Add New Payment</h1>
    <a href="/cospend" class="back-link">← Back to Cospend</a>
  </div>

  <form on:submit|preventDefault={handleSubmit} class="payment-form">
    <div class="form-section">
      <h2>Payment Details</h2>
      
      <div class="form-group">
        <label for="title">Title *</label>
        <input 
          type="text" 
          id="title" 
          bind:value={formData.title} 
          required 
          placeholder="e.g., Dinner at restaurant"
        />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea 
          id="description" 
          bind:value={formData.description} 
          placeholder="Additional details..."
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="category">Category *</label>
        <select id="category" bind:value={formData.category} required>
          {#each categoryOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="amount">Amount (CHF) *</label>
          <input 
            type="number" 
            id="amount" 
            bind:value={formData.amount} 
            required 
            min="0" 
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div class="form-group">
          <label for="date">Date</label>
          <input 
            type="date" 
            id="date" 
            bind:value={formData.date} 
            required
          />
        </div>
      </div>

      <div class="form-group">
        <label for="paidBy">Paid by</label>
        <select id="paidBy" bind:value={formData.paidBy} required>
          {#each users as user}
            <option value={user}>{user}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="form-section">
      <h2>Receipt Image</h2>
      
      {#if imagePreview}
        <div class="image-preview">
          <img src={imagePreview} alt="Receipt preview" />
          <button type="button" class="remove-image" on:click={removeImage}>
            Remove Image
          </button>
        </div>
      {:else}
        <div class="image-upload">
          <label for="image" class="upload-label">
            <div class="upload-content">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/>
                <line x1="16" y1="5" x2="22" y2="5"/>
                <line x1="19" y1="2" x2="19" y2="8"/>
              </svg>
              <p>Upload Receipt Image</p>
              <small>JPEG, PNG, WebP (max 5MB)</small>
            </div>
          </label>
          <input 
            type="file" 
            id="image" 
            accept="image/jpeg,image/jpg,image/png,image/webp" 
            on:change={handleImageChange}
            hidden
          />
        </div>
      {/if}
    </div>

    <div class="form-section">
      <h2>Split Between Users</h2>
      
      <div class="users-list">
        {#each users as user}
          <div class="user-item">
            <span>{user}</span>
            {#if user !== data.session.user.nickname}
              <button type="button" class="remove-user" on:click={() => removeUser(user)}>
                Remove
              </button>
            {/if}
          </div>
        {/each}
      </div>

      <div class="add-user">
        <input 
          type="text" 
          bind:value={newUser} 
          placeholder="Add user..."
          on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addUser())}
        />
        <button type="button" on:click={addUser}>Add User</button>
      </div>
    </div>

    <div class="form-section">
      <h2>Split Method</h2>
      
      <div class="split-method">
        <label>
          <input type="radio" bind:group={formData.splitMethod} value="equal" />
          Equal Split
        </label>
        <label>
          <input type="radio" bind:group={formData.splitMethod} value="full" />
          Paid in Full by {formData.paidBy}
        </label>
        <label>
          <input type="radio" bind:group={formData.splitMethod} value="proportional" />
          Custom Proportions
        </label>
      </div>

      {#if formData.splitMethod === 'proportional'}
        <div class="proportional-splits">
          <h3>Custom Split Amounts</h3>
          {#each users as user}
            <div class="split-input">
              <label>{user}</label>
              <input 
                type="number" 
                step="0.01" 
                bind:value={splitAmounts[user]}
                placeholder="0.00"
              />
            </div>
          {/each}
        </div>
      {/if}

      {#if Object.keys(splitAmounts).length > 0}
        <div class="split-preview">
          <h3>Split Preview</h3>
          {#each users as user}
            <div class="split-item">
              <span>{user}</span>
              <span class="amount" class:positive={splitAmounts[user] < 0} class:negative={splitAmounts[user] > 0}>
                {#if splitAmounts[user] > 0}
                  owes CHF {splitAmounts[user].toFixed(2)}
                {:else if splitAmounts[user] < 0}
                  is owed CHF {Math.abs(splitAmounts[user]).toFixed(2)}
                {:else}
                  even
                {/if}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <div class="form-actions">
      <button type="button" class="btn-secondary" on:click={() => goto('/cospend')}>
        Cancel
      </button>
      <button type="submit" class="btn-primary" disabled={loading}>
        {loading ? 'Creating...' : 'Create Payment'}
      </button>
    </div>
  </form>
</main>

<style>
  .add-payment {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .header h1 {
    margin: 0;
    color: #333;
  }

  .back-link {
    color: #1976d2;
    text-decoration: none;
  }

  .payment-form {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .form-section {
    background: white;
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .form-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #333;
    font-size: 1.25rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #555;
  }

  input, textarea, select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
  }

  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
  }

  .image-upload {
    border: 2px dashed #ddd;
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  .image-upload:hover {
    border-color: #1976d2;
    background-color: #f5f5f5;
  }

  .upload-label {
    cursor: pointer;
    display: block;
  }

  .upload-content svg {
    color: #666;
    margin-bottom: 1rem;
  }

  .upload-content p {
    margin: 0 0 0.5rem 0;
    font-weight: 500;
    color: #333;
  }

  .upload-content small {
    color: #666;
  }

  .image-preview {
    text-align: center;
  }

  .image-preview img {
    max-width: 100%;
    max-height: 300px;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .remove-image {
    background-color: #d32f2f;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .users-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .user-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: #f5f5f5;
    padding: 0.5rem 0.75rem;
    border-radius: 1rem;
  }

  .remove-user {
    background-color: #d32f2f;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .add-user {
    display: flex;
    gap: 0.5rem;
  }

  .add-user input {
    flex: 1;
  }

  .add-user button {
    background-color: #1976d2;
    color: white;
    border: none;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .split-method {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .split-method label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .proportional-splits {
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .proportional-splits h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .split-input {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .split-input label {
    min-width: 100px;
    margin-bottom: 0;
  }

  .split-input input {
    max-width: 120px;
  }

  .split-preview {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 0.5rem;
  }

  .split-preview h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .split-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .amount.positive {
    color: #2e7d32;
    font-weight: 500;
  }

  .amount.negative {
    color: #d32f2f;
    font-weight: 500;
  }

  .error {
    background-color: #ffebee;
    color: #d32f2f;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .btn-primary, .btn-secondary {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: #1976d2;
    color: white;
    border: none;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #1565c0;
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background-color: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }

  .btn-secondary:hover {
    background-color: #e8e8e8;
  }

  @media (max-width: 600px) {
    .add-payment {
      padding: 1rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .form-actions {
      flex-direction: column;
    }
  }
</style>