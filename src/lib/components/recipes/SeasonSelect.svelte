<script lang="ts">
	import { formatRangePreview } from '$lib/js/seasonRange';
	import type { SeasonAnchorKey, SeasonEndpoint, SeasonRange } from '$types/types';

	let { ranges = $bindable<SeasonRange[]>([]) }: { ranges?: SeasonRange[] } = $props();

	const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

	const ANCHOR_LABELS: Record<SeasonAnchorKey, string> = {
		easter: 'Ostersonntag',
		'ash-wednesday': 'Aschermittwoch',
		'palm-sunday': 'Palmsonntag',
		pentecost: 'Pfingstsonntag',
		'advent-i': '1. Adventssonntag'
	};
	const ANCHOR_KEYS: SeasonAnchorKey[] = ['easter', 'ash-wednesday', 'palm-sunday', 'pentecost', 'advent-i'];

	function commit(next: SeasonRange[]) {
		ranges = next;
	}

	function fixed(m: number, d: number): SeasonEndpoint {
		return { kind: 'fixed', m, d };
	}
	function liturgical(anchor: SeasonAnchorKey, offsetDays = 0): SeasonEndpoint {
		return { kind: 'liturgical', anchor, offsetDays };
	}

	function withEndpoint(i: number, which: 'start' | 'end', ep: SeasonEndpoint): SeasonRange[] {
		return ranges.map((r, idx) => (idx === i ? { ...r, [which]: ep } : r));
	}

	function addMonthRange(m: number) {
		const last = new Date(2001, m, 0).getDate();
		commit([...ranges, { start: fixed(m, 1), end: fixed(m, last) }]);
	}

	function addPreset(label: string) {
		const presets: Record<string, SeasonRange> = {
			lent: { start: liturgical('ash-wednesday', 0), end: liturgical('easter', -1) },
			'holy-week': { start: liturgical('palm-sunday', 0), end: liturgical('easter', -1) },
			'easter-octave': { start: liturgical('easter', 0), end: liturgical('easter', 7) },
			eastertide: { start: liturgical('easter', 0), end: liturgical('pentecost', 0) },
			advent: { start: liturgical('advent-i', 0), end: fixed(12, 24) },
			'christmas-octave': { start: fixed(12, 25), end: fixed(1, 1) }
		};
		const preset = presets[label];
		if (preset) {
			commit([...ranges, { start: { ...preset.start }, end: { ...preset.end } }]);
		}
	}

	function removeRange(i: number) {
		commit(ranges.filter((_, idx) => idx !== i));
	}

	function setEndpointKind(i: number, which: 'start' | 'end', kind: 'fixed' | 'liturgical') {
		const ep = ranges[i][which];
		if (kind === ep.kind) return;
		const next: SeasonEndpoint = kind === 'fixed' ? fixed(1, 1) : liturgical('easter', 0);
		commit(withEndpoint(i, which, next));
	}

	function updateFixed(i: number, which: 'start' | 'end', field: 'm' | 'd', value: number) {
		const ep = ranges[i][which];
		if (ep.kind !== 'fixed') return;
		if (Number.isNaN(value)) return;
		commit(withEndpoint(i, which, { ...ep, [field]: value }));
	}

	function updateLiturgical(i: number, which: 'start' | 'end', field: 'anchor' | 'offsetDays', value: SeasonAnchorKey | number) {
		const ep = ranges[i][which];
		if (ep.kind !== 'liturgical') return;
		if (field === 'offsetDays' && Number.isNaN(value as number)) return;
		commit(withEndpoint(i, which, { ...ep, [field]: value }));
	}

	const currentYear = new Date().getFullYear();

	let selectedMonth = $state<number>(1);
	let selectedPreset = $state<string>('');
</script>

