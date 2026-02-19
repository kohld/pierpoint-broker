# Skill: Karpathy Guidelines

## Metadata

| Property     | Value                 |
| ------------ | --------------------- |
| name         | `karpathy-guidelines` |
| version      | 1.0.0                 |
| framework    | Universal             |
| last_updated | 2026-02-13            |

## Context

These guidelines reduce common LLM coding mistakes, derived from Andrej Karpathy's observations about AI coding pitfalls.

**Key Premise:** "These guidelines bias toward caution over speed. For trivial tasks, use judgment."

---

## 1. Think Before Coding

**Principle:** "Don't assume. Don't hide confusion. Surface tradeoffs."

Before implementing:

- State assumptions explicitly; ask if uncertain
- Present multiple interpretations rather than choosing silently
- Suggest simpler approaches and push back when appropriate
- Stop and name confusion rather than proceeding blindly

## 2. Simplicity First

**Principle:** "Minimum code that solves the problem. Nothing speculative."

Practical guidance includes:

- Exclude unrequested features
- Avoid abstractions for single-use code
- Skip unnecessary flexibility or configurability
- Don't handle impossible error scenarios
- Rewrite if 200 lines could become 50

**The test:** "Would a senior engineer say this is overcomplicated?"

## 3. Surgical Changes

**Principle:** "Touch only what you must. Clean up only your own mess."

When editing existing code:

- Don't improve adjacent code, comments, or formatting
- Avoid refactoring unbroken functionality
- Match existing style preferences
- Flag unrelated dead code rather than removing it

When changes create orphans, remove only unused elements _you_ created.

**The test:** Every modified line should directly connect to the user's request.

## 4. Goal-Driven Execution

**Principle:** "Define success criteria. Loop until verified."

Transform vague tasks into specific, measurable goals using test-driven approaches. For multi-step work, outline plans with explicit verification checkpoints for each stage.

---

## Success Indicators

These guidelines work when they produce:

- Fewer unnecessary diff changes
- Fewer rewrites from overcomplication
- Clarifying questions precede implementation rather than following mistakes

---

**License:** MIT
**Source:** https://github.com/forrestchang/andrej-karpathy-skills
