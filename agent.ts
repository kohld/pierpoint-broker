/**
 * @file agent.ts
 * @author Dennes Kohl
 * @description Main logic for the Pierpoint Broker agent.
 * @license MIT
 * @copyright 2025 Dennes Kohl
 */
import "dotenv/config";
import { existsSync } from "fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import OpenAI from "openai";
import yahooFinance from "yahoo-finance2";
import { z } from "zod";

/**
 * Configuration variables for the broker agent.
 * These variables are required to be set in the .env file.
 *
 * @property {string} API_KEY - The API key for OpenRouter.
 * @property {string} MODEL_NAME - The model name to use for the LLM.
 * @property {string} CURRENCY - The currency to use for the portfolio.
 * @property {string} CURRENCY_SYMBOL - The currency symbol to use for the portfolio.
 */
const config = {
  API_KEY: process.env.OPEN_ROUTER_API_KEY,
  MODEL_NAME: process.env.MODEL_NAME || "gpt-3.5-turbo",
  CURRENCY: process.env.CURRENCY || "EUR",
};

if (!config.API_KEY) throw new Error("OPEN_ROUTER_API_KEY is not set");
if (!config.MODEL_NAME) throw new Error("MODEL_NAME is not set");

const CURRENCY_SYMBOL = config.CURRENCY === "EUR" ? "€" : "$";

/**
 * OpenRouter client instance.
 * Used to make API calls to OpenRouter.
 */
const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: config.API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/kohld/pierpoint-broker",
    "X-Title": "Pierpoint Broker",
  },
});

/**
 * Logs a message to the console and appends it to the agent.log file.
 * The message is prefixed with a timestamp.
 *
 * @param {string} message - The message to log.
 */
const log = (message: string) => {
  message = `[${new Date().toISOString()}] ${message}`;
  console.log(message);
  appendFile("agent.log", message + "\n");
};

/**
 * Zod schema for validating the portfolio object.
 * Defines the expected structure of the portfolio data.
 *
 * @property {number} cash - The amount of cash in the portfolio.
 * @property {Record<string, number>} holdings - A record of stock holdings, where keys are ticker symbols and values are the number of shares.
 * @property {Array<Trade>} history - An array of trade history objects.
 */
const portfolioSchema = z.object({
  cash: z.number(),
  holdings: z.record(z.string(), z.number()),
  history: z.array(
    z.object({
      date: z.string(),
      type: z.enum(["buy", "sell"]),
      ticker: z.string(),
      shares: z.number(),
      price: z.number(),
      total: z.number(),
    })
  ),
});

/**
 * Converts a monetary amount from one currency to another using real-time exchange rates from Yahoo Finance.
 *
 * @param amount - The amount of money to convert.
 * @param fromCurrency - The currency code to convert from (e.g., 'USD').
 * @param toCurrency - The currency code to convert to (e.g., 'EUR').
 * 
 * @returns A Promise that resolves to the converted amount, rounded to two decimal places.
 * 
 * @throws If the exchange rate is invalid or cannot be fetched.
 */
const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
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

/**
 * Performs a web search to answer a user query.
 * 
 * @param {string} query - The user query to answer.
 * 
 * @returns {Promise<string>} A Promise that resolves to a short summary in markdown of what was found.
 * 
 * @throws If the web search fails.
 */
