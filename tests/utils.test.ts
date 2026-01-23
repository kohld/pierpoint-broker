import { describe, it, expect, mock } from "bun:test";
import { convertCurrency, getMarketStatusWithDeps } from "../lib/utils";

/**
 * Tests the convertCurrency function.
 */
describe("convertCurrency", () => {
  const mockLog = mock(() => {});

  it("returns the same amount if fromCurrency equals toCurrency", async () => {
    const result = await convertCurrency(
      100,
      "USD",
      "USD",
      {} as InstanceType<typeof import("yahoo-finance2").default>,
      mockLog,
    );
    expect(result).toBe(100);
    expect(mockLog).not.toHaveBeenCalled();
  });

  it("converts amount using valid exchange rate", async () => {
    const quoteMock = mock(() => Promise.resolve({ regularMarketPrice: 0.85 }));
    const mockYahooFinance = {
      quote: quoteMock,
    } as unknown as InstanceType<typeof import("yahoo-finance2").default>;
    const result = await convertCurrency(
      200,
      "USD",
      "EUR",
      mockYahooFinance,
      mockLog,
    );
    expect(result).toBe(170);
    expect(quoteMock).toHaveBeenCalledWith("USDEUR=X");
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Exchange rate USD/EUR: 0.85"),
    );
  });

  it("throws if exchange rate is invalid (zero)", async () => {
    const mockYahooFinance = {
      quote: mock(() => Promise.resolve({ regularMarketPrice: 0 })),
    } as unknown as InstanceType<typeof import("yahoo-finance2").default>;
    await expect(
      convertCurrency(50, "USD", "EUR", mockYahooFinance, mockLog),
    ).rejects.toThrow("Invalid exchange rate for USD/EUR");
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Currency conversion failed"),
    );
  });

  it("throws if exchange rate is invalid (negative)", async () => {
    const mockYahooFinance = {
      quote: mock(() => Promise.resolve({ regularMarketPrice: -1 })),
    } as unknown as InstanceType<typeof import("yahoo-finance2").default>;
    await expect(
      convertCurrency(50, "USD", "EUR", mockYahooFinance, mockLog),
    ).rejects.toThrow("Invalid exchange rate for USD/EUR");
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Currency conversion failed"),
    );
  });

  it("throws and logs if yahooFinance.quote throws", async () => {
    const mockYahooFinance = {
      quote: mock(() => Promise.reject(new Error("API error"))),
    } as unknown as InstanceType<typeof import("yahoo-finance2").default>;
    await expect(
      convertCurrency(10, "USD", "EUR", mockYahooFinance, mockLog),
    ).rejects.toThrow("API error");
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Currency conversion failed: API error"),
    );
  });
});

/**
 * Tests the getMarketStatusWithDeps function.
 */
describe("getMarketStatusWithDeps", () => {
  it("returns isOpen true when market state is REGULAR", async () => {
    const mockQuoteFn = mock(() => Promise.resolve({ marketState: "REGULAR" }));
    const result = await getMarketStatusWithDeps({ quoteFn: mockQuoteFn });

    expect(result.isOpen).toBe(true);
    expect(result.state).toBe("REGULAR");
    expect(result.reason).toBeUndefined();
    expect(mockQuoteFn).toHaveBeenCalledWith("SPY");
  });

  it("returns isOpen false with reason for PRE market", async () => {
    const mockQuoteFn = mock(() => Promise.resolve({ marketState: "PRE" }));
    const result = await getMarketStatusWithDeps({ quoteFn: mockQuoteFn });

    expect(result.isOpen).toBe(false);
    expect(result.state).toBe("PRE");
    expect(result.reason).toBe("Pre-market (before 9:30 ET)");
  });

  it("returns isOpen false with reason for POST market", async () => {
    const mockQuoteFn = mock(() => Promise.resolve({ marketState: "POST" }));
    const result = await getMarketStatusWithDeps({ quoteFn: mockQuoteFn });

    expect(result.isOpen).toBe(false);
    expect(result.state).toBe("POST");
    expect(result.reason).toBe("After-hours (after 16:00 ET)");
  });

  it("returns isOpen false with reason for CLOSED market", async () => {
    const mockQuoteFn = mock(() => Promise.resolve({ marketState: "CLOSED" }));
    const result = await getMarketStatusWithDeps({ quoteFn: mockQuoteFn });

    expect(result.isOpen).toBe(false);
    expect(result.state).toBe("CLOSED");
    expect(result.reason).toBe("Market closed (weekend/holiday)");
  });

  it("returns UNKNOWN state when marketState is missing", async () => {
    const mockQuoteFn = mock(() => Promise.resolve({}));
    const result = await getMarketStatusWithDeps({ quoteFn: mockQuoteFn });

    expect(result.isOpen).toBe(false);
    expect(result.state).toBe("UNKNOWN");
  });

  it("returns isOpen true as fallback when API throws", async () => {
    const mockQuoteFn = mock(() => Promise.reject(new Error("API error")));
    const result = await getMarketStatusWithDeps({ quoteFn: mockQuoteFn });

    expect(result.isOpen).toBe(true);
    expect(result.state).toBe("UNKNOWN");
    expect(result.reason).toBe("Failed to fetch status");
  });
});
