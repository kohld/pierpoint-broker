import { mock, describe, it, expect, beforeEach } from "bun:test";

process.env.OPENAI_API_KEY = "test_key";

// Create mock functions
const mockQuoteFn = mock(() => Promise.resolve({ regularMarketPrice: 150.0 }));

const mockReadFile = mock(() => Promise.resolve("{}"));
const mockWriteFile = mock(() => Promise.resolve());

// Mock modules BEFORE importing anything that uses them
mock.module("fs/promises", () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  appendFile: mock(() => Promise.resolve()),
}));

mock.module("fs", () => ({
  existsSync: mock(() => true),
}));

mock.module("yahoo-finance2", () => ({
  default: class {
    quote = mockQuoteFn;
  },
}));

mock.module("../lib/utils", () => ({
  convertCurrency: mock((price: number) => Promise.resolve(price)),
}));

mock.module("openai", () => ({
  default: class {
    responses = { create: mock(() => Promise.resolve({})) };
  },
}));

mock.module("@openai/agents", () => ({
  Agent: class {},
  run: mock(() => Promise.resolve()),
  tool: (t: unknown) => t,
}));

// NOW import the modules that depend on the mocks
import { getStockPrice, getPortfolio, calculateNetWorth } from "../lib/core";
import { buyTool, sellTool } from "../lib/tools";
import { Portfolio } from "../lib/definitions";

// TODO: Rewrite tests with proper dependency injection for Bun compatibility
// Bun's mock.module() doesn't work well with already-imported modules
describe.skip("Agent Tests", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockQuoteFn.mockClear();
    mockReadFile.mockClear();
    mockWriteFile.mockClear();
  });

  describe("getStockPrice", () => {
    it("should return the stock price", async () => {
      mockQuoteFn.mockImplementation(() =>
        Promise.resolve({ regularMarketPrice: 150.0 }),
      );

      const price = await getStockPrice("AAPL");
      expect(price).toBe(150.0);
    });

    it("should throw an error if fetching fails", async () => {
      mockQuoteFn.mockImplementation(() =>
        Promise.resolve({ regularMarketPrice: undefined }),
      );

      await expect(getStockPrice("AAPL")).rejects.toThrow(
        "Failed to fetch stock price",
      );
    });
  });

  describe("getPortfolio", () => {
    it("should return the portfolio", async () => {
      const mockPortfolio: Portfolio = {
        cash: 1000,
        holdings: {},
        history: [],
      };
      mockReadFile.mockImplementation(() =>
        Promise.resolve(JSON.stringify(mockPortfolio)),
      );

      const portfolio = await getPortfolio();
      expect(portfolio).toEqual(mockPortfolio);
    });
  });

  describe("calculateNetWorth", () => {
    it("should calculate the net worth", async () => {
      const mockPortfolio: Portfolio = {
        cash: 1000,
        holdings: { AAPL: 10 },
        history: [],
      };
      mockReadFile.mockImplementation(() =>
        Promise.resolve(JSON.stringify(mockPortfolio)),
      );
      mockQuoteFn.mockImplementation(() =>
        Promise.resolve({ regularMarketPrice: 150.0 }),
      );

      const netWorth = await calculateNetWorth();
      expect(netWorth).toBe(2500); // 1000 (cash) + 10 * 150 (holdings)
    });
  });

  describe("buyTool", () => {
    it("should buy a stock and update the portfolio", async () => {
      const mockPortfolio: Portfolio = {
        cash: 2000,
        holdings: {},
        history: [],
      };
      mockReadFile.mockImplementation(() =>
        Promise.resolve(JSON.stringify(mockPortfolio)),
      );
      mockQuoteFn.mockImplementation(() =>
        Promise.resolve({ regularMarketPrice: 150.0 }),
      );

      const result = await (
        buyTool as unknown as {
          execute: (args: {
            ticker: string;
            shares: number;
          }) => Promise<string>;
        }
      ).execute({
        ticker: "AAPL",
        shares: 10,
      });
      expect(result).toContain("Purchased 10 shares of AAPL");
      expect(mockWriteFile).toHaveBeenCalled();

      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(writtenData.cash).toBe(500);
      expect(writtenData.holdings.AAPL).toBe(10);
    });

    it("should return an error for insufficient funds", async () => {
      const mockPortfolio: Portfolio = {
        cash: 1000,
        holdings: {},
        history: [],
      };
      mockReadFile.mockImplementation(() =>
        Promise.resolve(JSON.stringify(mockPortfolio)),
      );
      mockQuoteFn.mockImplementation(() =>
        Promise.resolve({ regularMarketPrice: 150.0 }),
      );

      const result = await (
        buyTool as unknown as {
          execute: (args: {
            ticker: string;
            shares: number;
          }) => Promise<string>;
        }
      ).execute({
        ticker: "AAPL",
        shares: 10,
      });
      expect(result).toContain("You don't have enough cash");
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });

  describe("sellTool", () => {
    it("should sell a stock and update the portfolio", async () => {
      const mockPortfolio: Portfolio = {
        cash: 500,
        holdings: { AAPL: 10 },
        history: [],
      };
      mockReadFile.mockImplementation(() =>
        Promise.resolve(JSON.stringify(mockPortfolio)),
      );
      mockQuoteFn.mockImplementation(() =>
        Promise.resolve({ regularMarketPrice: 200.0 }),
      );

      const result = await (
        sellTool as unknown as {
          execute: (args: {
            ticker: string;
            shares: number;
          }) => Promise<string>;
        }
      ).execute({
        ticker: "AAPL",
        shares: 5,
      });
      expect(result).toContain("Sold 5 shares of AAPL");
      expect(mockWriteFile).toHaveBeenCalled();

      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(writtenData.cash).toBe(1500);
      expect(writtenData.holdings.AAPL).toBe(5);
    });

    it("should return an error for insufficient shares", async () => {
      const mockPortfolio: Portfolio = {
        cash: 1000,
        holdings: { AAPL: 5 },
        history: [],
      };
      mockReadFile.mockImplementation(() =>
        Promise.resolve(JSON.stringify(mockPortfolio)),
      );

      const result = await (
        sellTool as unknown as {
          execute: (args: {
            ticker: string;
            shares: number;
          }) => Promise<string>;
        }
      ).execute({
        ticker: "AAPL",
        shares: 10,
      });
      expect(result).toContain("You don't have enough shares");
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
