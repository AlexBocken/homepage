import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { questionFor } from '$lib/js/caseMath/skills';
import { showAnswer } from '$lib/js/caseMath/display';
import Drill from '$lib/components/caseMath/Drill.svelte';

const plan = [
	{ skill: 'squares', level: 2, seed: 11 },
	{ skill: 'margin', level: 3, seed: 12 }
];

describe('Drill (daily)', () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchMock = vi.fn(async () => new Response(JSON.stringify({ levelChanges: { squares: [2, 3] } }), { status: 201 }));
		vi.stubGlobal('fetch', fetchMock);
		Object.defineProperty(navigator, 'sendBeacon', { value: vi.fn(() => true), configurable: true });
	});
	afterEach(() => vi.unstubAllGlobals());

	it('grades, teaches on a miss, and saves the set', async () => {
		render(Drill, { mode: 'daily', plan });
		const q1 = questionFor('squares', 2, 11);
		const q2 = questionFor('margin', 3, 12);

		expect(screen.getByText(q1.prompt)).toBeInTheDocument();
		const input = screen.getByLabelText('Your answer') as HTMLInputElement;

		await fireEvent.input(input, { target: { value: String(q1.answer) } });
		await fireEvent.submit(input.closest('form')!);
		expect(screen.getByText('Right')).toBeInTheDocument();

		// A right answer moves on by itself.
		await waitFor(() => expect(screen.getByText(q2.prompt)).toBeInTheDocument(), { timeout: 2000 });

		await fireEvent.input(input, { target: { value: '1' } });
		await fireEvent.submit(input.closest('form')!);
		expect(screen.getByText(showAnswer(q2.answer, q2.unit))).toBeInTheDocument();
		expect(screen.getByText(q2.steps[0])).toBeInTheDocument();
		expect(screen.getByText(/you said 1/)).toBeInTheDocument();

		await fireEvent.click(screen.getByRole('button', { name: /Next/ }));
		expect(screen.getByText('Daily set done')).toBeInTheDocument();
		expect(screen.getByText('1/2')).toBeInTheDocument();

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/api/case-math/sessions');
		const body = JSON.parse(init.body as string);
		expect(body.mode).toBe('daily');
		expect(body.attempts.map((a: { seed: number; given: string }) => [a.seed, a.given])).toEqual([
			[11, String(q1.answer)],
			[12, '1']
		]);
		await waitFor(() => expect(screen.getByText(/level 2 → 3/)).toBeInTheDocument());
		expect(navigator.sendBeacon).not.toHaveBeenCalled();
	});

	it('Enter in the answer box during feedback advances once, without recording a skip', async () => {
		render(Drill, { mode: 'daily', plan });
		const input = screen.getByLabelText('Your answer') as HTMLInputElement;
		await fireEvent.submit(input.closest('form')!); // empty = show solution
		await fireEvent.keyDown(input, { key: 'Enter' });
		await fireEvent.submit(input.closest('form')!);
		expect(screen.getByText(questionFor('margin', 3, 12).prompt)).toBeInTheDocument();
		expect(screen.getByText('2 / 2')).toBeInTheDocument();
	});
});
