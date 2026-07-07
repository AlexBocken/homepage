<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import PaceBar from '$lib/components/finance/PaceBar.svelte';
	import { challenges } from '$lib/stores/budgetChallenges.svelte';
	import { money } from '$lib/utils/finance';
	import type { Budget } from '$lib/utils/finance';
	import type { PageData } from './$types';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m as financesM, financesLang, MONTHS_SHORT } from '$lib/js/financesI18n';
	import PiggyBank from '@lucide/svelte/icons/piggy-bank';
	import LayoutList from '@lucide/svelte/icons/layout-list';
	import Trophy from '@lucide/svelte/icons/trophy';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Tags from '@lucide/svelte/icons/tags';

	let { data }: { data: PageData } = $props();
	const b: Budget = $derived(data.budget);
	const cur = $derived(b.current);
	const hasBudgets = $derived(cur.rows.length > 0);
	const lang = $derived(financesLang(languageStore.value));
	const t = $derived(financesM[lang]);

	let view = $state<'month' | 'history'>('month');

	const GREEN = '#A3BE8C';
	const RED = '#BF616A';
	const ORANGE = '#EBCB8B';
	const statusColor = (s: string) => (s === 'over' ? RED : s === 'watch' ? ORANGE : GREEN);

	const monthName = $derived(`${MONTHS_SHORT[lang][Number(cur.month.slice(5)) - 1]} ${cur.month.slice(0, 4)}`);
	const elapsedPct = $derived(Math.round(cur.elapsed_frac * 100));

	// One honest sentence on how the month is pacing.
	const overPct = $derived(
		cur.budgeted && cur.budgeted > 0 ? ((cur.projected ?? 0) / cur.budgeted - 1) * 100 : 0
	);
	const statusLine = $derived(
		overPct <= -5
			? `${t.bg_ontrack_line_a}${Math.abs(overPct).toFixed(0)}${t.bg_ontrack_line_b}`
			: overPct <= 2
				? t.bg_watch_line
				: `${t.bg_over_line_a}${overPct.toFixed(0)}${t.bg_over_line_b}`
	);

	const spendHref = (account: string) => {
		const q = new URLSearchParams({ account });
		const from = page.url.searchParams.get('from');
		const to = page.url.searchParams.get('to');
		if (from) q.set('from', from);
		if (to) q.set('to', to);
		return `${resolve('/finances/spending')}?${q}`;
	};

	// --- Challenges (this month's spend per pinned account) ---------------------
	let challengeSpent = $state<Record<string, number>>({});
	let newAccount = $state('');
	let newLabel = $state('');
	let newTarget = $state<number | null>(null);

	async function refreshChallengeSpend() {
		const first = `${cur.month}-01`;
		const out: Record<string, number> = {};
		await Promise.all(
			challenges.items.map(async (ch) => {
				const r = await fetch(`/api/finances/expenses?account=${encodeURIComponent(ch.account)}&from=${first}`);
				if (r.ok) out[ch.account] = (await r.json()).total ?? 0;
			})
		);
		challengeSpent = out;
	}
	$effect(() => {
		// re-run when the pinned set or the month changes
		challenges.items.map((c) => c.account).join();
		void cur.month;
		refreshChallengeSpend();
	});

	function addChallenge(e: Event) {
		e.preventDefault();
		if (!newAccount || newTarget == null) return;
		challenges.add({
			account: newAccount,
			label: newLabel || newAccount.split(':').pop() || newAccount,
			target: newTarget
		});
		newAccount = '';
		newLabel = '';
		newTarget = null;
	}
	function challengeStatus(spent: number, target: number): 'ok' | 'watch' | 'over' {
		const proj = cur.elapsed_frac > 0 ? spent / cur.elapsed_frac : spent;
		if (spent > target) return 'over';
		if (proj > target) return 'watch';
		return 'ok';
	}

	// --- History view -----------------------------------------------------------
	const chartKey = $derived(page.url.search);
	const monthlyChart = $derived({
		labels: b.monthly.map((m) => m.month),
		datasets: [
			{
				label: t.bg_spent,
				type: 'bar',
				data: b.monthly.map((m) => m.actual),
				backgroundColor: b.monthly.map((m) => ((m.actual ?? 0) > (m.budgeted ?? 0) ? RED : GREEN)) as unknown as string,
				borderRadius: 4,
				order: 2
			},
			{
				label: 'Budget',
				type: 'line',
				data: b.monthly.map((m) => m.budgeted),
				borderColor: '#5E81AC',
				backgroundColor: 'transparent',
				borderWidth: 2,
				borderDash: [5, 4],
				pointRadius: 0,
				tension: 0,
				order: 1
			}
		]
	});
	const barColor = (pct: number | null) =>
		pct == null ? 'var(--color-border)' : pct > 100 ? RED : pct > 90 ? ORANGE : GREEN;
