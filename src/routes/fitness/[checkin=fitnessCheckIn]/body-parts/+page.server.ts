import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/fitness/measurements?limit=100');
	const list = res.ok ? await res.json() : { measurements: [] };
	return {
		measurements: list.measurements ?? []
	};
};

/** Every circumference the wizard can record, by the name the record stores it under. */
const PART_KEYS = [
	'neck', 'shoulders', 'chest', 'waist', 'hips',
	'leftBicep', 'rightBicep', 'leftForearm', 'rightForearm',
	'leftThigh', 'rightThigh', 'leftCalf', 'rightCalf'
];

function decimal(value: FormDataEntryValue | null): number | null {
	const raw = String(value ?? '').trim().replace(',', '.');
	if (!raw) return null;
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? n : null;
}

export const actions: Actions = {
	/**
	 * Record circumferences from a plain form post.
	 *
	 * The wizard walks one body part at a time, which is a thing script does; the form
	 * behind this action asks for all of them at once, which is the same measurements
	 * arriving through the same endpoint. A blank field is "not measured" and is left
	 * out entirely rather than stored as zero.
	 */
	save: async ({ request, fetch }) => {
		const form = await request.formData();
		const date = String(form.get('date') ?? '');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, { error: 'date' });

		const measurements: Record<string, number> = {};
		for (const key of PART_KEYS) {
			const value = decimal(form.get(key));
			if (value != null) measurements[key] = value;
		}
		if (Object.keys(measurements).length === 0) return fail(400, { error: 'empty' });

		const overwrite = form.get('overwrite') === '1';
		const res = await fetch(`/api/fitness/measurements${overwrite ? '?overwrite=1' : ''}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ date, measurements })
		});

		if (res.status === 409) {
			const { conflicts } = await res.json();
			return fail(409, { conflicts, date, measurements });
		}
		if (!res.ok) return fail(res.status, { error: 'save' });
		return { saved: true, date };
	}
};
