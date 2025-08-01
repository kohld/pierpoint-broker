import { jest } from "@jest/globals";

process.env.OPENAI_API_KEY = "test_key";

import {
    getStockPrice,
    getPortfolio,
    calculateNetWorth,
    buyTool,
    sellTool,
} from "../agent";
import { Portfolio } from "../lib/definitions";
import yahooFinance from "yahoo-finance2";
import * as fs from 'fs/promises';

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedYahooFinance = yahooFinance as jest.Mocked<typeof yahooFinance>;

jest.mock('../agent', () => {
    const originalModule = jest.requireActual('../agent') as any;
    return {
        ...originalModule,
        runAgent: jest.fn(),
    };
});

jest.mock('fs/promises');
jest.mock('fs', () => ({
    existsSync: jest.fn(),
}));
jest.mock('yahoo-finance2');

jest.mock('../lib/utils', () => ({
    convertCurrency: jest.fn((price) => Promise.resolve(price)),
}));

jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        responses: {
            create: jest.fn(),
        },
    }));
});

jest.mock('@openai/agents', () => ({
    Agent: jest.fn(),
    run: jest.fn(),
    tool: jest.fn((t) => t),
}));


describe("Agent Tests", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe("getStockPrice", () => {
    it("should return the stock price", async () => {
        mockedYahooFinance.quote.mockResolvedValue({
            regularMarketPrice: 150.0,
        } as any);

      const price = await getStockPrice("AAPL");
      expect(price).toBe(150.0);
      expect(mockedYahooFinance.quote).toHaveBeenCalledWith("AAPL");
    });

    it("should throw an error if fetching fails", async () => {
        mockedYahooFinance.quote.mockResolvedValue({
            regularMarketPrice: undefined,
        } as any);

        await expect(getStockPrice("AAPL")).rejects.toThrow("Failed to fetch stock price");
    });
  });

  describe("getPortfolio", () => {
    it("should return the portfolio", async () => {
        const mockPortfolio: Portfolio = {
            cash: 1000,
            holdings: {},
            history: [],
        };
        mockedFs.readFile.mockResolvedValue(JSON.stringify(mockPortfolio) as any);

        const portfolio = await getPortfolio();
        expect(portfolio).toEqual(mockPortfolio);
        expect(mockedFs.readFile).toHaveBeenCalledWith("portfolio.json", "utf-8");
    });
  });

  describe("calculateNetWorth", () => {
    it("should calculate the net worth", async () => {
        const mockPortfolio: Portfolio = {
            cash: 1000,
            holdings: { "AAPL": 10 },
            history: [],
        };
        mockedFs.readFile.mockResolvedValue(JSON.stringify(mockPortfolio) as any);
        mockedYahooFinance.quote.mockResolvedValue({
            regularMarketPrice: 150.0,
        } as any);

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
      mockedFs.readFile.mockResolvedValue(JSON.stringify(mockPortfolio) as any);
      mockedYahooFinance.quote.mockResolvedValue({
        regularMarketPrice: 150.0,
      } as any);

      const result = await (buyTool as any).execute({ ticker: "AAPL", shares: 10 });
      expect(result).toContain("Purchased 10 shares of AAPL");
      expect(mockedFs.writeFile).toHaveBeenCalled();

      const writtenData = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
      expect(writtenData.cash).toBe(500);
      expect(writtenData.holdings.AAPL).toBe(10);
    });

    it("should return an error for insufficient funds", async () => {
        const mockPortfolio: Portfolio = {
            cash: 1000,
            holdings: {},
            history: [],
        };
        mockedFs.readFile.mockResolvedValue(JSON.stringify(mockPortfolio) as any);
        mockedYahooFinance.quote.mockResolvedValue({
            regularMarketPrice: 150.0,
        } as any);

        const result = await (buyTool as any).execute({ ticker: "AAPL", shares: 10 });
        expect(result).toContain("You don't have enough cash");
        expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe("sellTool", () => {
    it("should sell a stock and update the portfolio", async () => {
        const mockPortfolio: Portfolio = {
            cash: 500,
            holdings: { "AAPL": 10 },
            history: [],
        };
        mockedFs.readFile.mockResolvedValue(JSON.stringify(mockPortfolio) as any);
        mockedYahooFinance.quote.mockResolvedValue({
            regularMarketPrice: 200.0,
        } as any);

        const result = await (sellTool as any).execute({ ticker: "AAPL", shares: 5 });
        expect(result).toContain("Sold 5 shares of AAPL");
        expect(mockedFs.writeFile).toHaveBeenCalled();

        const writtenData = JSON.parse(mockedFs.writeFile.mock.calls[0][1] as string);
        expect(writtenData.cash).toBe(1500);
        expect(writtenData.holdings.AAPL).toBe(5);
    });

    it("should return an error for insufficient shares", async () => {
        const mockPortfolio: Portfolio = {
            cash: 1000,
            holdings: { "AAPL": 5 },
            history: [],
        };
        mockedFs.readFile.mockResolvedValue(JSON.stringify(mockPortfolio) as any);

        const result = await (sellTool as any).execute({ ticker: "AAPL", shares: 10 });
        expect(result).toContain("You don't have enough shares");
        expect(mockedFs.writeFile).not.toHaveBeenCalled();
    });
  });
});
