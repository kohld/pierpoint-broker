// This file contains type definitions for your data.
// It describes the shape of the data, and what data type each property should accept.
export type Portfolio = {
    cash: number;
    holdings: Record<string, number>;
    history: Array<{
        date: string;
        type: "buy" | "sell";
        ticker: string;
        shares: number;
        price: number;
        total: number;
    }>;
};