/**
 * @file tests/agent.test.ts
 * @description Tests for core agent functions using dependency injection.
 */
import { describe, it, expect } from "bun:test";
import {
  getStockPriceWithDeps,
  getPortfolioWithDeps,
  calculateNetWorthWithDeps,
  calculateAverageCost,
} from "../lib/core";
import type { Portfolio } from "../lib/definitions";

describe("getStockPriceWithDeps", () => {
  it("should return the converted stock price", async () => {
    const price = await getStockPriceWithDeps("AAPL", {
      quoteFn: async () => ({ regularMarketPrice: 100.0 }),
      convertFn: async (p) => p * 0.85,
      logFn: () => {},
    });
    expect(price).toBe(85.0);
  });

  it("should throw if price is undefined", async () => {
    await expect(
      getStockPriceWithDeps("AAPL", {
        quoteFn: async () => ({ regularMarketPrice: undefined }),
        convertFn: async (p) => p,
        logFn: () => {},
      }),
    ).rejects.toThrow("Failed to fetch stock price");
  });
});

describe("getPortfolioWithDeps", () => {
  it("should parse and return portfolio", async () => {
    const mockPortfolio: Portfolio = {
      cash: 1000,
      holdings: { AAPL: 10 },
      history: [],
    };
    const portfolio = await getPortfolioWithDeps({
      readFileFn: async () => JSON.stringify(mockPortfolio),
    });
    expect(portfolio).toEqual(mockPortfolio);
  });
});

describe("calculateNetWorthWithDeps", () => {
  it("should calculate net worth correctly", async () => {
    const mockPortfolio: Portfolio = {
      cash: 1000,
      holdings: { AAPL: 10 },
      history: [],
    };
    const netWorth = await calculateNetWorthWithDeps({
      getPortfolioFn: async () => mockPortfolio,
      getStockPriceFn: async () => 150.0,
      logFn: () => {},
    });
    expect(netWorth).toBe(2500); // 1000 + 10 * 150
  });

  it("should handle empty holdings", async () => {
    const mockPortfolio: Portfolio = {
      cash: 500,
      holdings: {},
      history: [],
    };
    const netWorth = await calculateNetWorthWithDeps({
      getPortfolioFn: async () => mockPortfolio,
      getStockPriceFn: async () => 100.0,
      logFn: () => {},
    });
    expect(netWorth).toBe(500);
  });
});

describe("calculateAverageCost", () => {
  it("should calculate average cost for single buy", () => {
    const history: Portfolio["history"] = [
      {
        date: "2025-01-01T00:00:00.000Z",
        type: "buy",
        ticker: "AAPL",
        shares: 10,
        price: 100,
        total: 1000,
      },
    ];
    const avgCosts = calculateAverageCost(history);
    expect(avgCosts.AAPL).toBe(100);
  });

  it("should calculate weighted average for multiple buys", () => {
    const history: Portfolio["history"] = [
      {
        date: "2025-01-01T00:00:00.000Z",
        type: "buy",
        ticker: "AAPL",
        shares: 10,
        price: 100,
        total: 1000,
      },
      {
        date: "2025-01-02T00:00:00.000Z",
        type: "buy",
        ticker: "AAPL",
        shares: 10,
        price: 200,
        total: 2000,
      },
    ];
    const avgCosts = calculateAverageCost(history);
    expect(avgCosts.AAPL).toBe(150); // (10*100 + 10*200) / 20 = 150
  });

  it("should handle buy and sell correctly", () => {
    const history: Portfolio["history"] = [
      {
        date: "2025-01-01T00:00:00.000Z",
        type: "buy",
        ticker: "AAPL",
        shares: 10,
        price: 100,
        total: 1000,
      },
      {
        date: "2025-01-02T00:00:00.000Z",
        type: "sell",
        ticker: "AAPL",
        shares: 5,
        price: 150,
        total: 750,
      },
    ];
    const avgCosts = calculateAverageCost(history);
    expect(avgCosts.AAPL).toBe(100); // Avg cost stays 100 after partial sell
  });

  it("should handle multiple tickers", () => {
    const history: Portfolio["history"] = [
      {
        date: "2025-01-01T00:00:00.000Z",
        type: "buy",
        ticker: "AAPL",
        shares: 10,
        price: 100,
        total: 1000,
      },
      {
        date: "2025-01-02T00:00:00.000Z",
        type: "buy",
        ticker: "NVDA",
        shares: 5,
        price: 200,
        total: 1000,
      },
    ];
    const avgCosts = calculateAverageCost(history);
    expect(avgCosts.AAPL).toBe(100);
    expect(avgCosts.NVDA).toBe(200);
  });

  it("should return empty for fully sold positions", () => {
    const history: Portfolio["history"] = [
      {
        date: "2025-01-01T00:00:00.000Z",
        type: "buy",
        ticker: "AAPL",
        shares: 10,
        price: 100,
        total: 1000,
      },
      {
        date: "2025-01-02T00:00:00.000Z",
        type: "sell",
        ticker: "AAPL",
        shares: 10,
        price: 150,
        total: 1500,
      },
    ];
    const avgCosts = calculateAverageCost(history);
    expect(avgCosts.AAPL).toBeUndefined();
  });

  it("should handle incomplete history with currentHoldings", () => {
    // History shows net 3 shares, but we actually have 4
    const history: Portfolio["history"] = [
      {
        date: "2025-01-01T00:00:00.000Z",
        type: "buy",
        ticker: "NVDA",
        shares: 2,
        price: 145,
        total: 290,
      },
      {
        date: "2025-01-02T00:00:00.000Z",
        type: "sell",
        ticker: "NVDA",
        shares: 2,
        price: 150,
        total: 300,
      },
      {
        date: "2025-01-03T00:00:00.000Z",
        type: "buy",
        ticker: "NVDA",
        shares: 3,
        price: 162,
        total: 486,
      },
    ];
    const currentHoldings = { NVDA: 4 };
    const avgCosts = calculateAverageCost(history, currentHoldings);
    // 3 shares @ 162 from history + 1 missing share @ 162 (last buy price)
    // (486 + 162) / 4 = 162
    expect(avgCosts.NVDA).toBe(162);
  });

  it("should use last buy price when history shows 0 but holdings exist", () => {
    const history: Portfolio["history"] = [
      {
        date: "2025-01-01T00:00:00.000Z",
        type: "buy",
        ticker: "AAPL",
        shares: 5,
        price: 100,
        total: 500,
      },
      {
        date: "2025-01-02T00:00:00.000Z",
        type: "sell",
        ticker: "AAPL",
        shares: 5,
        price: 120,
        total: 600,
      },
    ];
    const currentHoldings = { AAPL: 3 };
    const avgCosts = calculateAverageCost(history, currentHoldings);
    expect(avgCosts.AAPL).toBe(100); // Uses last buy price
  });
});
