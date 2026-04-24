<script>
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { getStickerById } from '$lib/utils/stickers';
  import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isToday, format, addMonths, subMonths
  } from 'date-fns';
  import { de } from 'date-fns/locale';

  let { completions = [], currentUser = '' } = $props();

  let viewDate = $state(new Date());

  let filteredCompletions = $derived(
    completions
      .filter((/** @type {any} */ c) => c.stickerId)
      .filter((/** @type {any} */ c) => !currentUser || c.completedBy === currentUser)
  );

  // Build a map: "YYYY-MM-DD" -> sticker ids[]
  let stickersByDate = $derived.by(() => {
    /** @type {Map<string, any[]>} */
    const map = new Map();
    for (const c of filteredCompletions) {
      const key = format(new Date(c.completedAt), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(c);
    }
    return map;
  });

  let calendarDays = $derived.by(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const calStart = startOfWeek(monthStart, { locale: de });
    const calEnd = endOfWeek(monthEnd, { locale: de });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  });

  let monthLabel = $derived(format(viewDate, 'MMMM yyyy', { locale: de }));

  const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  function prevMonth() { viewDate = subMonths(viewDate, 1); }
  function nextMonth() { viewDate = addMonths(viewDate, 1); }
</script>

<div class="cal-container">
  <div class="cal-header">
    <button class="cal-nav" onclick={prevMonth}><ChevronLeft size={18} /></button>
    <span class="cal-month">{monthLabel}</span>
    <button class="cal-nav" onclick={nextMonth}><ChevronRight size={18} /></button>
  </div>

  <div class="cal-grid">
    {#each weekdays as day}
      <div class="cal-weekday">{day}</div>
    {/each}

    {#each calendarDays as day}
      {@const key = format(day, 'yyyy-MM-dd')}
      {@const dayStickers = stickersByDate.get(key) || []}
      {@const inMonth = isSameMonth(day, viewDate)}
      <div
        class="cal-day"
        class:outside={!inMonth}
        class:today={isToday(day)}
        class:has-stickers={dayStickers.length > 0}
      >
        <span class="cal-day-num">{format(day, 'd')}</span>
        {#if dayStickers.length > 0}
          <div class="cal-stickers">
            {#each dayStickers.slice(0, 6) as completion}
              {@const sticker = getStickerById(completion.stickerId)}
              {#if sticker}
                <img
                  class="cal-sticker-img"
                  src="/stickers/{sticker.image}"
                  alt={sticker.name}
                  title="{sticker.name} — {completion.taskTitle}"
                />
              {/if}
            {/each}
            {#if dayStickers.length > 6}
              <span class="cal-more">+{dayStickers.length - 6}</span>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .cal-container {
    background: var(--color-bg-primary, white);
    border: 1px solid var(--color-border, #e8e4dd);
    border-radius: 14px;
    padding: 1rem;
    margin-bottom: 2rem;
  }

  .cal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  .cal-month {
    font-size: 1rem;
    font-weight: 700;
    text-transform: capitalize;
    min-width: 160px;
    text-align: center;
  }
  .cal-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: var(--color-text-secondary, #888);
    border-radius: 8px;
    cursor: pointer;
    transition: all 120ms;
  }
  .cal-nav:hover {
    background: var(--color-bg-secondary, #f0ede6);
    color: var(--color-text-primary, #333);
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
  }

  .cal-weekday {
    text-align: center;
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--color-text-secondary, #999);
    padding: 0.3rem 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .cal-day {
    position: relative;
    min-height: 80px;
    padding: 0.3rem;
    border-radius: 8px;
    border: 1px solid transparent;
    transition: background 120ms;
  }
  .cal-day.outside {
    opacity: 0.25;
  }
  .cal-day.today {
    background: rgba(94, 129, 172, 0.08);
    border-color: rgba(94, 129, 172, 0.2);
  }
  .cal-day.today .cal-day-num {
    background: var(--nord10);
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .cal-day.has-stickers {
    background: rgba(163, 190, 140, 0.06);
  }

  .cal-day-num {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-secondary, #888);
    line-height: 1;
    display: block;
    margin-bottom: 0.2rem;
  }

  .cal-stickers {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    align-items: center;
  }
  .cal-sticker-img {
    width: 28px;
    height: 28px;
    object-fit: contain;
    transition: transform 150ms;
    cursor: default;
  }
  .cal-sticker-img:hover {
    transform: scale(2);
    z-index: 10;
    position: relative;
    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.2));
  }
  .cal-more {
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--color-text-secondary, #aaa);
    display: flex;
    align-items: center;
    padding-left: 2px;
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme="light"])) .cal-container {
      background: var(--nord1);
      border-color: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .cal-nav:hover {
      background: var(--nord2);
    }
    :global(:root:not([data-theme="light"])) .cal-day.today {
      background: rgba(94, 129, 172, 0.12);
    }
    :global(:root:not([data-theme="light"])) .cal-day.has-stickers {
      background: rgba(163, 190, 140, 0.08);
    }
  }
  :global(:root[data-theme="dark"]) .cal-container {
    background: var(--nord1);
    border-color: var(--nord2);
  }
  :global(:root[data-theme="dark"]) .cal-nav:hover {
    background: var(--nord2);
  }
  :global(:root[data-theme="dark"]) .cal-day.today {
    background: rgba(94, 129, 172, 0.12);
  }
  :global(:root[data-theme="dark"]) .cal-day.has-stickers {
    background: rgba(163, 190, 140, 0.08);
  }

  @media (max-width: 500px) {
    .cal-day { min-height: 56px; padding: 0.2rem; }
    .cal-sticker-img { width: 22px; height: 22px; }
    .cal-stickers { gap: 2px; }
    .cal-month { font-size: 0.9rem; min-width: 130px; }
  }
</style>
