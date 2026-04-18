#!/usr/bin/env node

const name = "Vibe Test";
const repo = "estevanhernandez-stack-ed/vibe-plugins";
const plugin = "vibe-test";
const cli = "@esthernandez/vibe-test-cli";

const lines = [
  "",
  "  ◯───◯───◯",
  "  │ ╲ │ ╱ │",
  `  ◯───◯───◯   ${name} installed!`,
  "  │ ╱ │ ╲ │",
  "  ◯───◯───◯",
  "",
  "  ┌─ Plugin (Claude Code slash commands) ───────────────────┐",
  "  │                                                         │",
  "  │  In your Claude Code CLI or IDE terminal, run:          │",
  "  │                                                         │",
  `  │  /plugin marketplace add ${repo}        │`,
  `  │  /plugin install ${plugin}@${repo.split("/")[1]}                  │`,
  "  │  /reload-plugins                                        │",
  "  │                                                         │",
  "  │  Then in any project folder, run:                       │",
  "  │                                                         │",
  "  │  /vibe-test:audit                                       │",
  "  │                                                         │",
  "  └─────────────────────────────────────────────────────────┘",
  "",
  "  ┌─ CLI (CI-safe, deterministic, no LLM) ──────────────────┐",
  "  │                                                         │",
  `  │  npm install -g ${cli}                  │`,
  "  │  vibe-test audit --cwd .                                │",
  "  │  vibe-test gate --ci                                    │",
  "  │                                                         │",
  "  └─────────────────────────────────────────────────────────┘",
  "",
  "  Or in Claude Desktop: Personal plugins → + → Add marketplace",
  `  Enter: ${repo}`,
  "",
];

console.log(lines.join("\n"));