const webSearch = async (query: string): Promise<string> => {
  const response = await client.chat.completions.create({
    model: config.MODEL_NAME,
    messages: [
      {
        role: "user",
        content: `Please use web search to answer this query from the user and respond with a short summary in markdown of what you found:\n\n${query}`,
      },
    ],
  });
  if (!response.choices[0].message.content) throw new Error("Failed to get web search results");

  return response.choices[0].message.content;
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
const getStockPrice = async (ticker: string): Promise<number> => {
  const response = await client.chat.completions.create({
    model: config.MODEL_NAME,
    messages: [
      {
        role: "user",
        content: `What is the current price of the stock ticker $${ticker}? Please use web search to get the latest price and then answer in short. Respond with only the price as a number.`,
      },
    ],
  });
  const content = response.choices[0].message.content;
  if (!content) throw new Error("Failed to get stock price");
  const match = content.match(/(\d+(\.\d+)?)/);
  if (!match) throw new Error("Failed to get stock price");
  return parseFloat(match[1]);
};

/**
 * Retrieves the current portfolio data from the portfolio.json file.
 * Parses the JSON content and validates it against the portfolio schema.
 * Returns the parsed portfolio object.
 *
 * @returns {Promise<Portfolio>} The current portfolio object.
 */
const getPortfolio = async (): Promise<z.infer<typeof portfolioSchema>> => {
  const portfolioData = await readFile("portfolio.json", "utf-8");
  return portfolioSchema.parse(JSON.parse(portfolioData));
};

/**
 * An object containing all available tools (actions) the broker agent can perform.
 * Each tool is represented as an object with a name, description, and an execute function.
 * Tools include portfolio management, trading actions, information retrieval, and reasoning steps.
 *
 * Structure:
 * {
 *   [toolKey: string]: {
 *     name: string; // The name of the tool (for API or UI use)
 *     description: string; // A short description of what the tool does
 *     execute: Function; // The function to call to perform the tool's action
 *   }
 * }
 *
 * Example usage:
 *   await availableTools.buy.execute({ ticker: 'AAPL', shares: 10 });
 */
const availableTools = {
  getPortfolioTool: {
    name: "get_portfolio",
    description: "Get your portfolio",
    async execute() {
      const portfolio = await getPortfolio();
      log(`💹 Fetched portfolio: $${portfolio.cash}`);
      return `Your cash balance is $${portfolio.cash}.
Current holdings:
${Object.entries(portfolio.holdings)
          .map(([ticker, shares]) => `  - ${ticker}: ${shares} shares`)
          .join("\n")}\n\nTrade history:
${portfolio.history
          .map(
            (trade) =>
              `  - ${trade.date} ${trade.type} ${trade.ticker} ${trade.shares} shares at $${trade.price} per share, for a total of $${trade.total}`
          )
          .join("\n")}`;
    },
  },
  getNetWorthTool: {
    name: "get_net_worth",
    description: "Get your current net worth (total portfolio value)",
    async execute() {
      const netWorth = await calculateNetWorth();
      const portfolio = await getPortfolio();
      const annualizedReturn = await calculateAnnualizedReturn(portfolio);

      log(
        `💰 Current net worth: $${netWorth} (${annualizedReturn}% annualized return)`
      );

      return `Your current net worth is $${netWorth}
- Cash: $${portfolio.cash}
- Holdings value: $${(netWorth - portfolio.cash).toFixed(2)}
- Annualized return: ${annualizedReturn}% (started with $1,000)
- ${netWorth >= 1000 ? "📈 Up" : "📉 Down"} $${Math.abs(
        netWorth - 1000
      ).toFixed(2)} from initial investment`;
    },
  },
  buyTool: {
    name: "buy",
    description: "Buy a given stock at the current market price",
    async execute({ ticker, shares }: { ticker: string; shares: number }) {
      const price = await getStockPrice(ticker);
      const portfolio = await getPortfolio();
      if (portfolio.cash < shares * price)
        return `You don't have enough cash to buy ${shares} shares of ${ticker}. Your cash balance is $${portfolio.cash} and the price is $${price} per share.`;

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

      log(`💰 Purchased ${shares} shares of ${ticker} at $${price} per share`);
      return `Purchased ${shares} shares of ${ticker} at $${price} per share, for a total of $${shares * price
        }. Your cash balance is now $${portfolio.cash}.`;
    },
  },
  sellTool: {
    name: "sell",
    description: "Sell a given stock at the current market price",
    async execute({ ticker, shares }: { ticker: string; shares: number }) {
      const portfolio = await getPortfolio();
      if ((portfolio.holdings[ticker] ?? 0) < shares)
        return `You don't have enough shares of ${ticker} to sell. You have ${portfolio.holdings[ticker] ?? 0} shares.`;

      const price = await getStockPrice(ticker);
      portfolio.holdings[ticker] = (portfolio.holdings[ticker] ?? 0) - shares;
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

      log(`💸 Sold ${shares} shares of ${ticker} at $${price} per share`);
      return `Sold ${shares} shares of ${ticker} at $${price} per share, for a total of $${shares * price
        }. Your cash balance is now $${portfolio.cash}.`;
    },
  },
  getStockPriceTool: {
    name: "get_stock_price",
    description: "Get the current price of a given stock ticker",
    async execute({ ticker }: { ticker: string }) {
      const price = await getStockPrice(ticker);
      log(`🔖 Searched for stock price for ${ticker}: $${price}`);
      return price;
    },
  },
  webSearchTool: {
    name: "web_search",
    description: "Search the web for information",
    async execute({ query }: { query: string }) {
      log(`🔍 Searching the web for: ${query}`);
      const result = await webSearch(query);
      return result;
    },
  },
  thinkTool: {
    name: "think",
    description: "Think about a given topic",
    async execute({ thought_process }: { thought_process: string[] }) {
      thought_process.forEach((thought) => log(`🧠 ${thought}`));
      return `Completed thinking with ${thought_process.length} steps of reasoning.`;
    },
  },
};

// --- Helper functions ---
/**
 * Calculates the current net worth by summing the cash balance and the total value of all holdings in the portfolio.
 * Fetches the latest stock prices for each holding to ensure an up-to-date calculation.
 * Logs a warning if a stock price cannot be fetched.
 *
 * @returns {Promise<number>} The total net worth, rounded to two decimal places.
 */
const calculateNetWorth = async (): Promise<number> => {
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
  return Math.round((portfolio.cash + totalHoldingsValue) * 100) / 100;
};

/**
 * Calculates the Compound Annual Growth Rate (CAGR) based on the number of days and the current value.
 * 
 * @param {number} days - The number of days since the initial investment.
 * @param {number} currentValue - The current value of the investment.
 * 
 * @returns {number} The CAGR as a percentage.
 */
const calculateCAGR = (days: number, currentValue: number): number => {
  const startValue = 1000;
  const years = days / 365;
  return Math.pow(currentValue / startValue, 1 / years) - 1;
};

/**
 * Calculates the annualized return based on the portfolio's history.
 * 
 * @param {z.infer<typeof portfolioSchema>} portfolio - The portfolio object containing the history of trades.
 * 
 * @returns {Promise<string>} The annualized return as a formatted string.
 */
const calculateAnnualizedReturn = async (portfolio: z.infer<typeof portfolioSchema>): Promise<string> => {
  if (portfolio.history.length === 0) return "0.00";
  const firstTradeDate = new Date(portfolio.history[0].date);
  const currentDate = new Date();
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
  const currentTotalValue = portfolio.cash + totalHoldingsValue;
  const days = (currentDate.getTime() - firstTradeDate.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 1) return "N/A";
  const cagr = calculateCAGR(days, currentTotalValue);
  return (cagr * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Calculates the current portfolio value by summing the cash balance and the total value of all holdings.
 * Fetches the latest stock prices for each holding to ensure an up-to-date calculation.
 * Logs a warning if a stock price cannot be fetched.
 *
 * @returns {Promise<{ totalValue: number; holdings: Record<string, { shares: number; value: number }> }>}
 * - totalValue: The total portfolio value, rounded to two decimal places.
 * - holdings: An object mapping stock tickers to their current holdings (shares and value).
 */
const calculatePortfolioValue = async (): Promise<{
  totalValue: number;
  holdings: Record<string, { shares: number; value: number }>;
}> => {
  const portfolio = await getPortfolio();
  const holdingsWithValues: Record<string, { shares: number; value: number }> = {};
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
  const totalValue = Math.round((portfolio.cash + totalHoldingsValue) * 100) / 100;
  return { totalValue, holdings: holdingsWithValues };
};

/**
 * Loads the chat thread from the thread.json file.
 * If the file exists, it reads the JSON content and returns the last 1000 messages.
 * If the file does not exist, it returns an empty array.
 * Logs a warning if the file cannot be read.
 *
 * @returns {Promise<any[]>} The chat thread messages.
 */
const loadThread = async (): Promise<any[]> => {
  try {
    if (existsSync("thread.json")) {
      const threadData = await readFile("thread.json", "utf-8");
      return JSON.parse(threadData).slice(-1000);
    }
  } catch (error) {
    log(`⚠️ Failed to load thread history: ${error}`);
  }
  return [];
};

/**
 * Saves the chat thread to the thread.json file.
 * Overwrites the existing file with the new thread data.
 * Logs a message when the thread is saved.
 *
 * @param {any[]} thread - The chat thread messages to save.
 */
const saveThread = async (thread: any[]) => {
  try {
    await writeFile("thread.json", JSON.stringify(thread, null, 2));
    log(`💾 Saved thread history (${thread.length} items)`);
  } catch (error) {
    log(`❌ Failed to save thread history: ${error}`);
  }
};


/**
 * Updates the README.md file with the latest portfolio value, recent trades, holdings, and annualized return.
 * Fetches the current portfolio and calculates up-to-date statistics, then rewrites the relevant section in the README.
 * Logs an error if the update process fails at any step.
 */
const updateReadme = async () => {
  try {
    const portfolio = await getPortfolio();
    const { totalValue, holdings } = await calculatePortfolioValue();
    const readmeContent = await readFile("README.md", "utf-8");
    const recentTrades = portfolio.history.slice(-20).reverse();
    const annualizedReturn = await calculateAnnualizedReturn(portfolio);
    const portfolioSection = `<!-- auto start -->

## 💰 Portfolio value: ${totalValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${CURRENCY_SYMBOL} | (${annualizedReturn}% CAGR)

### 📊 Holdings

| Asset | Shares | Value |
|-------|--------|-------|
| Cash | - | ${portfolio.cash.toFixed(2)} ${CURRENCY_SYMBOL} |
${Object.entries(holdings)
        .map(
          ([ticker, data]) =>
            `| ${ticker} | ${data.shares} | $${data.value.toFixed(2)} |`
        )
        .join("\n")}

### 📈 Recent trades

${recentTrades.length > 0
        ? recentTrades
          .map(
            (trade) =>
              `- **${new Date(trade.date).toLocaleString("en-US", {
                timeZone: "UTC",
                dateStyle: "long",
                timeStyle: "medium",
              })}**: ${trade.type.toUpperCase()} ${trade.shares} ${trade.ticker
              } @ $${trade.price}/share ($${trade.total.toFixed(2)})`
          )
          .join("\n")
        : "- No trades yet"
      }

<!-- auto end -->`;

    const updatedReadme = readmeContent.replace(
      /<!-- auto start -->[\s\S]*<!-- auto end -->/,
      portfolioSection
    );

    await writeFile("README.md", updatedReadme);
    log(`📝 Updated README with portfolio value: $${totalValue}`);
  } catch (error) {
    log(`❌ Failed to update README: ${error}`);
  }
};

/**
 * Main function that runs the broker agent.
 * Fetches the current portfolio, updates the README with the portfolio value,
 * and logs the starting message.
 */
const main = async () => {

  log("Starting broker agent");
  const quoteApple = await yahooFinance.quote('AAPL');
  const applePriceUSD = quoteApple.regularMarketPrice;
  console.log(applePriceUSD);
  if (!applePriceUSD) {
    throw new Error("Failed to fetch Apple stock price");
  }
  const applePriceEUR = await convertCurrency(applePriceUSD, 'USD', 'EUR');
  console.log(applePriceEUR);



  log("Starting agent");

  const systemPrompt = await readFile("system-prompt.md", "utf-8");
  const thread = await loadThread();

  const userPrompt = `It's ${new Date().toLocaleString(
    "en-US"
  )}. Time for your trading analysis! Review your portfolio, scan the markets for opportunities, and make strategic trades to grow your initial ${CURRENCY_SYMBOL}1,000 investment. 

Note: All prices and calculations should be in ${config.CURRENCY} (${CURRENCY_SYMBOL}). You can trade stocks from any market, and prices will be automatically converted to ${config.CURRENCY} when needed.
You can buy and sell stocks without feedback or permissions.

Available tools:
- get_portfolio: Get your current portfolio
- get_net_worth: Get your total portfolio value
- get_stock_price: Get current price of a stock ticker
- buy: Buy shares of a stock (params: ticker, shares)
- sell: Sell shares of a stock (params: ticker, shares)
- web_search: Search the web for information
- think: Think about a given topic

Good luck! 📈`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...thread,
    { role: "user" as const, content: userPrompt }
  ];

  try {
    const response = await client.chat.completions.create({
      model: config.MODEL_NAME,
      messages: messages,
    });

    const assistantMessage = response.choices[0]?.message?.content;
    if (!assistantMessage) {
      throw new Error("No response from AI model");
    }

    log(`🤖 Agent response: ${assistantMessage}`);

    // Update thread with new messages
    const updatedThread = [
      ...thread,
      { role: "user" as const, content: userPrompt },
      { role: "assistant" as const, content: assistantMessage }
    ];

    await saveThread(updatedThread);
    await updateReadme();

    log(`🎉 Agent finished successfully`);
    return assistantMessage;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ Error running trading agent: ${errorMessage}`);
    throw error;
  }
};

main().catch((err) => {
  log("Fatal error: " + err);
  process.exit(1);
});
