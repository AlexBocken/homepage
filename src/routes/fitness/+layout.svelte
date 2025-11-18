<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  let { children } = $props();

  const navItems = [
    { href: '/fitness', label: 'Dashboard', icon: '📊' },
    { href: '/fitness/templates', label: 'Templates', icon: '📋' },
    { href: '/fitness/sessions', label: 'Sessions', icon: '💪' },
    { href: '/fitness/workout', label: 'Start Workout', icon: '🏋️' }
  ];
</script>

<div class="fitness-layout">
  <nav class="fitness-nav">
    <h1>💪 Fitness Tracker</h1>
    <ul>
      {#each navItems as item}
        <li>
          <a 
            href={item.href} 
            class:active={$page.url.pathname === item.href}
          >
            <span class="icon">{item.icon}</span>
            {item.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
  
  <main class="fitness-main">
    {@render children()}
  </main>
</div>

<style>
  .fitness-layout {
    display: flex;
    min-height: 100vh;
    background: #f8fafc;
  }

  .fitness-nav {
    width: 250px;
    background: white;
    border-right: 1px solid #e5e7eb;
    padding: 1.5rem;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  .fitness-nav h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 2rem;
    text-align: center;
  }

  .fitness-nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .fitness-nav li {
    margin-bottom: 0.5rem;
  }

  .fitness-nav a {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    color: #6b7280;
    text-decoration: none;
    border-radius: 0.5rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .fitness-nav a:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .fitness-nav a.active {
    background: #3b82f6;
    color: white;
  }

  .fitness-nav .icon {
    margin-right: 0.75rem;
    font-size: 1.2rem;
  }

  .fitness-main {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .fitness-layout {
      flex-direction: column;
    }
    
    .fitness-nav {
      width: 100%;
      padding: 1rem;
    }
    
    .fitness-nav ul {
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      align-items: flex-start;
    }
    
    .fitness-nav li {
      margin-bottom: 0;
      margin-right: 0.5rem;
      text-align: left;
    }
    
    .fitness-nav a {
      padding: 0.5rem;
      font-size: 0.875rem;
      text-align: left;
      word-wrap: break-word;
      hyphens: auto;
      line-height: 1.2;
    }
    
    .fitness-main {
      padding: 1rem;
    }
  }
</style>