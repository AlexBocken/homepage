/**
 * Supported-currency list and a debounced live exchange-rate lookup for the
 * cospend payment forms (add, edit, recurring edit).
 *
 * `inputs` is read reactively: whenever currency, date or amount change (and
 * the currency is not CHF), the rate for that date is fetched 300 ms later, so
 * typing an amount does not fire a request per keystroke. The fetch reads the
 * inputs again when it fires, so it always uses the latest values.
 */

export type ExchangeRateInputs = {
	currency: string | null | undefined;
	/** YYYY-MM-DD, or anything `new Date()` accepts (normalised to YYYY-MM-DD). */
	date: string | Date | null | undefined;
	amount: string | number | null | undefined;
};

const DEBOUNCE_MS = 300;

function toDateParam(date: string | Date): string {
	if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
	return new Date(date).toISOString().split('T')[0];
}

export function createExchangeRate(inputs: () => ExchangeRateInputs) {
	let supportedCurrencies = $state(['CHF']);
	let loadingCurrencies = $state(false);
	let rate = $state<number | null>(null);
	let convertedAmount = $state<number | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let timeout: ReturnType<typeof setTimeout> | undefined;

	async function loadCurrencies() {
		try {
			loadingCurrencies = true;
			const response = await fetch('/api/cospend/exchange-rates?action=currencies');
			if (response.ok) {
				const result = await response.json();
				supportedCurrencies = ['CHF', ...result.currencies.filter((c: string) => c !== 'CHF')];
			}
		} catch (e) {
			console.warn('Could not load supported currencies:', e);
			// Keep default CHF
		} finally {
			loadingCurrencies = false;
		}
	}

	async function fetchRate() {
		const { currency, date, amount } = inputs();
		if (currency === 'CHF' || !currency || !date) {
			rate = null;
			convertedAmount = null;
			error = null;
			return;
		}

		if (!amount || parseFloat(String(amount)) <= 0) {
			convertedAmount = null;
			return;
		}

		try {
			loading = true;
			error = null;

			const response = await fetch(`/api/cospend/exchange-rates?from=${currency}&date=${toDateParam(date)}`);
			if (!response.ok) {
				throw new Error('Failed to fetch exchange rate');
			}

			const result = await response.json();
			rate = result.rate;
			convertedAmount = parseFloat(String(amount)) * result.rate;
		} catch (e) {
			console.warn('Could not fetch exchange rate:', e);
			error = e instanceof Error ? e.message : String(e);
			rate = null;
			convertedAmount = null;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		const { currency, date, amount } = inputs();
		if (currency && currency !== 'CHF' && date && amount) {
			clearTimeout(timeout);
			timeout = setTimeout(fetchRate, DEBOUNCE_MS);
		}
	});

	return {
		get supportedCurrencies() {
			return supportedCurrencies;
		},
		get loadingCurrencies() {
			return loadingCurrencies;
		},
		/** CHF per unit of the selected currency, once fetched. */
		get rate() {
			return rate;
		},
		/** The amount in CHF at `rate`, once fetched. */
		get convertedAmount() {
			return convertedAmount;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		loadCurrencies
	};
}

export type ExchangeRate = ReturnType<typeof createExchangeRate>;
