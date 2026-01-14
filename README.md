# Pierpoint Broker

> People are our capital

An autonomous AI-powered stock trading agent that executes trades on GitHub Actions.

[![CI](https://github.com/kohld/pierpoint-broker/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/kohld/pierpoint-broker/actions/workflows/test.yml)

## Table of Contents

- [Portfolio value](#portfolio-value)
  - [Holdings](#holdings)
  - [Recent trades](#recent-trades)
- [Installation](#installation)
- [Running the agent](#running-the-agent)
  - [Local execution](#local-execution)
  - [Automated execution via GitHub Actions](#automated-execution-via-github-actions)
    - [IMPORTANT: Free model selection for OpenRouter](#important-free-model-selection-for-openrouter)
- [License](#license)
- [Legal Notice / Rechtlicher Hinweis](#legal-notice--rechtlicher-hinweis)

<!-- auto start -->

## Portfolio value: 1.889,91 € | 88,99% return

### Holdings

| Asset | Shares | Value |
|-------|--------|-------|
| Cash | - | 79,48 € |
| NVDA | 4 | 637,76 € |
| RCL | 2 | 500,64 € |
| AAPL | 3 | 672,03 € |

### Recent trades

- **January 14, 2026 at 1:43:36 PM**: BUY 3 AAPL @ 224,01€/share (672,03€)
- **January 13, 2026 at 1:43:58 PM**: SELL 1 AMZN @ 211,25€/share (211,25€)
- **January 12, 2026 at 1:43:52 PM**: SELL 1 RCL @ 266,36€/share (266,36€)
- **January 9, 2026 at 1:42:25 PM**: SELL 1 AMZN @ 211,34€/share (211,34€)
- **January 8, 2026 at 1:43:42 PM**: BUY 2 RCL @ 259,08€/share (518,16€)
- **January 8, 2026 at 1:43:42 PM**: BUY 3 NVDA @ 162,01€/share (486,03€)
- **January 7, 2026 at 1:43:51 PM**: SELL 1 AMZN @ 206,00€/share (206,00€)
- **January 5, 2026 at 1:43:42 PM**: SELL 1 NVDA @ 161,92€/share (161,92€)
- **December 29, 2025 at 1:42:25 PM**: SELL 1 RCL @ 242,68€/share (242,68€)
- **December 26, 2025 at 1:40:28 PM**: SELL 1 GOOGL @ 266,19€/share (266,19€)
- **December 24, 2025 at 1:40:24 PM**: SELL 1 NVDA @ 160,49€/share (160,49€)
- **December 23, 2025 at 1:41:54 PM**: BUY 1 AMZN @ 193,73€/share (193,73€)
- **December 22, 2025 at 1:41:28 PM**: SELL 1 NVDA @ 154,00€/share (154,00€)
- **December 18, 2025 at 1:42:14 PM**: BUY 2 NVDA @ 145,56€/share (291,12€)
- **December 17, 2025 at 1:41:23 PM**: SELL 1 GOOGL @ 261,38€/share (261,38€)
- **December 14, 2025 at 1:04:00 PM**: BUY 2 RCL @ 237,45€/share (474,90€)
- **December 14, 2025 at 1:03:55 PM**: SELL 8 INTC @ 32,20€/share (257,60€)
- **December 3, 2025 at 3:08:21 PM**: SELL 3 MRVL @ 85,25€/share (255,75€)

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
bun install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Run the agent:

```bash
bun start
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
bun start
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

## License

The idea and foundational components of this project are based on work by [Anand Chowdhary](https://anandchowdhary.com) and the [priced-in](https://github.com/AnandChowdhary/priced-in) project. The original project is also distributed under the MIT License. This project continues to honor the terms and spirit of the MIT License as applied to both the original and derivative works.

[MIT](./LICENSE) © [Dennes Kohl](https://kohld.github.io/)

---

## Legal Notice / Rechtlicher Hinweis

**No Investment Advice or Trading Recommendation**

This project is for educational, research, and experimental purposes only. The software, content, analyses, and automated trading decisions provided here do **not constitute investment advice, financial advice, trading recommendations, or solicitation to buy or sell securities**.

**Important Notes:**

- The author assumes no liability for financial losses resulting from the use of this software
- The software is provided "as is" without any warranty
- Any investment decision is made at your own risk
- No guarantee is given for the accuracy, completeness, or timeliness of the data
- Automated trading of securities can lead to significant losses
- This tool does not replace professional financial advice from licensed advisors

**Regulatory Notice:**

This project does not constitute a financial service within the meaning of the German Banking Act (KWG) or the Securities Trading Act (WpHG) and is not subject to supervision by the German Federal Financial Supervisory Authority (BaFin).

Users should seek independent professional advice before making any investment decisions and inform themselves about the applicable legal framework in their jurisdiction.

---

**Keine Anlageberatung oder Handelsempfehlung**

Dieses Projekt dient ausschließlich zu Bildungs-, Forschungs- und Experimentierzwecken. Die hier bereitgestellte Software, alle Inhalte, Analysen und automatisierten Handelsentscheidungen stellen **keine Anlageberatung, Finanzberatung, Handelsempfehlung oder Aufforderung zum Kauf oder Verkauf von Wertpapieren** dar.

**Wichtige Hinweise:**

- Der Autor übernimmt keine Haftung für finanzielle Verluste, die durch die Nutzung dieser Software entstehen
- Die Software wird "wie besehen" ohne jegliche Gewährleistung bereitgestellt
- Jede Investitionsentscheidung erfolgt auf eigenes Risiko
- Es wird keine Garantie für die Richtigkeit, Vollständigkeit oder Aktualität der Daten gegeben
- Der automatisierte Handel mit Wertpapieren kann zu erheblichen Verlusten führen
- Dieses Tool ersetzt keine professionelle Finanzberatung durch zugelassene Berater

**Regulatorischer Hinweis:**

Dieses Projekt stellt keine Finanzdienstleistung im Sinne des Kreditwesengesetzes (KWG) oder des Wertpapierhandelsgesetzes (WpHG) dar und unterliegt nicht der Aufsicht durch die Bundesanstalt für Finanzdienstleistungsaufsicht (BaFin).

Nutzer sollten vor jeder Investitionsentscheidung unabhängigen, professionellen Rat einholen und sich über die geltenden rechtlichen Rahmenbedingungen in ihrer Jurisdiktion informieren.
