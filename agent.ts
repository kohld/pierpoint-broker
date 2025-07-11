/**
 * @file agent.ts
 * @author Dennes Kohl
 * @description Main logic for the Pierpoint Broker agent.
 * @license MIT
 * @copyright 2025 Dennes Kohl
 */
//External dependencies
import "dotenv/config";
import { Agent, AgentInputItem, run, tool } from "@openai/agents";
import OpenAI from "openai";
import yahooFinance from "yahoo-finance2";
import { z } from "zod";
// Node-Builtins
import { existsSync } from "fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
// Custom codebase
import { convertCurrency } from "./lib/utils";
import { portfolioSchema, type Portfolio } from "./lib/definitions";

/**
 * Configuration variables for the broker agent.
 * These variables are required to be set in the .env file.
 *
 * @property {string} API_KEY - The API key for OpenAI.
 * @property {string} MODEL_NAME - The model name to use for the LLM.
 * @property {string} CURRENCY - The currency to use for the portfolio.
 * @property {string} CURRENCY_SYMBOL - The currency symbol to use for the portfolio.
 */
const config = {
    API_KEY: process.env.OPENAI_API_KEY,
    MODEL_NAME: process.env.MODEL_NAME || "gpt-4.1",
    CURRENCY: process.env.CURRENCY || "EUR",
    MAX_TURNS: 25,
};

if (!config.API_KEY) throw new Error("OPENAI_API_KEY is not set");
if (!config.MODEL_NAME) throw new Error("MODEL_NAME is not set");
const CURRENCY_SYMBOL = config.CURRENCY === "EUR" ? "€" : "$";

const client = new OpenAI();

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
 * Performs a web search to answer a user query.
 * 
 * @param {string} query - The user query to answer.
 * 
 * @returns {Promise<string>} A Promise that resolves to a short summary in markdown of what was found.
 * 
 * @throws If the web search fails.
 */
