import YahooFinance from "yahoo-finance2";

// Create yahoo-finance2 instance for market status checks
const yahooFinanceInstance = new YahooFinance();

export interface MarketStatus {
  isOpen: boolean;
  state: string;
  reason?: string;
}

/**
 * Checks if the US stock market (NYSE/NASDAQ) is currently open.
 * Uses Yahoo Finance marketState from SPY ETF.
 *
 * @returns MarketStatus with isOpen boolean and current state
 */
export const getMarketStatus = async (): Promise<MarketStatus> => {
  try {
    const quote = await yahooFinanceInstance.quote("SPY");
    const state = quote.marketState || "UNKNOWN";

    return {
      isOpen: state === "REGULAR",
      state,
      reason:
        state === "PRE"
          ? "Pre-market (before 9:30 ET)"
          : state === "POST"
            ? "After-hours (after 16:00 ET)"
            : state === "CLOSED"
              ? "Market closed (weekend/holiday)"
              : undefined,
    };
  } catch (error) {
    // Fallback: assume market is open to not block trading
    console.error("Failed to check market status:", error);
    return { isOpen: true, state: "UNKNOWN", reason: "Failed to fetch status" };
  }
};

/**
 * Simple check if market is open.
 *
 * @returns true if market is in REGULAR trading hours
 */
export const isMarketOpen = async (): Promise<boolean> => {
  const status = await getMarketStatus();
  return status.isOpen;
};

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
  yahooFinance: InstanceType<typeof import("yahoo-finance2").default>,
  log: (msg: string) => void,
): Promise<number> => {
  if (fromCurrency === toCurrency) return amount;

  try {
    const exchangeSymbol = `${fromCurrency}${toCurrency}=X`;
    const quote = await yahooFinance.quote(exchangeSymbol);
    const rate = quote.regularMarketPrice;

    if (rate && typeof rate === "number" && rate > 0) {
      log(`💱 Exchange rate ${fromCurrency}/${toCurrency}: ${rate}`);
      return Math.round(amount * rate * 100) / 100;
    }

    throw new Error(`Invalid exchange rate for ${fromCurrency}/${toCurrency}`);
  } catch (error) {
    log(
      `⚠️ Currency conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
};
