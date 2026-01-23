/**
 * @file tests/agent.test.ts
 * @description Tests for core agent functions using dependency injection.
 */
import { describe, it, expect } from "bun:test";
import {
  getStockPriceWithDeps,
  getPortfolioWithDeps,
  calculateNetWorthWithDeps,
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
