# Cortex — AI Software Engineering Company

> Multi-agent AI orchestration system that simulates a full software engineering company.

## Overview

Cortex takes a **natural language product idea**, allocates a team of specialized AI bots (Leads and Developers), and generates a fully architected, styled, and deployable codebase.

Cortex is optimized for complex applications (like Kanban boards and CRMs) using advanced memory management and the **Gemini 3.x Flash** line.

## Key Features & Optimizations

- **Intelligent Context Compression**: Reduces token waste by extracting signatures and typings from generated code files rather than passing raw source code between bots.
- **Semantic Past Project Memory**: Uses TF-IDF cosine similarity to recall past successful builds and learn from prior architectural decisions.
- **Model Tiering Architecture**: Routes complex architectural decisions to the "Leader" model (`gemini-3-flash-preview`) and bulk generation tasks to the faster/cheaper "General" model (`gemini-3.1-flash-lite-preview`).
- **Strict JSON-Schema Contracts**: Bot-to-bot communication is strictly typed and validated using Zod, with automatic LLM self-correction loops on failure.
- **Vercel/Linear UI Aesthetic**: The frontend interface uses a deep dark mode, minimal glassmorphism, and subtle interactive glows.

## The Pipeline

1. **Strategic Planning** — (Product Owner, Doc Gen, Tech Stack, Resource Planner)
2. **Architecture & Leadership** — (Frontend Lead, Backend Lead, Database Lead, QA Lead)
3. **Execution & Generation** — (Frontend Devs, Backend Devs, Data Devs, QA Devs, DevOps)
4. **Final Review** — (Principal Engineer CTO Review — acts as a hard gate requiring a 7/10 score to pass)


## Bots Architecture/Functionalities

1. **Product Owner Bot** — Converts idea → epics, user stories, acceptance criteria
2. **Tech Stack Selector** — Chooses frontend/backend/infra/DB/auth strategy
3. **Resource Planner** — Allocates the right number of engineering bots
4. **Frontend Bot(s)** — Designs component architecture, routing, state management
5. **Backend Bot(s)** — Designs API, database schema, auth, services
6. **QA Planning Bot** — Generates test strategy and test cases
7. **QA Execution Bot** — Reviews architecture for gaps, risks, security issues
8. **DevOps Bot** — Designs CI/CD, Docker, deployment, monitoring
9. **Leader Bot** — Principal Engineer review with scoring and approval gate
10. **Project Bundle Bot** — Combines all outputs into a single bundle
11. **Documentation Bot** — Generates documentation from the prompt / user input for the project

## Quick Start (Web Interface)

```bash
# 1. Install dependencies
npm install

# 2. Configure your LLM API key
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (or OPENAI_API_KEY/DEEPSEEK_API_KEY)

# 3. Run with a product idea
npx tsx src/index.ts "Build a SaaS HR management system"

# Or run interactively
npx tsx src/index.ts
```

## Supported LLM Providers

| Provider | Env Variable | Default Model |
|----------|-------------|---------------|
| **Gemini** | `GEMINI_API_KEY` | `gemini-2.0-flash` |
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4o` |
| **DeepSeek** | `DEEPSEEK_API_KEY` | `deepseek-chat` |

## Output

Results are saved to `./output/<project-id>/` as JSON files:

- `product-owner.json` — Product spec
- `tech-stack.json` — Technology choices
- `resource-planner.json` — Bot allocation
- `frontend.json` — Frontend architecture
- `backend.json` — Backend architecture
- `qa-planning.json` — Test strategy
- `qa-execution.json` — QA review
- `devops.json` — Infrastructure design
- `leader.json` — Final review with score
- `project-bundle.json` — Everything combined

## Architecture

```
User Input → Orchestrator (CEO)
                ├── Step 1: Product Owner Bot
                ├── Step 2: Tech Stack Selector Bot
                ├── Step 3: Resource Planner Bot
                ├── Step 4: [Parallel] FE + BE + QA Planning Bots
                ├── Step 5: QA Execution Bot
                ├── Step 6: DevOps Bot
                └── Step 7: Leader Bot (approval gate, score ≥ 7)
```

## Business Rules

- **No direct bot-to-bot communication** — All data flows through the Orchestrator
- **Schema enforcement** — Every bot output is validated via Zod schemas
- **Leader approval required** — Score must be ≥ 7/10 to approve
- **Auto-retry** — Up to 3 retries on validation failure with self-correction
- **Correction loops** — Up to 2 re-reviews if leader rejects