const webSearch = async (query: string): Promise<string> => {
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
const getStockPrice = async (ticker: string): Promise<number> => {
    const quote = await yahooFinance.quote(ticker);
    const priceUSD = quote.regularMarketPrice;

    if (!priceUSD) {
        throw new Error("Failed to fetch stock price");
    }
    const priceEUR = await convertCurrency(priceUSD, 'USD', 'EUR', yahooFinance, log);

    console.log(`Price of ${ticker}: $${priceUSD} (€${priceEUR})`);

    return priceEUR;
};

/**
 * Retrieves the current portfolio data from the portfolio.json file.
 * 
 * @returns {Promise<Portfolio>} A Promise that resolves to the current portfolio data.
 * 
 * @throws If the portfolio file cannot be read or parsed.
 */
const getPortfolio = async (): Promise<Portfolio> => {
    const portfolioData = await readFile("portfolio.json", "utf-8");
    const portfolio = portfolioSchema.parse(JSON.parse(portfolioData));
    return portfolio;
};

/**
 * Retrieves the current portfolio data and returns it as a formatted string.
 * 
 * @returns {Promise<string>} A Promise that resolves to a formatted string containing the current portfolio data.
 */
const getPortfolioTool = tool({
    name: "get_portfolio",
    description: "Get your portfolio",
    parameters: z.object({}),
    async execute() {
        const portfolio = await getPortfolio();
        log(`💹 Fetched portfolio: ${portfolio.cash.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL}`);
        return `Your cash balance is ${portfolio.cash.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL}.
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
});

/**
 * Retrieves the current net worth (total portfolio value) and returns it as a formatted string.
 * 
 * @returns {Promise<string>} A Promise that resolves to a formatted string containing the current net worth.
 */
const getNetWorthTool = tool({
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
            netWorth - 1000
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
const buyTool = tool({
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
            return `You don't have enough cash to buy ${shares} shares of ${ticker}. Your cash balance is ${portfolio.cash.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL} and the price is ${price.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL} per share.`;

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

        log(`💰 Purchased ${shares} shares of ${ticker} at ${price.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL} per share`);
        return `Purchased ${shares} shares of ${ticker} at $${price.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL} per share, for a total of $${shares * price
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
const sellTool = tool({
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

        log(`💸 Sold ${shares} shares of ${ticker} at ${price.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL} per share`);
        return `Sold ${shares} shares of ${ticker} at ${price.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL} per share, for a total of ${shares * price
            }. Your cash balance is now ${portfolio.cash.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL}.`;
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
const getStockPriceTool = tool({
    name: "get_stock_price",
    description: "Get the current price of a given stock ticker",
    parameters: z.object({
        ticker: z.string(),
    }),
    async execute({ ticker }) {
        const price = await getStockPrice(ticker);
        log(`🔖 Searched for stock price for ${ticker}: ${price.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL}`);
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
const webSearchTool = tool({
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
const thinkTool = tool({
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

/**
 * Calculates the current net worth (total portfolio value).
 * 
 * @returns {Promise<number>} A Promise that resolves to the current net worth.
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

    const netWorth =
        Math.round((portfolio.cash + totalHoldingsValue) * 100) / 100;
    return netWorth;
};

/**
 * Calculates the current portfolio value and returns it as a formatted string.
 * 
 * @returns {Promise<string>} A Promise that resolves to a formatted string containing the current portfolio value.
 */
const calculatePortfolioValue = async (): Promise<{
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

/**
 * Loads the conversation history from the thread.json file.
 * 
 * @returns {Promise<AgentInputItem[]>} A Promise that resolves to the conversation history.
 */
const loadThread = async (): Promise<AgentInputItem[]> => {
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
 * Saves the conversation history to the thread.json file.
 * 
 * @param {AgentInputItem[]} thread - The conversation history to save.
 */
const saveThread = async (thread: AgentInputItem[]) => {
    try {
        await writeFile("thread.json", JSON.stringify(thread, null, 2));
        log(`💾 Saved thread history (${thread.length} items)`);
    } catch (error) {
        log(`❌ Failed to save thread history: ${error}`);
    }
};

/**
 * Updates the README.md file with the current portfolio value and recent trades.
 */
const updateReadme = async () => {
    try {
        const portfolio = await getPortfolio();
        const { totalValue, holdings } = await calculatePortfolioValue();
        const readmeContent = await readFile("README.md", "utf-8");
        const recentTrades = portfolio.history.slice(-20).reverse();
        const portfolioSection = `<!-- auto start -->

## 💰 Portfolio value: ${totalValue.toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} ${CURRENCY_SYMBOL} | ${(((totalValue - 1000) / 1000) * 100).toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}% return

### 📊 Holdings

| Asset | Shares | Value |
|-------|--------|-------|
| Cash | - | ${portfolio.cash.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${CURRENCY_SYMBOL} |
${Object.entries(holdings)
                .map(
                    ([ticker, data]) =>
                        `| ${ticker} | ${data.shares} | ${data.value.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${CURRENCY_SYMBOL} |`
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
                            } @ ${trade.price.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL}/share (${trade.total.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL})`
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
        log(`📝 Updated README with portfolio value: ${totalValue.toLocaleString("de-DE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${CURRENCY_SYMBOL}}`);
    } catch (error) {
        log(`❌ Failed to update README: ${error}`);
    }
};

/**
 * Creates a new agent instance.
 * 
 * @returns {Agent} A new agent instance.
 */
const agent = new Agent({
    name: "Assistant",
    instructions: await readFile("system-prompt.md", "utf-8"),
    tools: [
        thinkTool,
        webSearchTool,
        buyTool,
        sellTool,
        getStockPriceTool,
        getPortfolioTool,
        getNetWorthTool,
    ],
});

log("Starting agent");

const thread = await loadThread();
const result = await run(
    agent,
    thread.concat({
        role: "user",
        content: `It's ${new Date().toLocaleString(
            "en-US"
        )}. Time for your trading analysis! Review your portfolio, scan the markets for opportunities, and make strategic trades to grow your initial $1,000 investment. Good luck! 📈`,
    }),
    { maxTurns: config.MAX_TURNS }
);

log(`🎉 Agent finished: ${result.finalOutput}`);

await saveThread(result.history);
await updateReadme();