<style>
.season-editor {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	max-width: 720px;
	margin: 0 auto;
}
.range-row {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	align-items: center;
	padding: 0.6rem 0.75rem;
	background: var(--color-bg-tertiary);
	border-radius: var(--radius-md);
	border: 1px solid var(--color-border);
}
.endpoint {
	display: flex;
	gap: 0.4rem;
	align-items: center;
	flex-wrap: wrap;
}
.kind-toggle {
	display: inline-flex;
	border-radius: var(--radius-pill);
	overflow: hidden;
	background: var(--color-bg-elevated);
}
.kind-toggle button {
	all: unset;
	padding: 0.2rem 0.7rem;
	font-size: 0.85rem;
	cursor: pointer;
	color: var(--color-text-secondary);
}
.kind-toggle button.active {
	background: var(--color-primary);
	color: var(--color-text-on-primary);
}
.endpoint select,
.endpoint input[type="number"] {
	background: var(--color-bg-primary);
	color: var(--color-text-primary);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-sm);
	padding: 0.2rem 0.4rem;
	font-size: 0.9rem;
}
.endpoint input[type="number"] {
	width: 4.5em;
}
.dash {
	color: var(--color-text-tertiary);
	padding: 0 0.25rem;
}
.preview {
	font-size: 0.85rem;
	color: var(--color-text-tertiary);
	flex-basis: 100%;
}
.remove-btn {
	all: unset;
	margin-left: auto;
	cursor: pointer;
	color: var(--color-text-secondary);
	font-size: 1.1rem;
	padding: 0 0.4rem;
	border-radius: var(--radius-sm);
}
.remove-btn:hover {
	background: var(--red);
	color: white;
}
.add-bar {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	align-items: center;
	padding: 0.6rem 0.75rem;
	background: var(--color-surface);
	border-radius: var(--radius-md);
}
.add-bar select,
.add-bar button {
	background: var(--color-bg-tertiary);
	color: var(--color-text-primary);
	border: 1px solid var(--color-border);
	border-radius: var(--radius-sm);
	padding: 0.3rem 0.6rem;
	font-size: 0.9rem;
	cursor: pointer;
}
.add-bar button {
	background: var(--color-primary);
	color: var(--color-text-on-primary);
	border-color: var(--color-primary);
}
.add-bar button:hover {
	background: var(--color-primary-hover);
}
.empty {
	color: var(--color-text-tertiary);
	font-style: italic;
	font-size: 0.9rem;
	text-align: center;
	padding: 0.5rem;
}
</style>

<div class="season-editor">
	{#if ranges.length === 0}
		<div class="empty">Keine Saison-Bereiche – immer verfügbar.</div>
	{/if}

	{#each ranges as range, i (i)}
		<div class="range-row">
			{#each ['start', 'end'] as const as which, wi (which)}
				{#if wi > 0}
					<span class="dash">–</span>
				{/if}
				<div class="endpoint">
					<div class="kind-toggle">
						<button type="button" class:active={range[which].kind === 'fixed'} onclick={() => setEndpointKind(i, which, 'fixed')}>Datum</button>
						<button type="button" class:active={range[which].kind === 'liturgical'} onclick={() => setEndpointKind(i, which, 'liturgical')}>Liturgisch</button>
					</div>
					{#if range[which].kind === 'fixed'}
						<select value={range[which].m} onchange={(e) => updateFixed(i, which, 'm', parseInt((e.currentTarget as HTMLSelectElement).value))}>
							{#each MONTHS_DE as name, mi (mi)}
								<option value={mi + 1}>{name}</option>
							{/each}
						</select>
						<input type="number" min="1" max="31" value={range[which].d} oninput={(e) => updateFixed(i, which, 'd', parseInt((e.currentTarget as HTMLInputElement).value))} />
					{:else}
						<select value={range[which].anchor} onchange={(e) => updateLiturgical(i, which, 'anchor', (e.currentTarget as HTMLSelectElement).value as SeasonAnchorKey)}>
							{#each ANCHOR_KEYS as a (a)}
								<option value={a}>{ANCHOR_LABELS[a]}</option>
							{/each}
						</select>
						<input type="number" value={range[which].offsetDays} oninput={(e) => updateLiturgical(i, which, 'offsetDays', parseInt((e.currentTarget as HTMLInputElement).value || '0'))} title="Tage Versatz" />
						<span class="dash">Tage</span>
					{/if}
				</div>
			{/each}
			<button type="button" class="remove-btn" onclick={() => removeRange(i)} aria-label="Bereich entfernen">×</button>
			<div class="preview">{currentYear}: {formatRangePreview(range, currentYear, 'de')}</div>
		</div>
	{/each}

	<div class="add-bar">
		<span>Hinzufügen:</span>
		<select bind:value={selectedMonth}>
			{#each MONTHS_DE as name, mi (mi)}
				<option value={mi + 1}>{name}</option>
			{/each}
		</select>
		<button type="button" onclick={() => addMonthRange(selectedMonth)}>Monat</button>
		<select bind:value={selectedPreset}>
			<option value="">Liturgisch…</option>
			<option value="lent">Fastenzeit</option>
			<option value="holy-week">Karwoche</option>
			<option value="easter-octave">Osteroktav</option>
			<option value="eastertide">Osterzeit</option>
			<option value="advent">Advent</option>
			<option value="christmas-octave">Weihnachtsoktav</option>
		</select>
		<button type="button" disabled={!selectedPreset} onclick={() => { if (selectedPreset) { addPreset(selectedPreset); selectedPreset = ''; } }}>Vorlage</button>
	</div>
</div>
