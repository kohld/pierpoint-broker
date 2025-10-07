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

## 💰 Portfolio value: 1.941,42 € | 94,14% return

### 📊 Holdings

| Asset | Shares | Value |
|-------|--------|-------|
| Cash | - | 698,92 € |
| NVDA | 3 | 480,51 € |
| QQQ | 1 | 522,33 € |
| PEP | 2 | 239,66 € |

### 📈 Recent trades

- **October 7, 2025 at 1:40:03 PM**: SELL 1 NVDA @ 160,19€/share (160,19€)
- **October 6, 2025 at 1:38:41 PM**: SELL 1 QQQ @ 519,76€/share (519,76€)
- **October 3, 2025 at 1:36:09 PM**: BUY 2 NVDA @ 161,73€/share (323,46€)
- **October 2, 2025 at 1:36:31 PM**: SELL 1 NVDA @ 162,31€/share (162,31€)
- **September 24, 2025 at 1:38:17 PM**: SELL 1 NVDA @ 152,48€/share (152,48€)
- **September 22, 2025 at 1:38:44 PM**: BUY 1 QQQ @ 507,99€/share (507,99€)
- **September 19, 2025 at 1:37:45 PM**: SELL 3 NVDA @ 150,17€/share (450,51€)
- **September 18, 2025 at 1:37:48 PM**: BUY 2 NVDA @ 147,94€/share (295,88€)
- **September 18, 2025 at 1:37:19 PM**: SELL 2 AMD @ 128,50€/share (257,00€)
- **September 12, 2025 at 1:36:30 PM**: BUY 2 NVDA @ 151,14€/share (302,28€)
- **September 12, 2025 at 1:36:19 PM**: SELL 1 AMD @ 133,67€/share (133,67€)
- **September 11, 2025 at 1:35:47 PM**: SELL 1 NVDA @ 152,39€/share (152,39€)
- **September 10, 2025 at 1:36:59 PM**: BUY 3 AMD @ 137,06€/share (411,18€)
- **September 9, 2025 at 7:57:58 AM**: BUY 2 PEP @ 120,54€/share (241,08€)
- **September 9, 2025 at 7:57:58 AM**: SELL 2 NVDA @ 143,16€/share (286,32€)
- **September 8, 2025 at 1:38:53 PM**: SELL 1 AMD @ 128,08€/share (128,08€)
- **September 5, 2025 at 1:36:22 PM**: SELL 1 AMD @ 131,59€/share (131,59€)
- **September 3, 2025 at 1:36:57 PM**: BUY 3 NVDA @ 145,81€/share (437,43€)
- **September 3, 2025 at 1:36:46 PM**: SELL 5 GILD @ 96,53€/share (482,65€)
- **August 28, 2025 at 1:38:45 PM**: BUY 1 AMD @ 145,15€/share (145,15€)

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
