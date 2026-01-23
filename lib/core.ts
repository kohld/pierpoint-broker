/**
 * @file lib/core.ts
 * @author Dennes Kohl
 * @description Core logic for the Pierpoint Broker agent.
 * @license MIT
 * @copyright 2025 Dennes Kohl
 */

//External dependencies
import OpenAI from "openai";
import YahooFinance from "yahoo-finance2";
// Node-Builtins
import { appendFile, readFile } from "node:fs/promises";
// Custom codebase
import { convertCurrency } from "./utils";
import { portfolioSchema, type Portfolio } from "./definitions";

// Create yahoo-finance2 instance
const yahooFinance = new YahooFinance();

/**
 * Configuration variables for the broker agent.
 * These variables are required to be set in the .env file.
 *
 * @property {string} API_KEY - The API key for OpenAI.
 * @property {string} MODEL_NAME - The model name to use for the LLM.
 * @property {string} CURRENCY - The currency to use for the portfolio.
 * @property {string} CURRENCY_SYMBOL - The currency symbol to use for the portfolio.
 */
export const config = {
  API_KEY: process.env.OPENAI_API_KEY,
  MODEL_NAME: process.env.MODEL_NAME || "gpt-4.1",
  CURRENCY: process.env.CURRENCY || "EUR",
  MAX_TURNS: 40,
};

if (!config.API_KEY) throw new Error("OPENAI_API_KEY is not set");
if (!config.MODEL_NAME) throw new Error("MODEL_NAME is not set");
export const CURRENCY_SYMBOL = config.CURRENCY === "EUR" ? "€" : "$";

export const client = new OpenAI();

/**
 * Logs a message to the console and appends it to the agent.log file.
 * The message is prefixed with a timestamp.
 *
 * @param {string} message - The message to log.
 */
export const log = (message: string) => {
  message = `[${new Date().toISOString()}] ${message}`;
  console.log(message);
  appendFile("agent.log", message + "\n");
};

/**
 * Performs a web search to answer a user query.
 *
 * @param {string} query - The user query to answer.
 *
 * @returns {Promise<string>} A Promise that resolves to a short summary in markdown of what was found.
 *
 * @throws If the web search fails.
 */
export const webSearch = async (query: string): Promise<string> => {
  const response = await client.responses.create({
    model: config.MODEL_NAME,
    input: `Please use web search to answer this query from the user and respond with a short summary in markdown of what you found:\n\n${query}`,
    tools: [{ type: "web_search_preview" }],
  });
  return response.output_text;
};

/** Dependencies for getStockPrice (for testing) */
export interface StockPriceDeps {
  quoteFn: (ticker: string) => Promise<{ regularMarketPrice?: number }>;
  convertFn: (price: number, from: string, to: string) => Promise<number>;
  logFn: (msg: string) => void;
}

/** Testable version of getStockPrice with dependency injection */
export const getStockPriceWithDeps = async (
  ticker: string,
  deps: StockPriceDeps,
): Promise<number> => {
  try {
    const quote = await deps.quoteFn(ticker);
    const priceUSD = quote.regularMarketPrice;
    if (!priceUSD) throw new Error("Failed to fetch stock price");
    const priceEUR = await deps.convertFn(priceUSD, "USD", "EUR");
    console.log(`Price of ${ticker}: $${priceUSD} (€${priceEUR})`);
    return priceEUR;
  } catch (error) {
    deps.logFn(`⚠️ Failed to get price for ${ticker}: ${error}`);
    throw error;
  }
};

/**
 * Retrieves the current price of a stock ticker.
 */
export const getStockPrice = async (ticker: string): Promise<number> => {
  return getStockPriceWithDeps(ticker, {
    quoteFn: async (t) => {
      const quote = await yahooFinance.quote(t);
      return { regularMarketPrice: quote.regularMarketPrice };
    },
    convertFn: (price, from, to) =>
      convertCurrency(price, from, to, yahooFinance, log),
    logFn: log,
  });
};

/** Dependencies for getPortfolio (for testing) */
export interface PortfolioDeps {
  readFileFn: (path: string) => Promise<string>;
}

/** Testable version of getPortfolio with dependency injection */
export const getPortfolioWithDeps = async (
  deps: PortfolioDeps,
): Promise<Portfolio> => {
  const portfolioData = await deps.readFileFn("portfolio.json");
  return portfolioSchema.parse(JSON.parse(portfolioData));
};

/**
 * Retrieves the current portfolio data from the portfolio.json file.
 */
export const getPortfolio = async (): Promise<Portfolio> => {
  return getPortfolioWithDeps({
    readFileFn: (path) => readFile(path, "utf-8"),
  });
};

/** Dependencies for calculateNetWorth (for testing) */
export interface NetWorthDeps {
  getPortfolioFn: () => Promise<Portfolio>;
  getStockPriceFn: (ticker: string) => Promise<number>;
  logFn: (msg: string) => void;
}

