# Nosana Builders Challenge: Agents 102 – Full-Stack Agent App

This repository contains a production-ready monorepo with:

- Mastra agent with custom tools
- MCP server exposing tools/resources
- Next.js UI with live interaction
- Docker + Nosana job definition

Quickstart

- pnpm i (local)
- cp .env.example .env
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
