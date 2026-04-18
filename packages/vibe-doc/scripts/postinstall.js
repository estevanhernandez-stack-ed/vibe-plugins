#!/usr/bin/env node

const name = "Vibe Doc";
const repo = "estevanhernandez-stack-ed/Vibe-Doc";
const plugin = "vibe-doc";

const lines = [
  "",
  `  📖  ${name} v${require("../package.json").version} installed!`,
  "",
  "  CLI is ready — run from any project:",
  "",
  "    vibe-doc scan       # Analyze documentation gaps",
  "    vibe-doc generate   # Generate missing docs",
  "    vibe-doc check      # Validate doc completeness",
  "",
  "  ┌─ Optional: activate slash commands in Claude Code ──────┐",
  "  │                                                         │",
  "  │  In your Claude Code CLI or IDE terminal, run:          │",
  "  │                                                         │",
  `  │  /plugin marketplace add ${repo}     │`,
  `  │  /plugin install ${plugin}@${repo.split("/")[0]}  │`,
  "  │  /reload-plugins                                        │",
  "  │                                                         │",
  "  │  This adds /scan and /generate as interactive commands.  │",
  "  │                                                         │",
  "  └─────────────────────────────────────────────────────────┘",
  "",
  "  Or in Claude Desktop: Personal plugins → + → Add marketplace",
  `  Enter: ${repo}`,
  "",
];

console.log(lines.join("\n"));
