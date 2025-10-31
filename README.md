# Nosana Builders Challenge: Agents 102 – Full-Stack Agent App 🏆

A production-ready, professional-grade AI agent application built for the Nosana Agents 102 Challenge. Features real-time synchronization, dual UI options, and complete Mastra framework integration.

## 🎯 Features

- **Mastra AI Agent** (`webResearchAgent`) with 2+ custom tools:
  - `fetchUrlTool` - Retrieve content from any public URL
  - `summarizeTool` - AI-powered text summarization using Nosana LLM
- **MCP Server** with tools and resource management:
  - `add_note` / `summarize_note` tools
  - Resource list/read for notes
- **Interactive Frontend** (Two Options):
  - **Custom UI** (`apps/ui`) - Modern interface with real-time SSE events
  - **CopilotKit UI** (`src/app`) - Framework-integrated agent interface
- **Live Synchronization** - Real-time event streaming via SSE
- **Docker + Nosana** - Ready for deployment

Quickstart

- pnpm i (local)
- Create .env with:
  - OLLAMA_API_URL=https://3yt39qx97wc9hqwwmylrphi4jsxrngjzxnjakkybnxbw.node.k8s.prd.nos.ci/api
  - MODEL_NAME_AT_ENDPOINT=Qwen3:8b
  - AGENT_PORT=4111
  - MCP_PORT=4122
  - UI_PORT=3000
- pnpm run dev:ui (UI on 3000)
- pnpm run dev:agent (Agent on 4111)
- pnpm run dev:mcp (MCP server)

Requirements Coverage

- Agent + custom tool calling (2+ tools)
- Frontend interface (Next.js)
- Deployed on Nosana (Docker + nos_job_def)
- Video demo, README, social post (see submission checklist)

References

- Blog: https://nosana.com/blog/agent_challenge_102/
- Starter Repo: https://github.com/nosana-ci/agent-challenge/
