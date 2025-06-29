import dotenv from 'dotenv';
dotenv.config();

import { existsSync } from "fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import OpenAI from "openai";
import invariant from "tiny-invariant";
import yahooFinance from "yahoo-finance2";
import { z } from "zod";


invariant(process.env.OPEN_ROUTER_API_KEY, "OPEN_ROUTER_API_KEY is not set");
invariant(process.env.MODEL_NAME, "MODEL_NAME is not set");

console.log("Starting Pierpoint Broker");
