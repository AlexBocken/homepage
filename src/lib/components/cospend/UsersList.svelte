<script lang="ts">
  import ProfilePicture from './ProfilePicture.svelte';

  let {
    users = $bindable([]),
    currentUser = '',
    predefinedMode = false,
    canRemoveUsers = true,
    newUser = $bindable('')
  } = $props<{
    users?: string[],
    currentUser?: string,
    predefinedMode?: boolean,
    canRemoveUsers?: boolean,
    newUser?: string
  }>();
  
  function addUser() {
    if (predefinedMode) return;
    
    if (newUser.trim() && !users.includes(newUser.trim())) {
      users = [...users, newUser.trim()];
      newUser = '';
    }
  }

  function removeUser(userToRemove) {
    if (predefinedMode) return;
    if (!canRemoveUsers) return;
    
    if (users.length > 1 && userToRemove !== currentUser) {
      users = users.filter(u => u !== userToRemove);
    }
  }
</script>

<div class="form-section">
  <h2>Split Between Users</h2>
  
  {#if predefinedMode}
    <div class="predefined-users">
      <p class="predefined-note">Splitting between predefined users:</p>
      <div class="users-list">
        {#each users as user}
          <div class="user-item with-profile">
            <ProfilePicture username={user} size={32} />
            <span class="username">{user}</span>
            {#if user === currentUser}
              <span class="you-badge">You</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="users-list">
      {#each users as user}
        <div class="user-item with-profile">
          <ProfilePicture username={user} size={32} />
          <span class="username">{user}</span>
          {#if user === currentUser}
            <span class="you-badge">You</span>
          {/if}
          {#if canRemoveUsers && user !== currentUser}
            <button type="button" class="remove-user" onclick={() => removeUser(user)}>
              Remove
            </button>
          {/if}
        </div>
      {/each}
    </div>

    <div class="add-user js-enhanced" style="display: none;">
      <input
        type="text"
        bind:value={newUser}
        placeholder="Add user..."
        onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addUser())}
      />
      <button type="button" onclick={addUser}>Add User</button>
    </div>
  {/if}
</div>

<style>
  .form-section {
    background: var(--nord6);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--nord4);
  }

  .form-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--nord0);
    font-size: 1.25rem;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .form-section {
      background: var(--nord1);
      border-color: var(--nord2);
    }

    :global(:root:not([data-theme="light"])) .form-section h2 {
      color: var(--font-default-dark);
    }
  }
:global(:root[data-theme="dark"]) .form-section {
	background: var(--nord1);
      border-color: var(--nord2);
}
:global(:root[data-theme="dark"]) .form-section h2 {
	color: var(--font-default-dark);
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
    background-color: var(--nord5);
    padding: 0.5rem 0.75rem;
    border-radius: 1rem;
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .user-item {
      background-color: var(--nord2);
      border-color: var(--nord3);
    }
  }
:global(:root[data-theme="dark"]) .user-item {
	background-color: var(--nord2);
      border-color: var(--nord3);
}

  .user-item.with-profile {
    gap: 0.75rem;
  }

  .user-item .username {
    font-weight: 500;
    color: var(--nord0);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .user-item .username {
      color: var(--font-default-dark);
    }
  }
:global(:root[data-theme="dark"]) .user-item .username {
	color: var(--font-default-dark);
}

  .you-badge {
    background-color: var(--blue);
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .predefined-users {
    background-color: var(--nord5);
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--nord4);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .predefined-users {
      background-color: var(--nord2);
      border-color: var(--nord3);
    }
  }
:global(:root[data-theme="dark"]) .predefined-users {
	background-color: var(--nord2);
      border-color: var(--nord3);
}

  .predefined-note {
    margin: 0 0 1rem 0;
    color: var(--nord2);
    font-size: 0.9rem;
    font-style: italic;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .predefined-note {
      color: var(--nord4);
    }
  }
:global(:root[data-theme="dark"]) .predefined-note {
	color: var(--nord4);
}

  .remove-user {
    background-color: var(--red);
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .remove-user:hover {
    background-color: var(--nord11);
    transform: translateY(-1px);
  }

  .add-user {
    display: flex;
    gap: 0.5rem;
  }

  .add-user input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--nord4);
    border-radius: 0.5rem;
    font-size: 1rem;
    background-color: var(--nord6);
    color: var(--nord0);
    box-sizing: border-box;
  }

  .add-user input:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .add-user input {
      background-color: var(--nord2);
      color: var(--font-default-dark);
      border-color: var(--nord3);
    }
  }
:global(:root[data-theme="dark"]) .add-user input {
	background-color: var(--nord2);
      color: var(--font-default-dark);
      border-color: var(--nord3);
}

  .add-user button {
    background-color: var(--blue);
    color: white;
    border: none;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-user button:hover {
    background-color: var(--nord10);
    transform: translateY(-1px);
  }
</style>