</script>

<svelte:head><title>{t.title_budget}</title></svelte:head>

{#if !hasBudgets}
	<section class="card empty">
		<h2>{t.bg_no_budgets}</h2>
		<p>
			{t.bg_no_budgets_p1_a}<code>custom "budget"</code>{t.bg_no_budgets_p1_b}
		</p>
		<pre>2025-07-01 custom "budget" Expenses:Food      "monthly" 500 CHF
2025-07-01 custom "budget" Expenses:Shopping  "monthly" 400 CHF
2025-07-01 custom "budget" Expenses:Transport "monthly" 300 CHF</pre>
		<p class="muted">
			{t.bg_no_budgets_p2_a}<code>monthly</code>, <code>weekly</code>, <code>quarterly</code>,
			<code>yearly</code>{t.bg_no_budgets_p2_b}<code>make check</code>{t.bg_no_budgets_p2_c}
		</p>
	</section>
{:else}
	<nav class="tabs" aria-label={t.view_aria}>
		<button class:active={view === 'month'} onclick={() => (view = 'month')}>{t.bg_this_month}</button>
		<button class:active={view === 'history'} onclick={() => (view = 'history')}>{t.bg_history}</button>
	</nav>

	{#if view === 'month'}
		<!-- Hero + streak -->
		<section class="hero">
			<div class="hero-main">
				<span class="label">{t.bg_remaining} · {monthName}</span>
				<span class="figure fin-num" style="color: {(cur.remaining ?? 0) < 0 ? RED : 'var(--color-text-primary)'}">{money(cur.remaining)}</span>
				<span class="sub">
					{t.bg_day} <span class="fin-num">{cur.day}</span>/<span class="fin-num">{cur.days_in_month}</span>
					· {elapsedPct}% {t.bg_elapsed} · {t.bg_projected}
					<b class="fin-num" style="color: {statusColor(overPct > 2 ? 'over' : overPct > -5 ? 'watch' : 'ok')}">{money(cur.projected)}</b>
					/ <span class="fin-num">{money(cur.budgeted)}</span>
				</span>
				<p class="status">{statusLine}</p>
			</div>
			<div class="streak" class:lit={b.streak.count > 0}>
				<div class="flame">🔥 <span class="fin-num">{b.streak.count}</span></div>
				<span class="streak-label">{b.streak.count === 1 ? t.month_sg : t.month_pl} {t.bg_in_budget}</span>
				<div class="pips">
					{#each b.streak.months as m (m.month)}
						<span
							class="pip"
							class:under={m.has_budget && m.under}
							class:over={m.has_budget && !m.under}
							title="{m.month}: {m.has_budget ? `${money(m.actual)} / ${money(m.budgeted)}` : t.bg_no_budget_short}"
						></span>
					{/each}
				</div>
			</div>
		</section>

		<!-- Savings goal (a floor, opposite of expense budgets) -->
		{#if data.savingsTarget}
			{@const st = data.savingsTarget}
			<section class="card">
				<div class="sv-head">
					<div class="sv-main">
						<h2><PiggyBank size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.bg_savings_goal} <span class="hint">{money(st.monthly)} {t.per_month}</span></h2>
						<div class="sv-fig">
							<span class="fin-num" style="color: {st.current.hit ? GREEN : 'var(--color-text-primary)'}">{money(st.current.saved)}</span>
							<span class="of fin-num"> / {money(st.monthly)}</span>
							{#if st.current.hit}<span class="win">{t.bg_reached}</span>{/if}
						</div>
						<div class="sv-bar">
							<PaceBar spent={Math.max(0, st.current.saved ?? 0)} budget={st.monthly} status={st.current.hit ? 'ok' : 'watch'} />
						</div>
						<p class="muted">
							{#if st.current.hit}{t.bg_reached_month}
							{:else if (st.current.saved ?? 0) < 0}{t.bg_salary_pending}
							{:else}{t.bg_remaining_to_goal_a}{money(st.current.remaining)}{t.bg_remaining_to_goal_b}{/if}
						</p>
					</div>
					<div class="streak" class:lit={st.streak > 0}>
						<div class="flame">🔥 <span class="fin-num">{st.streak}</span></div>
						<span class="streak-label">{t.bg_months_with_goal}</span>
						<div class="pips">
							{#each st.months as m (m.month)}
								<span class="pip" class:under={m.target != null && m.hit} class:over={m.target != null && !m.hit}
									title="{m.month}: {money(m.saved)}{m.target != null ? ` / ${money(m.target)}` : ''}"></span>
							{/each}
						</div>
					</div>
				</div>
			</section>
		{:else}
			<p class="sv-hint muted">
				{t.bg_set_savings_a}<code>YYYY-MM-DD custom "savings-target" "monthly" 2000 CHF</code>{t.bg_set_savings_b}
			</p>
		{/if}

		<!-- Pace board -->
		<section class="card">
			<h2><LayoutList size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.bg_categories} <span class="hint">{t.bg_cat_hint}</span></h2>
			<ul class="rows">
				{#each cur.rows as r (r.account)}
					<li>
						<a class="row" href={spendHref(r.account)} title={t.view_spending}>
							<span class="rname">{r.name}</span>
							<span class="rbar">
								<PaceBar spent={r.spent} budget={r.budget} pace={cur.elapsed_frac} status={r.status} />
							</span>
							<span class="rnums fin-num">{money(r.spent)}<span class="of"> / {money(r.budget)}</span></span>
							<span class="rproj fin-num" style="color: {statusColor(r.status)}" title={t.bg_proj_tip}>→ {money(r.projected)}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>

		<!-- Challenges -->
		<section class="card">
			<h2><Trophy size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.bg_challenges} <span class="hint">{t.bg_challenge_hint}</span></h2>
			{#if challenges.items.length}
				<ul class="rows">
					{#each challenges.items as ch, i (ch.account + ch.label)}
						{@const spent = challengeSpent[ch.account] ?? 0}
						{@const st = challengeStatus(spent, ch.target)}
						<li>
							<div class="row challenge">
								<span class="rname" title={ch.account}>
									{ch.label}
									{#if st === 'ok'}<span class="win">✓</span>{/if}
								</span>
								<span class="rbar">
									<PaceBar {spent} budget={ch.target} pace={cur.elapsed_frac} status={st} />
								</span>
								<span class="rnums fin-num">{money(spent)}<span class="of"> / {money(ch.target)}</span></span>
								<button class="del" onclick={() => challenges.remove(i)} aria-label={t.bg_remove_challenge} title={t.remove}>×</button>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="muted">{t.bg_no_challenge}</p>
			{/if}

			<form class="add" onsubmit={addChallenge}>
				<input list="exp-accounts" placeholder={t.bg_ph_account} bind:value={newAccount} required />
				<datalist id="exp-accounts">
					{#each data.expenseAccounts as a (a)}<option value={a}></option>{/each}
				</datalist>
				<input class="lbl" placeholder={t.bg_ph_name} bind:value={newLabel} />
				<input class="tgt fin-num" type="number" min="1" step="1" placeholder={t.bg_ph_limit} bind:value={newTarget} required />
				<button type="submit" class="addbtn">{t.add}</button>
			</form>
		</section>
	{:else}
		<!-- History -->
		<section class="card">
			<h2><ChartColumn size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.bg_monthly} <span class="hint">{t.bg_monthly_hint}</span></h2>
			{#key chartKey}
				<FitnessChart type="bar" height="260px" data={monthlyChart} tooltipFormatter={(v: number) => money(v, true)} />
			{/key}
		</section>

		<section class="card">
			<h2><Tags size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.sp_by_category} <span class="hint">{b.from} – {b.to}</span></h2>
			<ul class="rows">
				{#each b.rows as r (r.account)}
					<li>
						<a class="row" href={spendHref(r.account)}>
							<span class="rname">{r.name}</span>
							<span class="rbar">
								<PaceBar spent={r.actual} budget={r.budgeted} status={(r.pct ?? 0) > 100 ? 'over' : (r.pct ?? 0) > 90 ? 'watch' : 'ok'} />
							</span>
							<span class="rnums fin-num">{money(r.actual)}<span class="of"> / {money(r.budgeted)}</span></span>
							<span class="rproj fin-num" style="color: {barColor(r.pct)}">{r.pct == null ? '–' : `${r.pct.toFixed(0)}%`}</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}

<style>
	.fin-num {
		font-family: var(--font-fin-num);
		font-variant-numeric: tabular-nums;
	}

	.tabs {
		display: inline-flex;
		gap: 0.2rem;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		padding: 0.2rem;
		margin-bottom: 1.5rem;
	}
	.tabs button {
		border: none;
		background: none;
		cursor: pointer;
		padding: 0.35rem 0.9rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}
	.tabs button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}

	.hero {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 1.5rem 2rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.5rem;
		box-shadow: var(--shadow-sm);
		margin-bottom: 2rem;
	}
	.hero-main {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 15rem;
	}
	.label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.figure {
		font-size: var(--text-3xl);
		font-weight: 600;
		line-height: 1.1;
	}
	.sub {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.status {
		margin: 0.5rem 0 0;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.streak {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		justify-content: center;
		gap: 0.3rem;
		min-width: 12rem;
	}
	.flame {
		font-size: var(--text-2xl);
		font-weight: 700;
		filter: grayscale(1) opacity(0.5);
	}
	.streak.lit .flame {
		filter: none;
	}
	.streak-label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.pips {
		display: flex;
		gap: 3px;
		margin-top: 0.2rem;
	}
	.pip {
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 3px;
		background: var(--color-bg-elevated);
	}
	.pip.under {
		background: var(--green);
	}
	.pip.over {
		background: var(--red);
		opacity: 0.75;
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.25rem 1.5rem;
		box-shadow: var(--shadow-sm);
		margin-bottom: 2rem;
	}
	h2 {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0 0 1rem;
		font-size: var(--text-lg);
		color: var(--color-text-primary);
	}
	.hint {
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--color-text-tertiary);
	}
	.muted {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}

	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.row {
		display: grid;
		grid-template-columns: 8rem 1fr auto auto;
		align-items: center;
		gap: 0.9rem;
		text-decoration: none;
		padding: 0.3rem 0.4rem;
		margin: -0.3rem -0.4rem;
		border-radius: var(--radius-sm);
		transition: background var(--transition-fast);
	}
	a.row:hover {
		background: var(--color-bg-elevated);
	}
	.rname {
		font-size: var(--text-sm);
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.win {
		color: var(--green);
		font-weight: 700;
		margin-left: 0.25rem;
	}
	.rnums {
		font-size: var(--text-sm);
		color: var(--color-text-primary);
		white-space: nowrap;
		text-align: right;
	}
	.rnums .of {
		color: var(--color-text-tertiary);
	}
	.rproj {
		font-size: var(--text-sm);
		font-weight: 600;
		white-space: nowrap;
		text-align: right;
		min-width: 5rem;
	}
	.del {
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		font-size: var(--text-lg);
		line-height: 1;
		padding: 0 0.25rem;
	}
	.del:hover {
		color: var(--red);
	}

	.add {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}
	.add input {
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.4rem 0.6rem;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}
	.add input:first-of-type {
		flex: 1 1 16rem;
	}
	.add .lbl {
		flex: 1 1 8rem;
	}
	.add .tgt {
		width: 6rem;
	}
	.addbtn {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-md);
		padding: 0.4rem 1rem;
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.sv-head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 1.5rem 2rem;
	}
	.sv-main {
		flex: 1 1 18rem;
	}
	.sv-main h2 {
		margin-bottom: 0.5rem;
	}
	.sv-fig {
		font-size: var(--text-2xl);
		font-weight: 600;
		margin-bottom: 0.6rem;
	}
	.sv-fig .of {
		font-size: var(--text-base);
		font-weight: 400;
		color: var(--color-text-tertiary);
	}
	.sv-fig .win {
		font-size: var(--text-base);
		color: var(--green);
		font-weight: 600;
		margin-left: 0.5rem;
	}
	.sv-bar {
		margin-bottom: 0.5rem;
	}
	.sv-hint {
		margin: -0.5rem 0 2rem;
	}
	.sv-hint code {
		background: var(--color-bg-tertiary);
		padding: 0.1rem 0.35rem;
		border-radius: var(--radius-sm);
		font-family: var(--font-fin-num);
	}

	.empty pre {
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
		padding: 1rem;
		overflow-x: auto;
		font-size: var(--text-sm);
		color: var(--color-text-primary);
	}
	.empty code {
		background: var(--color-bg-tertiary);
		padding: 0.1rem 0.35rem;
		border-radius: var(--radius-sm);
		font-size: 0.85em;
	}

	@media (max-width: 700px) {
		.row {
			grid-template-columns: 6rem 1fr auto;
		}
		.rproj {
			display: none;
		}
		.figure {
			font-size: var(--text-2xl);
		}
	}
</style>
