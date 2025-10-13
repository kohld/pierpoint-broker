// This file contains type definitions for your data.
// It describes the shape of the data, and what data type each property should accept.
import { z } from "zod";

export const portfolioSchema = z.object({
  cash: z.number(),
  holdings: z.record(z.string(), z.number()),
  history: z.array(
    z.object({
      date: z.string().datetime(),
      type: z.enum(["buy", "sell"]),
      ticker: z.string(),
      shares: z.number(),
      price: z.number(),
      total: z.number(),
    }),
  ),
});

export type Portfolio = z.infer<typeof portfolioSchema>;
