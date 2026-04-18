#!/usr/bin/env node

const name = "Vibe Test CLI";
const cli = "vibe-test";

const lines = [
  "",
  "  ◯───◯───◯",
  "  │ ╲ │ ╱ │",
  `  ◯───◯───◯   ${name} installed!`,
  "  │ ╱ │ ╲ │",
  "  ◯───◯───◯",
  "",
  "  ┌─ Quick start ───────────────────────────────────────────┐",
  "  │                                                         │",
  `  │  ${cli} audit --cwd .          # full audit              │`,
  `  │  ${cli} coverage               # honest-denominator      │`,
  `  │  ${cli} gate --ci              # CI pass/fail            │`,
  `  │  ${cli} posture                # ambient summary         │`,
  "  │                                                         │",
  "  └─────────────────────────────────────────────────────────┘",
  "",
  "  For interactive test generation, use the plugin in Claude",
  "  Code: /plugin install vibe-test@vibe-plugins (then run",
  "  /vibe-test:generate). The CLI handles the deterministic",
  "  ops; the plugin handles the conversational ones.",
  "",
  "  GitHub: github.com/estevanhernandez-stack-ed/vibe-plugins",
  "",
];

console.log(lines.join("\n"));
