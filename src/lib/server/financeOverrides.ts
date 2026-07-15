/**
 * On-disk store for the /finances categorizer.
 *
 * The website lets the owner assign an Expenses/Income account to Uncategorized
 * beancount transactions; each choice is appended to a literal CSV file whose
 * schema matches the ledger repo's `overrides.csv`
 * (accounting/importers/overrides.py):
 *
 *     key,account,date,amount,payee,narration
 *
 * `key` is the stable content hash computed by finance-service (NOT here — our
 * JSON only carries rounded floats, so the key must come from the sidecar where
 * the raw Decimal lives). The ledger repo pulls this file via
 * accounting/tools/pull_overrides.sh and folds it into its own overrides.csv.
 *
 * Writes are serialised through a promise chain: the whole file is a
 * read-modify-write per assignment (like the local categorize tool), and this is
 * a single-user area, so a tiny in-process mutex is enough to avoid a lost
 * update when the modal and the queue race.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '$env/dynamic/private';

export const OVERRIDE_FIELDS = ['key', 'account', 'date', 'amount', 'payee', 'narration'] as const;
export type OverrideField = (typeof OVERRIDE_FIELDS)[number];
export type OverrideRow = Record<OverrideField, string>;

const CSV_PATH = env.FINANCE_OVERRIDES_CSV || './data/finance-overrides.csv';

/** Parse an RFC-4180 CSV (matching Python's csv default dialect: `"` quoting,
 *  doubled quotes to escape, CR/LF tolerant) into rows of objects. */
function parseCsv(text: string): OverrideRow[] {
	const records: string[][] = [];
	let field = '';
	let record: string[] = [];
	let inQuotes = false;
	let started = false; // saw any char in the current record (to keep empty last line out)

	const pushField = () => {
		record.push(field);
		field = '';
	};
	const pushRecord = () => {
		pushField();
		records.push(record);
		record = [];
		started = false;
	};

	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		started = true;
		if (inQuotes) {
			if (c === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i++;
				} else inQuotes = false;
			} else field += c;
		} else if (c === '"') {
			inQuotes = true;
		} else if (c === ',') {
			pushField();
		} else if (c === '\n') {
			pushRecord();
		} else if (c === '\r') {
			if (text[i + 1] === '\n') i++;
			pushRecord();
		} else {
			field += c;
		}
	}
	if (started || field) pushRecord();
	if (!records.length) return [];

	const header = records[0];
	return records.slice(1).map((cols) => {
		const row = {} as OverrideRow;
		for (const f of OVERRIDE_FIELDS) {
			const idx = header.indexOf(f);
			row[f] = idx >= 0 ? (cols[idx] ?? '') : '';
		}
		return row;
	});
}

/** Quote a field the way Python's csv.writer does with QUOTE_MINIMAL. */
function quote(value: string): string {
	return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(rows: OverrideRow[]): string {
	const lines = [OVERRIDE_FIELDS.join(',')];
	for (const r of rows) lines.push(OVERRIDE_FIELDS.map((f) => quote(r[f] ?? '')).join(','));
	return lines.join('\r\n') + '\r\n';
}

async function readRows(): Promise<OverrideRow[]> {
	try {
		return parseCsv(await fs.readFile(CSV_PATH, 'utf-8'));
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw err;
	}
}

// In-process write mutex: chain every mutation so read-modify-write is atomic.
let writeChain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
	const next = writeChain.then(fn, fn);
	// Keep the chain alive even if this op rejected, but don't swallow the error.
	writeChain = next.then(
		() => undefined,
		() => undefined
	);
	return next;
}

/** All stored overrides, sorted by date (oldest first). */
export async function listOverrides(): Promise<OverrideRow[]> {
	const rows = await readRows();
	rows.sort((a, b) => a.date.localeCompare(b.date));
	return rows;
}

/** The raw CSV text (what the ledger repo's pull script fetches). */
export async function overridesCsv(): Promise<string> {
	return toCsv(await listOverrides());
}

/**
 * Upsert one assignment by `key`. An empty `account` deletes the row (clearing a
 * previous choice), mirroring the local tool's save_assignment. Returns the
 * resulting row, or null when it was a deletion.
 */
export async function upsertOverride(input: OverrideRow): Promise<OverrideRow | null> {
	return withLock(async () => {
		const rows = await readRows();
		const byKey = new Map(rows.map((r) => [r.key, r]));
		let result: OverrideRow | null = null;
		if (input.account) {
			const row = {} as OverrideRow;
			for (const f of OVERRIDE_FIELDS) row[f] = input[f] ?? '';
			byKey.set(input.key, row);
			result = row;
		} else {
			byKey.delete(input.key);
		}
		const out = [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date));
		await fs.mkdir(path.dirname(CSV_PATH), { recursive: true });
		await fs.writeFile(CSV_PATH, toCsv(out), 'utf-8');
		return result;
	});
}
