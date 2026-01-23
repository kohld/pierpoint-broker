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

/**
 * Retrieves the current price of a stock ticker.
 *
 * @param {string} ticker - The stock ticker symbol.
 *
 * @returns {Promise<number>} A Promise that resolves to the current price of the stock.
 *
 * @throws If the stock price cannot be retrieved.
 */
export const getStockPrice = async (ticker: string): Promise<number> => {
  try {
    const quote = await yahooFinance.quote(ticker);
    const priceUSD = quote.regularMarketPrice;

    if (!priceUSD) {
      throw new Error("Failed to fetch stock price");
    }
    const priceEUR = await convertCurrency(
      priceUSD,
      "USD",
      "EUR",
      yahooFinance,
      log,
    );

    console.log(`Price of ${ticker}: $${priceUSD} (€${priceEUR})`);

    return priceEUR;
  } catch (error) {
    log(`⚠️ Failed to get price for ${ticker}: ${error}`);
    throw error;
  }
};

/**
 * Retrieves the current portfolio data from the portfolio.json file.
 *
 * @returns {Promise<Portfolio>} A Promise that resolves to the current portfolio data.
 *
 * @throws If the portfolio file cannot be read or parsed.
 */
export const getPortfolio = async (): Promise<Portfolio> => {
  const portfolioData = await readFile("portfolio.json", "utf-8");
  const portfolio = portfolioSchema.parse(JSON.parse(portfolioData));
  return portfolio;
};

/**
 * Calculates the current net worth (total portfolio value).
 *
 * @returns {Promise<number>} A Promise that resolves to the current net worth.
 */
export const calculateNetWorth = async (): Promise<number> => {
  const portfolio = await getPortfolio();
  let totalHoldingsValue = 0;
  for (const [ticker, shares] of Object.entries(portfolio.holdings))
    if (shares > 0) {
      try {
        const price = await getStockPrice(ticker);
        totalHoldingsValue += shares * price;
      } catch (error) {
        log(`⚠️ Failed to get price for ${ticker}: ${error}`);
      }
    }

  const netWorth =
    Math.round((portfolio.cash + totalHoldingsValue) * 100) / 100;
  return netWorth;
};

/**
 * Calculates the current portfolio value and returns it as a formatted string.
 *
 * @returns {Promise<string>} A Promise that resolves to a formatted string containing the current portfolio value.
 */
export const calculatePortfolioValue = async (): Promise<{
  totalValue: number;
  holdings: Record<string, { shares: number; value: number }>;
}> => {
  const portfolio = await getPortfolio();
  const holdingsWithValues: Record<string, { shares: number; value: number }> =
    {};
  let totalHoldingsValue = 0;

  for (const [ticker, shares] of Object.entries(portfolio.holdings)) {
    if (shares > 0) {
      try {
        const price = await getStockPrice(ticker);
        const value = Math.round(shares * price * 100) / 100;
        holdingsWithValues[ticker] = { shares, value };
        totalHoldingsValue += value;
      } catch (error) {
        log(`⚠️ Failed to get price for ${ticker}: ${error}`);
        holdingsWithValues[ticker] = { shares, value: 0 };
      }
    }
  }

  const totalValue =
    Math.round((portfolio.cash + totalHoldingsValue) * 100) / 100;
  return { totalValue, holdings: holdingsWithValues };
};