/** Testable version of calculateNetWorth with dependency injection */
export const calculateNetWorthWithDeps = async (
  deps: NetWorthDeps,
): Promise<number> => {
  const portfolio = await deps.getPortfolioFn();
  let totalHoldingsValue = 0;
  for (const [ticker, shares] of Object.entries(portfolio.holdings))
    if (shares > 0) {
      try {
        const price = await deps.getStockPriceFn(ticker);
        totalHoldingsValue += shares * price;
      } catch (error) {
        deps.logFn(`⚠️ Failed to get price for ${ticker}: ${error}`);
      }
    }
  return Math.round((portfolio.cash + totalHoldingsValue) * 100) / 100;
};

/**
 * Calculates the current net worth (total portfolio value).
 */
export const calculateNetWorth = async (): Promise<number> => {
  return calculateNetWorthWithDeps({
    getPortfolioFn: getPortfolio,
    getStockPriceFn: getStockPrice,
    logFn: log,
  });
};

/**
 * Calculates the average cost basis for each holding using weighted average method.
 * This analyzes the trade history to determine the average purchase price.
 * Handles edge cases where sells occur before buys (incomplete history).
 *
 * @param history - The trade history
 * @param currentHoldings - Optional: current holdings to detect incomplete history
 */
export const calculateAverageCost = (
  history: Portfolio["history"],
  currentHoldings?: Record<string, number>,
): Record<string, number> => {
  const costBasis: Record<string, { totalCost: number; totalShares: number }> =
    {};
  const lastBuyPrice: Record<string, number> = {};

  for (const trade of history) {
    if (!costBasis[trade.ticker]) {
      costBasis[trade.ticker] = { totalCost: 0, totalShares: 0 };
    }

    if (trade.type === "buy") {
      costBasis[trade.ticker].totalCost += trade.shares * trade.price;
      costBasis[trade.ticker].totalShares += trade.shares;
      lastBuyPrice[trade.ticker] = trade.price;
    } else if (trade.type === "sell") {
      // Only reduce if we have shares to sell (handles incomplete history)
      if (costBasis[trade.ticker].totalShares > 0) {
        const currentAvg =
          costBasis[trade.ticker].totalCost /
          costBasis[trade.ticker].totalShares;
        const sharesToReduce = Math.min(
          trade.shares,
          costBasis[trade.ticker].totalShares,
        );
        costBasis[trade.ticker].totalCost -= sharesToReduce * currentAvg;
        costBasis[trade.ticker].totalShares -= sharesToReduce;
      }
      // If no shares to sell, ignore this sell (pre-history trade)
    }
  }

  const avgCosts: Record<string, number> = {};
  for (const [ticker, data] of Object.entries(costBasis)) {
    if (data.totalShares > 0) {
      // Check if history matches current holdings
      const actualShares = currentHoldings?.[ticker] ?? data.totalShares;
      if (actualShares !== data.totalShares && lastBuyPrice[ticker]) {
        // Incomplete history: use last buy price as estimate for missing shares
        const missingShares = actualShares - data.totalShares;
        const adjustedCost =
          data.totalCost + missingShares * lastBuyPrice[ticker];
        avgCosts[ticker] =
          Math.round((adjustedCost / actualShares) * 100) / 100;
      } else {
        avgCosts[ticker] =
          Math.round((data.totalCost / data.totalShares) * 100) / 100;
      }
    } else if (
      currentHoldings?.[ticker] &&
      currentHoldings[ticker] > 0 &&
      lastBuyPrice[ticker]
    ) {
      // We have holdings but history shows 0 - use last buy price
      avgCosts[ticker] = lastBuyPrice[ticker];
    }
  }
  return avgCosts;
};

/** Holding data with P&L information */
export interface HoldingWithPnL {
  shares: number;
  value: number;
  avgCost: number;
  pnl: number;
  pnlPercent: number;
}

/**
 * Calculates the current portfolio value with P&L for each holding.
 */
export const calculatePortfolioValue = async (): Promise<{
  totalValue: number;
  holdings: Record<string, HoldingWithPnL>;
}> => {
  const portfolio = await getPortfolio();
  const avgCosts = calculateAverageCost(portfolio.history, portfolio.holdings);
  const holdingsWithValues: Record<string, HoldingWithPnL> = {};
  let totalHoldingsValue = 0;

  for (const [ticker, shares] of Object.entries(portfolio.holdings)) {
    if (shares > 0) {
      try {
        const price = await getStockPrice(ticker);
        const value = Math.round(shares * price * 100) / 100;
        const avgCost = avgCosts[ticker] || 0;
        const costBasis = shares * avgCost;
        const pnl = Math.round((value - costBasis) * 100) / 100;
        const pnlPercent =
          costBasis > 0 ? Math.round((pnl / costBasis) * 10000) / 100 : 0;

        holdingsWithValues[ticker] = {
          shares,
          value,
          avgCost,
          pnl,
          pnlPercent,
        };
        totalHoldingsValue += value;
      } catch (error) {
        log(`⚠️ Failed to get price for ${ticker}: ${error}`);
        holdingsWithValues[ticker] = {
          shares,
          value: 0,
          avgCost: avgCosts[ticker] || 0,
          pnl: 0,
          pnlPercent: 0,
        };
      }
    }
  }

  const totalValue =
    Math.round((portfolio.cash + totalHoldingsValue) * 100) / 100;
  return { totalValue, holdings: holdingsWithValues };
};
