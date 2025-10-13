import { convertCurrency } from "../lib/utils";

/**
 * Tests the convertCurrency function.
 */
describe("convertCurrency", () => {
  const mockLog = jest.fn();

  it("returns the same amount if fromCurrency equals toCurrency", async () => {
    const result = await convertCurrency(
      100,
      "USD",
      "USD",
      {} as typeof import("yahoo-finance2").default,
      mockLog,
    );
    expect(result).toBe(100);
    expect(mockLog).not.toHaveBeenCalled();
  });

  it("converts amount using valid exchange rate", async () => {
    const mockYahooFinance = {
      quote: jest.fn().mockResolvedValue({ regularMarketPrice: 0.85 }),
    } as unknown as typeof import("yahoo-finance2").default;
    const result = await convertCurrency(
      200,
      "USD",
      "EUR",
      mockYahooFinance,
      mockLog,
    );
    expect(result).toBe(170);
    expect(mockYahooFinance.quote).toHaveBeenCalledWith("USDEUR=X");
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Exchange rate USD/EUR: 0.85"),
    );
  });

  it("throws if exchange rate is invalid (zero)", async () => {
    const mockYahooFinance = {
      quote: jest.fn().mockResolvedValue({ regularMarketPrice: 0 }),
    } as unknown as typeof import("yahoo-finance2").default;
    await expect(
      convertCurrency(50, "USD", "EUR", mockYahooFinance, mockLog),
    ).rejects.toThrow("Invalid exchange rate for USD/EUR");
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Currency conversion failed"),
    );
  });

  it("throws if exchange rate is invalid (negative)", async () => {
    const mockYahooFinance = {
      quote: jest.fn().mockResolvedValue({ regularMarketPrice: -1 }),
    } as unknown as typeof import("yahoo-finance2").default;
    await expect(
      convertCurrency(50, "USD", "EUR", mockYahooFinance, mockLog),
    ).rejects.toThrow("Invalid exchange rate for USD/EUR");
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Currency conversion failed"),
    );
  });

  it("throws and logs if yahooFinance.quote throws", async () => {
    const mockYahooFinance = {
      quote: jest.fn().mockRejectedValue(new Error("API error")),
    } as unknown as typeof import("yahoo-finance2").default;
    await expect(
      convertCurrency(10, "USD", "EUR", mockYahooFinance, mockLog),
    ).rejects.toThrow("API error");
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining("Currency conversion failed: API error"),
    );
  });
});
