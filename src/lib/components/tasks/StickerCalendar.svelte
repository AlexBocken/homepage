<script>
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { getStickerById } from '$lib/utils/stickers';
  import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isToday, isWeekend, format, addMonths, subMonths
  } from 'date-fns';
  import { de } from 'date-fns/locale';

  let { completions = [], currentUser = '' } = $props();

  // who-did-what colours (the household)
  const PERSON_COLOR = /** @type {Record<string, string>} */ ({
    anna: 'var(--nord15)',
    alexander: 'var(--nord10)'
  });
  const personColor = /** @param {string} who */ (who) => PERSON_COLOR[who?.toLowerCase()] || 'var(--nord12)';

  // every sticker drop, both members
  let drops = $derived(completions.filter((/** @type {any} */ c) => c.stickerId));

  // Who's visible on the grid. Default: just the current user; others appear
  // only when you tap their name in the tally.
  let allPeople = $derived([...new Set(drops.map((/** @type {any} */ c) => c.completedBy))]);
  let defaultShown = $derived(new Set(currentUser ? [currentUser] : allPeople));
  /** @type {Set<string> | null} */
  let manual = $state(null);
  let shown = $derived(manual ?? defaultShown);
  /** @param {string} who */
  function toggle(who) {
    const next = new Set(shown);
    if (next.has(who)) next.delete(who);
    else next.add(who);
    manual = next;
  }

  /** @param {string} s */
  function hash(s) {
    let h = 0;
    for (let i = 0; i < (s || '').length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  // "YYYY-MM-DD" -> completions[]
  let byDate = $derived.by(() => {
    /** @type {Map<string, any[]>} */
    const map = new Map();
    for (const c of drops) {
      if (!shown.has(c.completedBy)) continue;
      const key = format(new Date(c.completedAt), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(c);
    }
    return map;
  });

  let calendarDays = $derived.by(() => {
    const calStart = startOfWeek(startOfMonth(viewDate), { locale: de });
    const calEnd = endOfWeek(endOfMonth(viewDate), { locale: de });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  });

  let viewDate = $state(new Date());
  let monthLabel = $derived(format(viewDate, 'MMMM yyyy', { locale: de }));

  // per-person tally for the visible month
  let tally = $derived.by(() => {
    /** @type {Map<string, number>} */
    const m = new Map();
    for (const c of drops) {
      if (!isSameMonth(new Date(c.completedAt), viewDate)) continue;
      m.set(c.completedBy, (m.get(c.completedBy) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  });

  const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  function prevMonth() { viewDate = subMonths(viewDate, 1); }
  function nextMonth() { viewDate = addMonths(viewDate, 1); }
</script>

<div class="cal-page">
  <span class="tape tape-l" aria-hidden="true"></span>
  <span class="tape tape-r" aria-hidden="true"></span>

  <div class="cal-header">
    <button class="cal-nav" onclick={prevMonth} aria-label="Voriger Monat"><ChevronLeft size={18} /></button>
    <span class="cal-month">{monthLabel}</span>
    <button class="cal-nav" onclick={nextMonth} aria-label="Nächster Monat"><ChevronRight size={18} /></button>
  </div>

  {#if tally.length > 0}
    <div class="tally">
      {#each tally as [who, n] (who)}
        <button
          type="button"
          class="tally-chip"
          class:active={shown.has(who)}
          class:me={who === currentUser}
          style="--pc: {personColor(who)}"
          title="{shown.has(who) ? 'Ausblenden' : 'Einblenden'}"
          aria-pressed={shown.has(who)}
          onclick={() => toggle(who)}
        >
          <span class="dot"></span>{who}<strong>{n}</strong>
        </button>
      {/each}
    </div>
  {/if}

  <div class="cal-grid">
    {#each weekdays as day (day)}
      <div class="cal-weekday">{day}</div>
    {/each}

    {#each calendarDays as day (day.toISOString())}
      {@const key = format(day, 'yyyy-MM-dd')}
      {@const dayDrops = byDate.get(key) || []}
      {@const inMonth = isSameMonth(day, viewDate)}
      <div
        class="cal-day"
        class:outside={!inMonth}
        class:weekend={isWeekend(day)}
        class:today={isToday(day)}
      >
        <span class="cal-day-num">{format(day, 'd')}</span>
        {#if dayDrops.length > 0}
          <div class="stuck">
            {#each dayDrops.slice(0, 4) as c (c._id)}
              {@const sticker = getStickerById(c.stickerId)}
              {#if sticker}
                {@const tilt = (hash(c._id) % 13) - 6}
                <span class="cat" style="--tilt: {tilt}deg; --pc: {personColor(c.completedBy)}">
                  <img src="/stickers/{sticker.image}" alt={sticker.name} title="{sticker.name} — {c.taskTitle} ({c.completedBy})" loading="lazy" />
                  <span class="who-dot"></span>
                </span>
              {/if}
            {/each}
            {#if dayDrops.length > 4}
              <span class="more">+{dayDrops.length - 4}</span>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  /* warm paper page (matches the sticker album) — stays cream in both themes */
  .cal-page {
    position: relative;
    margin-bottom: 2rem;
    padding: 1.25rem 1rem 1.4rem;
    border-radius: var(--radius-lg);
    background-color: #f3ecd9;
    background-image: radial-gradient(rgba(120, 100, 70, 0.16) 1px, transparent 1.4px);
    background-size: 18px 18px;
    border: 1px solid #e4d9be;
    box-shadow: var(--shadow-sm), inset 0 0 50px rgba(150, 130, 90, 0.08);
  }
  :global(:root[data-theme='dark']) .cal-page,
  :global(:root:not([data-theme='light'])) .cal-page { background-color: #ece3cb; }

  /* washi tape holding the page up */
  .tape {
    position: absolute;
    top: -10px;
    width: 78px;
    height: 24px;
    background: repeating-linear-gradient(45deg, rgba(136, 192, 208, 0.45) 0 7px, rgba(136, 192, 208, 0.28) 7px 14px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  }
  .tape-l { left: 26px; transform: rotate(-5deg); }
  .tape-r { right: 26px; transform: rotate(4deg); background: repeating-linear-gradient(45deg, rgba(235, 203, 139, 0.5) 0 7px, rgba(235, 203, 139, 0.3) 7px 14px); }

  .cal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  .cal-month {
    font-family: 'Fredoka', Helvetica, sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    text-transform: capitalize;
    min-width: 180px;
    text-align: center;
    color: #5a4a2c;
  }
  .cal-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: #8a7747;
    border-radius: 8px;
    cursor: pointer;
    transition: all 120ms;
  }
  .cal-nav:hover { background: rgba(138, 119, 71, 0.14); color: #5a4a2c; }

  .tally {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.8rem;
  }
  .tally-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.32rem;
    padding: 0.18rem 0.6rem;
    font-size: 0.74rem;
    font-weight: 600;
    color: #5a4a2c;
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid color-mix(in srgb, var(--pc) 30%, transparent);
    border-radius: var(--radius-pill);
    text-transform: capitalize;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 120ms, background 120ms, border-color 120ms, transform 120ms;
  }
  .tally-chip:hover { opacity: 0.85; transform: translateY(-1px); }
  .tally-chip.active {
    opacity: 1;
    background: color-mix(in srgb, var(--pc) 16%, rgba(255, 255, 255, 0.6));
    border-color: color-mix(in srgb, var(--pc) 55%, transparent);
  }
  .tally-chip .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pc); }
  .tally-chip strong { font-family: 'Fredoka', Helvetica, sans-serif; color: var(--pc); }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }
  .cal-weekday {
    text-align: center;
    font-size: 0.66rem;
    font-weight: 700;
    color: #9a865a;
    padding: 0.2rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .cal-day {
    position: relative;
    min-height: 78px;
    padding: 0.3rem;
    border-radius: 8px;
    border: 1px dashed transparent;
  }
  .cal-day.weekend { background: rgba(150, 130, 90, 0.07); }
  .cal-day.outside { opacity: 0.3; }
  .cal-day.today { border-color: var(--nord10); background: rgba(94, 129, 172, 0.1); }
  .cal-day.today .cal-day-num {
    background: var(--nord10);
    color: #fff;
    border-radius: 50%;
    width: 19px;
    height: 19px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .cal-day-num {
    font-size: 0.7rem;
    font-weight: 700;
    color: #8a7747;
    line-height: 1;
    display: block;
    margin-bottom: 0.25rem;
  }

  .stuck {
    display: flex;
    flex-wrap: wrap;
    gap: 3px 2px;
    align-items: center;
  }
  /* a cat sticker "stuck" on the date — die-cut white edge + hand tilt */
  .cat {
    position: relative;
    transform: rotate(var(--tilt));
    transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: default;
  }
  .cat img {
    display: block;
    width: 27px;
    height: 27px;
    object-fit: contain;
    filter:
      drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff)
      drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff)
      drop-shadow(0 2px 2px rgba(0, 0, 0, 0.22));
  }
  .cat:hover { transform: rotate(0deg) scale(1.9); z-index: 10; }
  .who-dot {
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--pc);
    border: 1.5px solid #f3ecd9;
  }
  .more {
    font-size: 0.6rem;
    font-weight: 700;
    color: #9a865a;
    align-self: center;
    padding-left: 1px;
  }

  @media (max-width: 500px) {
    .cal-day { min-height: 58px; padding: 0.2rem; }
    .cat img { width: 21px; height: 21px; }
    .cal-month { font-size: 1.25rem; min-width: 140px; }
    .tape { display: none; }
  }
</style>
