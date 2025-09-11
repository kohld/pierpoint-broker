# AGENTS.md

## Project Overview

Pierpoint Broker is an autonomous AI-powered stock trading agent that executes trades automatically via GitHub Actions. The agent starts with €1000 and aims to multiply this capital through strategic trading decisions.

## Setup Commands

- Install dependencies: `npm install`
- Start agent locally: `npm start`
- Run tests: `npm test`
- Type check: `npx tsc --noEmit`

## Project Structure

- `agent.ts` - Main trading agent logic and tool definitions
- `run.ts` - Entry point for running the agent
- `system-prompt.md` - Agent instructions and trading strategy
- `portfolio.json` - Current portfolio state (cash, holdings, history)
- `lib/` - Utility functions and type definitions
  - `lib/definitions.ts` - TypeScript schemas and types
  - `lib/utils.ts` - Currency conversion and helper functions
- `tests/` - Test files for all modules
- `.github/workflows/` - GitHub Actions for automated trading

## Code Style & Standards

### Do
- Use TypeScript with strict mode enabled
- Use ES2022 modules (`import`/`export`)
- Use functional programming patterns where possible
- Follow existing code formatting and naming conventions
- Use proper JSDoc comments for functions
- Use `z.object()` schemas for tool parameters validation
- Handle errors gracefully with try/catch blocks
- Use `Math.round(value * 100) / 100` for currency precision
- Log important actions using the `log()` function
- Use German locale formatting for currency display: `toLocaleString("de-DE")`

### Don't
- Don't use CommonJS (`require`/`module.exports`)
- Don't hardcode API keys or sensitive data
- Don't modify portfolio.json directly - use the provided tools
- Don't create fractional share transactions
- Don't bypass the mandatory thinking process in agent logic
- Don't add heavy dependencies without justification

## Testing Guidelines

- Run single file tests: `npm test -- path/to/file.test.ts`
- All tests must pass before committing
- Test files should mirror the structure: `agent.test.ts` for `agent.ts`
- Use Jest with ES modules configuration
- Mock external APIs (Yahoo Finance, OpenAI) in tests

### Testing Strategy

- Write unit tests for all trading logic functions
- Mock external API calls in tests
- Test portfolio state management thoroughly
- Validate error handling scenarios
- Test GitHub Actions workflow changes in fork first
- Use test data that mirrors real portfolio structure

## Trading Agent Behavior

### Critical Requirements
- MUST use `think` tool before any other tool call
- MUST follow the decision framework in system-prompt.md
- Portfolio operations must maintain data integrity
- All trades are in whole shares only (no fractions)
- Each transaction incurs €1.00 order fee

### Tool Usage Patterns
```typescript
// Always start with thinking
await thinkTool.execute({ thought_process: ["Step 1", "Step 2"] });

// Then check portfolio
const portfolio = await getPortfolioTool.execute({});

// Research before trading
const marketData = await webSearchTool.execute({ query: "NVDA stock analysis" });

// Execute trades with proper validation
await buyTool.execute({ ticker: "NVDA", shares: 2 });
```

## Commands

### File-Specific Commands

```bash
# Type check single file
npx tsc --noEmit agent.ts

# Test single file
npm test -- agent.test.ts

# Run specific test pattern
npm test -- --testNamePattern="portfolio"

# Lint and format (if configured)
npx prettier --write agent.ts
```

### Project-wide commands (use sparingly)

```bash
# Full build
npm run build

# All tests
npm test

# Start the agent
npm start
```
## Environment Configuration

Required environment variables:
- `OPENAI_API_KEY` or `OPEN_ROUTER_API_KEY` - LLM API access
- `MODEL_NAME` - Model to use (e.g., "gpt-4o", "openai/gpt-4o")
- `CURRENCY` - Trading currency (default: "EUR")
- `ORDER_FEE` - Transaction fee (default: "1.00")

## Safety & Permissions

### Allowed without approval
- Read portfolio.json, system-prompt.md, and other project files
- Run type checking on single files
- Run unit tests
- Execute trading tools (buy/sell/get_portfolio)
- Web search for market data

### Ask first
- Installing new npm packages
- Modifying GitHub Actions workflows
- Changing core agent logic without testing
- Deleting files or major refactoring
- Pushing to main branch

## API Integration

### Yahoo Finance
- Stock price fetching via `yahoo-finance2` package
- Currency conversion for EUR/USD
- Error handling for invalid tickers

### OpenAI/OpenRouter
- Agent execution via `@openai/agents` package
- Tool calling with proper parameter validation
- Web search capabilities for market research

## Common Patterns

### Error Handling
```typescript
try {
    const price = await getStockPrice(ticker);
    // ... trading logic
} catch (error) {
    log(`⚠️ Failed to get price for ${ticker}: ${error}`);
    return "Error message for user";
}
```

### Portfolio Updates
```typescript
// Always read current state first
const portfolio = await getPortfolio();

// Modify state
portfolio.cash -= totalCost;
portfolio.holdings[ticker] = (portfolio.holdings[ticker] ?? 0) + shares;

// Save atomically
await writeFile("portfolio.json", JSON.stringify(portfolio, null, 2));
```

## GitHub Actions Integration

- Automated trading runs on weekdays during market hours
- Secrets management for API keys
- Automatic README updates with portfolio performance
- CI/CD pipeline with testing

## Performance Monitoring

- Track net worth vs initial €1000 investment
- Log all trades with timestamps
- Calculate return percentages
- Update README.md with current portfolio status

## Debugging Tips

- Check `agent.log` for execution history
- Verify `portfolio.json` structure matches schema
- Test individual tools before full agent runs
- Use `thread.json` for conversation history (auto-reset)

## PR Guidelines

- Title format: `[feature|fix|docs]: brief description`
- Run `npm test` before committing
- Include brief summary of changes
- Keep diffs focused and reviewable
- Trading logic includes proper validation
- No sensitive data in commits
- GitHub Actions tested if modified
- Update tests for modified functionality

## When Stuck

- Ask clarifying questions about trading logic requirements
- Propose implementation plan for complex features
- Reference existing code patterns before creating new ones
- Test with paper trading before real implementation
- Validate model compatibility before API integration

## Deployment Notes

- GitHub Actions runs automatically on weekdays during market hours
- Manual triggers available from Actions tab
- Portfolio state persists between runs via git commits
- Monitor logs for trading decisions and errors
- Ensure model selection supports function/tool calling

## Educational Purpose Disclaimer

This project is for educational and experimental purposes only. Always include proper risk disclaimers when modifying trading logic. Real trading involves significant financial risk.