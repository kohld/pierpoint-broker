import { Portfolio } from "../lib/definitions";

describe("Portfolio type definition", () => {
    it("should allow an empty portfolio", () => {
        const emptyPortfolio: Portfolio = {
            cash: 0,
            holdings: {},
            history: [],
        };
        expect(emptyPortfolio.cash).toBe(0);
        expect(Object.keys(emptyPortfolio.holdings)).toHaveLength(0);
        expect(emptyPortfolio.history).toHaveLength(0);
    });

    it("should handle portfolio with no history", () => {
        const noHistoryPortfolio: Portfolio = {
            cash: 500,
            holdings: { MSFT: 20 },
            history: [],
        };
        expect(noHistoryPortfolio.history).toEqual([]);
        expect(noHistoryPortfolio.holdings["MSFT"]).toBe(20);
    });

    it("should allow multiple holdings and history entries", () => {
        const multiPortfolio: Portfolio = {
            cash: 2000,
            holdings: { GOOG: 3, AMZN: 7, NFLX: 2 },
            history: [
                {
                    date: "2025-07-01",
                    type: "buy",
                    ticker: "GOOG",
                    shares: 3,
                    price: 2800,
                    total: 8400,
                },
                {
                    date: "2025-07-02",
                    type: "buy",
                    ticker: "AMZN",
                    shares: 7,
                    price: 3500,
                    total: 24500,
                },
                {
                    date: "2025-07-03",
                    type: "sell",
                    ticker: "NFLX",
                    shares: 1,
                    price: 500,
                    total: 500,
                },
            ],
        };
        expect(Object.keys(multiPortfolio.holdings)).toEqual(["GOOG", "AMZN", "NFLX"]);
        expect(multiPortfolio.history[2].type).toBe("sell");
        expect(multiPortfolio.history[1].ticker).toBe("AMZN");
    });

    it("should have correct types for history entries", () => {
        const testPortfolio: Portfolio = {
            cash: 100,
            holdings: { IBM: 1 },
            history: [
                {
                    date: "2025-07-08",
                    type: "buy",
                    ticker: "IBM",
                    shares: 1,
                    price: 100,
                    total: 100,
                },
            ],
        };
        const entry = testPortfolio.history[0];
        expect(typeof entry.date).toBe("string");
        expect(["buy", "sell"]).toContain(entry.type);
        expect(typeof entry.ticker).toBe("string");
        expect(typeof entry.shares).toBe("number");
        expect(typeof entry.price).toBe("number");
        expect(typeof entry.total).toBe("number");
    });
    it("should allow valid Portfolio objects", () => {
        const validPortfolio: Portfolio = {
            cash: 1000,
            holdings: {
                AAPL: 10,
                TSLA: 5,
            },
            history: [
                {
                    date: "2025-07-08",
                    type: "buy",
                    ticker: "AAPL",
                    shares: 10,
                    price: 150,
                    total: 1500,
                },
                {
                    date: "2025-07-09",
                    type: "sell",
                    ticker: "TSLA",
                    shares: 2,
                    price: 700,
                    total: 1400,
                },
            ],
        };
        expect(validPortfolio.cash).toBe(1000);
        expect(validPortfolio.holdings["AAPL"]).toBe(10);
        expect(validPortfolio.history[0].type).toBe("buy");
    });
});
