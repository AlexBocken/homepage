<script lang="ts">
  let { username, size = 40, alt = '' } = $props<{ username: string, size?: number, alt?: string }>();

  let imageError = $state(false);

  let profileUrl = $derived(`https://bocken.org/static/user/full/${username}.webp`);
  let altText = $derived(alt || `${username}'s profile picture`);

  function handleError() {
    imageError = true;
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
</script>

<div class="profile-picture" style="width: {size}px; height: {size}px;">
  {#if !imageError}
    <img
      src={profileUrl}
      alt={altText}
      onerror={handleError}
      loading="lazy"
    />
  {:else}
    <div class="fallback">
      {getInitials(username)}
    </div>
  {/if}
</div>

<style>
  .profile-picture {
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: relative;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .fallback {
    color: white;
    font-weight: bold;
    font-size: 0.75em;
    text-align: center;
    line-height: 1;
  }
</style>
