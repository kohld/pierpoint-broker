/**
 * @file agent.ts
 * @author Dennes Kohl
 * @description Main logic for the Pierpoint Broker agent.
 * @license MIT
 * @copyright 2025 Dennes Kohl
 */

//External dependencies
import "dotenv/config";
import { Agent, AgentInputItem, run } from "@openai/agents";
// Node-Builtins
import { existsSync } from "fs";
import { readFile, writeFile } from "node:fs/promises";
// Custom codebase
import {
  log,
  config,
  CURRENCY_SYMBOL,
  calculatePortfolioValue,
  getPortfolio,
} from "./lib/core";
import {
  thinkTool,
  webSearchTool,
  buyTool,
  sellTool,
  getStockPriceTool,
  getPortfolioTool,
  getNetWorthTool,
} from "./lib/tools";

/**
 * Checks for the existence of 'thread.json' and, if found, resets its content to an empty JSON array.
 * This function primarily prepares or cleans up the thread file rather than loading its content.
 *
 * @returns {Promise<AgentInputItem[]>} A Promise that always resolves to an empty array,
 *                                      as this function does not currently load data.
 */
export const loadThread = async (): Promise<AgentInputItem[]> => {
  try {
    if (existsSync("thread.json")) {
      await writeFile("thread.json", "[\n\n]");
      log("🧹 thread.json was resetted during loading.");
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
export const saveThread = async (thread: AgentInputItem[]) => {
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
export const updateReadme = async () => {
  try {
    const portfolio = await getPortfolio();
    const { totalValue, holdings } = await calculatePortfolioValue();
    const readmeContent = await readFile("README.md", "utf-8");
    const recentTrades = portfolio.history.slice(-20).reverse();
    const portfolioSection = `<!-- auto start -->

## Portfolio value: ${totalValue.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${CURRENCY_SYMBOL} | ${(
      ((totalValue - 1000) / 1000) *
      100
    ).toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}% return

### Holdings

| Asset | Shares | Value |
|-------|--------|-------|
| Cash | - | ${portfolio.cash.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY_SYMBOL} |
${Object.entries(holdings)
  .map(
    ([ticker, data]) =>
      `| ${ticker} | ${data.shares} | ${data.value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${CURRENCY_SYMBOL} |`,
  )
  .join("\n")}

### Recent trades

${
  recentTrades.length > 0
    ? recentTrades
        .map(
          (trade) =>
            `- **${new Date(trade.date).toLocaleString("en-US", {
              timeZone: "UTC",
              dateStyle: "long",
              timeStyle: "medium",
            })}**: ${trade.type.toUpperCase()} ${trade.shares} ${
              trade.ticker
            } @ ${trade.price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL}/share (${trade.total.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL})`,
        )
        .join("\n")
    : "- No trades yet"
}

<!-- auto end -->`;

    const updatedReadme = readmeContent.replace(
      /<!-- auto start -->[\s\S]*<!-- auto end -->/,
      portfolioSection,
    );

    await writeFile("README.md", updatedReadme);
    log(
      `📝 Updated README with portfolio value: ${totalValue.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${CURRENCY_SYMBOL}}`,
    );
  } catch (error) {
    log(`❌ Failed to update README: ${error}`);
  }
};

/**
 * Creates a new agent instance.
 *
 * @returns {Promise<Agent>} A new agent instance.
 */
export const createAgent = async (): Promise<Agent> => {
  const instructions = await readFile("system-prompt.md", "utf-8");
  return new Agent({
    name: "Assistant",
    instructions,
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
};

export const runAgent = async () => {
  log("Starting agent");

  const agent = await createAgent();
  const thread = await loadThread();
  const result = await run(
    agent,
    thread.concat({
      role: "user",
      content: `It's ${new Date().toLocaleString(
        "en-US",
      )}. Time for your trading analysis! Review your portfolio, scan the markets for opportunities, and make strategic trades to grow your initial $1,000 investment. Good luck! 📈`,
    }),
    { maxTurns: config.MAX_TURNS },
  );

  log(`🎉 Agent finished: ${result.finalOutput}`);

  await saveThread(result.history);
  await updateReadme();
};
