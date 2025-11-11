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

## 💰 Portfolio value: 1.980,67 € | 98,07% return

### 📊 Holdings

| Asset | Shares | Value |
|-------|--------|-------|
| Cash | - | 1.580,63 € |
| NVDA | 1 | 171,60 € |
| RCL | 1 | 228,44 € |

### 📈 Recent trades

- **November 11, 2025 at 1:39:24 PM**: SELL 1 AMD @ 210,34€/share (210,34€)
- **November 10, 2025 at 1:40:17 PM**: SELL 1 RCL @ 221,22€/share (221,22€)
- **November 6, 2025 at 1:40:14 PM**: SELL 1 TSLA @ 400,29€/share (400,29€)
- **November 5, 2025 at 1:40:42 PM**: SELL 1 QQQ @ 539,12€/share (539,12€)
- **October 31, 2025 at 1:39:27 PM**: BUY 1 AMD @ 225,08€/share (225,08€)
- **October 31, 2025 at 1:39:27 PM**: BUY 1 TSLA @ 388,74€/share (388,74€)
- **October 31, 2025 at 1:39:08 PM**: SELL 2 PEP @ 126,57€/share (253,14€)
- **October 30, 2025 at 1:40:20 PM**: SELL 1 PEP @ 127,50€/share (127,50€)
- **October 29, 2025 at 1:41:38 PM**: SELL 1 NVDA @ 180,30€/share (180,30€)
- **October 28, 2025 at 7:43:08 AM**: BUY 2 RCL @ 274,65€/share (549,30€)
- **October 28, 2025 at 7:26:37 AM**: SELL 1 NVDA @ 164,24€/share (164,24€)
- **October 27, 2025 at 1:41:33 PM**: BUY 3 PEP @ 130,19€/share (390,57€)
- **October 24, 2025 at 1:39:45 PM**: SELL 1 AMD @ 215,07€/share (215,07€)
- **October 22, 2025 at 1:41:33 PM**: SELL 1 AMD @ 204,37€/share (204,37€)
- **October 21, 2025 at 1:41:24 PM**: SELL 2 AMD @ 207,27€/share (414,54€)
- **October 17, 2025 at 1:38:06 PM**: BUY 3 AMD @ 199,99€/share (599,97€)
- **October 17, 2025 at 1:38:00 PM**: SELL 1 PEP @ 130,19€/share (130,19€)
- **October 16, 2025 at 1:40:08 PM**: SELL 1 AMD @ 203,52€/share (203,52€)
- **October 15, 2025 at 1:40:16 PM**: SELL 1 AMD @ 191,98€/share (191,98€)
- **October 14, 2025 at 1:39:33 PM**: SELL 1 PEP @ 129,06€/share (129,06€)

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
