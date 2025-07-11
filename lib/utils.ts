/**
 * Converts a monetary amount from one currency to another using real-time exchange rates from Yahoo Finance.
 *
 * @param amount - The amount of money to convert.
 * @param fromCurrency - The currency code to convert from (e.g., 'USD').
 * @param toCurrency - The currency code to convert to (e.g., 'EUR').
 * @param yahooFinance - The yahoo-finance2 instance to use for fetching quotes.
 * @param log - A logging function to use for messages.
 *
 * @returns A Promise that resolves to the converted amount, rounded to two decimal places.
 *
 * @throws If the exchange rate is invalid or cannot be fetched.
 */
export const convertCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  yahooFinance: any,
  log: (msg: string) => void
): Promise<number> => {
  if (fromCurrency === toCurrency) return amount;

  try {
    const exchangeSymbol = `${fromCurrency}${toCurrency}=X`;
    const quote = await yahooFinance.quote(exchangeSymbol);
    const rate = quote.regularMarketPrice;

    if (rate && typeof rate === 'number' && rate > 0) {
      log(`💱 Exchange rate ${fromCurrency}/${toCurrency}: ${rate}`);
      return Math.round(amount * rate * 100) / 100;
    }

    throw new Error(`Invalid exchange rate for ${fromCurrency}/${toCurrency}`);
  } catch (error) {
    log(`⚠️ Currency conversion failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
};
