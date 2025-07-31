# Pierpoint Broker

> People are our capital

An autonomous AI-powered stock trading agent that executes trades on GitHub Actions.

[![CI](https://github.com/kohld/pierpoint-broker/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/kohld/pierpoint-broker/actions/workflows/test.yml)

## Table of Contents

- [Portfolio value](#-portfolio-value)
  - [Holdings](#-holdings)
  - [Recent trades](#-recent-trades)
- [Installation](#installation)
- [Running the agent](#running-the-agent)
  - [Local execution](#local-execution)
  - [Automated execution via GitHub Actions](#automated-execution-via-github-actions)
    - [IMPORTANT: Free model selection for OpenRouter](#important-free-model-selection-for-openrouter)
- [Disclaimer](#disclaimer)
- [License](#license)

<!-- auto start -->

## 💰 Portfolio value: 1.965,96 € | 96,60% return

### 📊 Holdings

| Asset | Shares | Value |
|-------|--------|-------|
| Cash | - | 65,50 € |
| NVDA | 2 | 313,68 € |
| AAPL | 1 | 182,90 € |
| TSLA | 2 | 558,26 € |
| DAL | 10 | 468,90 € |
| TER | 4 | 376,72 € |

### 📈 Recent trades

- **July 31, 2025 at 1:00:08 PM**: BUY 1 TER @ 94,17€/share (94,17€)
- **July 31, 2025 at 12:59:50 PM**: SELL 4 KLG @ 20,10€/share (80,40€)
- **July 31, 2025 at 7:26:33 AM**: BUY 3 TER @ 94,05€/share (282,15€)
- **July 29, 2025 at 12:44:26 PM**: SELL 1 TSLA @ 282,25€/share (282,25€)
- **July 17, 2025 at 1:11:29 PM**: BUY 1 NVDA @ 147,76€/share (147,76€)
- **July 17, 2025 at 1:11:28 PM**: BUY 2 TSLA @ 277,34€/share (554,68€)
- **July 17, 2025 at 1:11:28 PM**: SELL 4 KLG @ 19,99€/share (79,96€)
- **July 11, 2025 at 10:04:25 AM**: BUY 10 DAL @ 48,54€/share (485,40€)
- **July 11, 2025 at 10:04:25 AM**: SELL 8 KLG @ 19,54€/share (156,32€)
- **July 11, 2025 at 9:39:55 AM**: SELL 1 MP @ 38,69€/share (38,69€)
- **July 11, 2025 at 9:29:06 AM**: SELL 7 NVDA @ 140,42€/share (982,94€)
- **July 11, 2025 at 9:25:36 AM**: BUY 16 KLG @ 19,55€/share (312,80€)
- **July 11, 2025 at 9:25:31 AM**: BUY 7 NVDA @ 140,37€/share (982,59€)
- **July 11, 2025 at 9:12:53 AM**: SELL 11 MP @ 38,69€/share (425,59€)
- **July 11, 2025 at 8:38:57 AM**: BUY 11 MP @ 38,69€/share (425,59€)
- **July 11, 2025 at 8:38:57 AM**: SELL 1 NVDA @ 140,39€/share (140,39€)
- **July 11, 2025 at 8:24:09 AM**: SELL 1 NVDA @ 164,10€/share (164,10€)
- **July 9, 2025 at 1:07:10 PM**: BUY 1 TSLA @ 254,18€/share (254,18€)
- **July 9, 2025 at 1:07:09 PM**: SELL 2 NVDA @ 136,56€/share (273,12€)
- **July 8, 2025 at 1:25:18 PM**: BUY 4 NVDA @ 135,17€/share (540,68€)

<!-- auto end -->

- [🧠 Logs](./agent.log)
- [🧑‍💻 System prompt](./system-prompt.md)
- [📁 Source code](./agent.ts)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/kohld/pierpoint-broker.git
cd pierpoint-broker
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Run the agent:

```bash
npm start
```

## Running the agent

The agent's portfolio is stored in `portfolio.json`:

```json
{
  "cash": 95.44,
  "holdings": {
    "AAPL": 4,
    "CLNE": 56
  },
  "history": [
    {
      "date": "2025-06-21T12:43:07.141Z",
      "type": "buy",
      "ticker": "AAPL",
      "shares": 4,
      "price": 201.5,
      "total": 806
    }
  ]
}
```

- **cash**: Available cash balance for trading
- **holdings**: Current stock positions (ticker: number of shares)
- **history**: Complete record of all trades

### Local execution

Run the trading agent manually:

```bash
npm start
```

This will execute one trading session where the agent will:

1. Check the current portfolio
2. Analyze market conditions
3. Make trading decisions
4. Update the portfolio

### Automated execution via GitHub Actions

The agent is configured to run automatically on weekdays during stock market hours via GitHub Actions. To enable this:

1. Fork this repository
2. Go to Settings → Secrets and variables → Actions
3. Add a new repository secret named `OPEN_ROUTER_API_KEY` with your OpenRouter API key or OpenAI API key `OPENAI_API_KEY` (e.g. `sk-...`)
4. Add a new repository secret named `MODEL_NAME` with your model name (e.g. `openai/gpt-4.1`)
5. Add a new repository secret named `CURRENCY` with your currency (default: `EUR`)
6. Add a new repository secret named `ORDER_FEE` with your order fee (default: `1.00`)
7. The agent will now run automatically on weekdays during stock market hours

You can also trigger a manual run from the Actions tab in your GitHub repository.

---

#### **IMPORTANT: Free model selection for OpenRouter**

> **WARNING:**
>
> To use this project with OpenRouter, you **must** select a model that supports tools! If you choose a model that does **not** support tools, your API requests will fail with a `404` error.
>
> **Please check the list of supported models here:**
> [https://openrouter.ai/models/?supported_parameters=tools](https://openrouter.ai/models/?supported_parameters=tools)
>
> Ensure your `MODEL_NAME` matches one of these models.

---

## Disclaimer

This is an experimental AI trading agent for educational purposes. Real trading involves significant risk. Never invest money you cannot afford to lose.

## License

The idea and foundational components of this project are based on work by [Anand Chowdhary](https://anandchowdhary.com) and the [priced-in](https://github.com/AnandChowdhary/priced-in) project. The original project is also distributed under the MIT License. This project continues to honor the terms and spirit of the MIT License as applied to both the original and derivative works.

[MIT](./LICENSE) © [Dennes Kohl](https://kohld.github.io/)
