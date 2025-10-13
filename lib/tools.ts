/**
 * @file lib/tools.ts
 * @author Dennes Kohl
 * @description Tools for the Pierpoint Broker agent.
 * @license MIT
 * @copyright 2025 Dennes Kohl
 */

//External dependencies
import { tool } from "@openai/agents";
import { z } from "zod";
// Node-Builtins
import { writeFile } from "node:fs/promises";
// Custom codebase
import {
  getPortfolio,
  log,
  CURRENCY_SYMBOL,
  calculateNetWorth,
  getStockPrice,
  webSearch,
} from "./core";

/**
 * Retrieves the current portfolio data and returns it as a formatted string.
 *
 * @returns {Promise<string>} A Promise that resolves to a formatted string containing the current portfolio data.
 */
export const getPortfolioTool = tool({
  name: "get_portfolio",
  description: "Get your portfolio",
  parameters: z.object({}),
  async execute() {
    const portfolio = await getPortfolio();
    log(
      `💹 Fetched portfolio: ${portfolio.cash.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL}`,
    );
    return `Your cash balance is ${portfolio.cash.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL}.
Current holdings:
${Object.entries(portfolio.holdings)
  .map(([ticker, shares]) => `  - ${ticker}: ${shares} shares`)
  .join("\n")}\n\nTrade history:
${portfolio.history
  .map(
    (trade) =>
      `  - ${trade.date} ${trade.type} ${trade.ticker} ${trade.shares} shares at $${trade.price} per share, for a total of $${trade.total}`,
  )
  .join("\n")}`;
  },
});

/**
 * Retrieves the current net worth (total portfolio value) and returns it as a formatted string.
 *
 * @returns {Promise<string>} A Promise that resolves to a formatted string containing the current net worth.
 */
export const getNetWorthTool = tool({
  name: "get_net_worth",
  description: "Get your current net worth (total portfolio value)",
  parameters: z.object({}),
  async execute() {
    const netWorth = await calculateNetWorth();
    const portfolio = await getPortfolio();
    const returnPercentage = (((netWorth - 1000) / 1000) * 100).toFixed(2);

    log(`💰 Current net worth: $${netWorth} (${returnPercentage}% return)`);

    return `Your current net worth is $${netWorth}
  - Cash: $${portfolio.cash}
  - Holdings value: $${(netWorth - portfolio.cash).toFixed(2)}
  - Total return: ${returnPercentage}% (started with $1,000)
  - ${netWorth >= 1000 ? "📈 Up" : "📉 Down"} $${Math.abs(
    netWorth - 1000,
  ).toFixed(2)} from initial investment`;
  },
});

/**
 * Buys a given stock at the current market price.
 *
 * @param {string} ticker - The stock ticker symbol to buy.
 * @param {number} shares - The number of shares to buy.
 *
 * @returns {Promise<string>} A Promise that resolves to a formatted string containing the result of the buy operation.
 *
 * @throws If the user does not have enough cash to buy the specified number of shares.
 */
export const buyTool = tool({
  name: "buy",
  description: "Buy a given stock at the current market price",
  parameters: z.object({
    ticker: z.string(),
    shares: z.number().positive(),
  }),
  async execute({ ticker, shares }) {
    const price = await getStockPrice(ticker);
    const portfolio = await getPortfolio();
    if (portfolio.cash < shares * price)
      return `You don't have enough cash to buy ${shares} shares of ${ticker}. Your cash balance is ${portfolio.cash.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL} and the price is ${price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL} per share.`;

    portfolio.holdings[ticker] = (portfolio.holdings[ticker] ?? 0) + shares;
    portfolio.history.push({
      date: new Date().toISOString(),
      type: "buy",
      ticker,
      shares,
      price,
      total: shares * price,
    });
    portfolio.cash = Math.round((portfolio.cash - shares * price) * 100) / 100;
    await writeFile("portfolio.json", JSON.stringify(portfolio, null, 2));

    log(
      `💰 Purchased ${shares} shares of ${ticker} at ${price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL} per share`,
    );
    return `Purchased ${shares} shares of ${ticker} at $${price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL} per share, for a total of $${
      shares * price
    }. Your cash balance is now $${portfolio.cash}.`;
  },
});

/**
 * Sells a given stock at the current market price.
 *
 * @param {string} ticker - The stock ticker symbol to sell.
 * @param {number} shares - The number of shares to sell.
 *
 * @returns {Promise<string>} A Promise that resolves to a formatted string containing the result of the sell operation.
 *
 * @throws If the user does not have enough shares of the specified stock to sell.
 */
export const sellTool = tool({
  name: "sell",
  description: "Sell a given stock at the current market price",
  parameters: z.object({
    ticker: z.string(),
    shares: z.number().positive(),
  }),
  async execute({ ticker, shares }) {
    const portfolio = await getPortfolio();
    if (portfolio.holdings[ticker] < shares)
      return `You don't have enough shares of ${ticker} to sell. You have ${portfolio.holdings[ticker]} shares.`;

    const price = await getStockPrice(ticker);
    portfolio.holdings[ticker] = (portfolio.holdings[ticker] ?? 0) - shares;
    if (portfolio.holdings[ticker] === 0) {
      delete portfolio.holdings[ticker];
    }
    portfolio.history.push({
      date: new Date().toISOString(),
      type: "sell",
      ticker,
      shares,
      price,
      total: shares * price,
    });
    portfolio.cash = Math.round((portfolio.cash + shares * price) * 100) / 100;
    await writeFile("portfolio.json", JSON.stringify(portfolio, null, 2));

    log(
      `💸 Sold ${shares} shares of ${ticker} at ${price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL} per share`,
    );
    return `Sold ${shares} shares of ${ticker} at ${price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL} per share, for a total of ${
      shares * price
    }. Your cash balance is now ${portfolio.cash.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL}.`;
  },
});

/**
 * Retrieves the current price of a given stock ticker.
 *
 * @param {string} ticker - The stock ticker symbol.
 *
 * @returns {Promise<number>} A Promise that resolves to the current price of the stock.
 *
 * @throws If the stock price cannot be retrieved.
 */
export const getStockPriceTool = tool({
  name: "get_stock_price",
  description: "Get the current price of a given stock ticker",
  parameters: z.object({
    ticker: z.string(),
  }),
  async execute({ ticker }) {
    const price = await getStockPrice(ticker);
    log(
      `🔖 Searched for stock price for ${ticker}: ${price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL}`,
    );
    return price;
  },
});

/**
 * Performs a web search to answer a user query.
 *
 * @param {string} query - The user query to answer.
 *
 * @returns {Promise<string>} A Promise that resolves to a short summary in markdown of what was found.
 *
 * @throws If the web search fails.
 */
export const webSearchTool = tool({
  name: "web_search",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string(),
  }),
  async execute({ query }) {
    log(`🔍 Searching the web for: ${query}`);
    const result = await webSearch(query);
    return result;
  },
});

/**
 * Allows the agent to think about a given topic.
 *
 * @param {string[]} thought_process - An array of thoughts or reasoning steps.
 *
 * @returns {Promise<string>} A Promise that resolves to a message indicating the completion of the thought process.
 */
export const thinkTool = tool({
  name: "think",
  description: "Think about a given topic",
  parameters: z.object({
    thought_process: z.array(z.string()),
  }),
  async execute({ thought_process }) {
    thought_process.forEach((thought) => log(`🧠 ${thought}`));
    return `Completed thinking with ${thought_process.length} steps of reasoning.`;
  },
});
