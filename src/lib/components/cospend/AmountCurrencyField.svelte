<script>
  /**
   * Amount input + currency select, with a live CHF conversion preview when a
   * foreign currency is picked. The rate itself comes from `fx`
   * (`createExchangeRate()` in `$lib/js/exchangeRate.svelte`), which the page
   * owns so it can also use the converted amount.
   *
   * The `<label for={id}>` stays in the page.
   */

  /**
   * @typedef {Object} Props
   * @property {string | number | null | undefined} amount
   * @property {string | null | undefined} currency
   * @property {import('$lib/js/exchangeRate.svelte').ExchangeRate} fx
   * @property {string} [id] id of the amount input
   * @property {string} [name] name of the amount input
   * @property {string} [currencyName] name of the currency select
   * @property {string} [placeholder]
   * @property {boolean} [showConversion] defaults to "currency is not CHF"
   * @property {string} [hint] shown above the conversion preview
   * @property {string} [fetchingText] shown while the rate loads
   * @property {string} [rateLabel] e.g. "Rate" in "(Rate: 1 EUR = 0.9500 CHF)"
   * @property {import('svelte').Snippet} [stored] extra line after the rate
   */

  /** @type {Props} */
  let {
    amount = $bindable(),
    currency = $bindable(),
    fx,
    id = 'amount',
    name,
    currencyName,
    placeholder,
    showConversion,
    hint,
    fetchingText,
    rateLabel,
    stored
  } = $props();

  const conversionVisible = $derived(showConversion ?? currency !== 'CHF');
</script>

<div class="amount-currency">
  <input
    type="number"
    {id}
    {name}
    bind:value={amount}
    required
    min="0"
    step="0.01"
    {placeholder}
  />
  <select id="currency" name={currencyName} bind:value={currency} disabled={fx.loadingCurrencies}>
    {#each fx.supportedCurrencies as c (c)}
      <option value={c}>{c}</option>
    {/each}
  </select>
</div>
{#if conversionVisible}
  <div class="conversion-info">
    <small class="help-text">{hint}</small>

    {#if fx.loading}
      <div class="conversion-preview loading">
        <small>🔄 {fetchingText}</small>
      </div>
    {:else if fx.error}
      <div class="conversion-preview error">
        <small>⚠️ {fx.error}</small>
      </div>
    {:else if fx.convertedAmount !== null && fx.rate !== null && amount}
      <div class="conversion-preview success">
        <small>
          {currency} {parseFloat(String(amount)).toFixed(2)} ≈ CHF {fx.convertedAmount.toFixed(2)}
          <br>
          ({rateLabel}: 1 {currency} = {fx.rate.toFixed(4)} CHF)
          {#if stored}
            <br>
            {@render stored()}
          {/if}
        </small>
      </div>
    {/if}
  </div>
{/if}

<style>
  .amount-currency {
    display: flex;
    gap: 0.5rem;
  }

  input, select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    font-size: 1rem;
    box-sizing: border-box;
    background-color: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  input:focus, select:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 2px rgba(94, 129, 172, 0.2);
  }

  input {
    flex: 2;
  }

  select {
    flex: 1;
    min-width: 80px;
    cursor: pointer;
  }

  .help-text {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  /* Currency conversion preview */
  .conversion-info {
    margin-top: 0.5rem;
  }

  .conversion-preview {
    margin-top: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid transparent;
  }

  .conversion-preview.loading {
    background-color: var(--color-bg-tertiary);
    border-color: var(--blue);
    color: var(--blue);
  }

  .conversion-preview.error {
    background-color: var(--color-bg-secondary);
    border-color: var(--red);
    color: var(--red);
  }

  .conversion-preview.success {
    background-color: var(--color-bg-tertiary);
    border-color: var(--green);
    color: var(--color-text-primary);
  }

  .conversion-preview small {
    font-size: 0.85rem;
    font-weight: 500;
  }

  @media (max-width: 600px) {
    .amount-currency {
      flex-direction: column;
    }

    input,
    select {
      flex: none;
    }
  }
</style>
