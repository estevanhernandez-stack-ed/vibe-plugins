#!/usr/bin/env node
// vibe-sec CLI · v0.1 · secret-leak scanner
// --------------------------------------------------------------------
// Scans a repo for leaked API keys, tokens, and credentials. No LLM in
// the loop — pure regex + light heuristic classification. Safe in CI.
//
// Exit codes:
//   0 — clean, or only findings below --min-severity
//   1 — findings at or above --min-severity
//   2 — scanner error (unreadable tree, invalid args, etc.)
// --------------------------------------------------------------------

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("node:util");

const VERSION = "0.1.0";

// ─── patterns ────────────────────────────────────────────────────────
// severity: critical | high | medium | low
// remediation: what the user should do when a match lands
const PATTERNS = [
  {
    name: "AWS_ACCESS_KEY_ID",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: "critical",
    remediation: "Rotate this AWS access key in IAM. Move secrets to environment variables or AWS Secrets Manager.",
  },
  {
    name: "GITHUB_PAT_CLASSIC",
    regex: /\bghp_[A-Za-z0-9]{36}\b/g,
    severity: "critical",
    remediation: "Revoke at github.com/settings/tokens and regenerate. Use GITHUB_TOKEN env var in CI.",
  },
  {
    name: "GITHUB_PAT_FINEGRAINED",
    regex: /\bgithub_pat_[A-Za-z0-9_]{80,120}\b/g,
    severity: "critical",
    remediation: "Revoke at github.com/settings/personal-access-tokens and regenerate.",
  },
  {
    name: "STRIPE_LIVE_SECRET",
    regex: /\bsk_live_[A-Za-z0-9]{24,}\b/g,
    severity: "critical",
    remediation: "Roll this Stripe key in dashboard.stripe.com/apikeys. Live keys can charge real cards.",
  },
  {
    name: "STRIPE_TEST_SECRET",
    regex: /\bsk_test_[A-Za-z0-9]{24,}\b/g,
    severity: "medium",
    remediation: "Test keys are lower-risk but still leak billing access. Rotate at dashboard.stripe.com/apikeys.",
  },
  {
    name: "SLACK_TOKEN",
    regex: /\bxox[abpr]-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9-]{20,}\b/g,
    severity: "high",
    remediation: "Revoke in Slack's App settings → OAuth & Permissions.",
  },
  {
    name: "OPENAI_API_KEY",
    regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
    severity: "critical",
    remediation: "Revoke at platform.openai.com/api-keys. Billing runs on these.",
  },
  {
    name: "ANTHROPIC_API_KEY",
    regex: /\bsk-ant-[A-Za-z0-9_-]{40,}\b/g,
    severity: "critical",
    remediation: "Revoke at console.anthropic.com/settings/keys. Billing runs on these.",
  },
  {
    name: "GOOGLE_API_KEY",
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    severity: "high",
    remediation: "Restrict or regenerate at console.cloud.google.com/apis/credentials.",
  },
  {
    name: "GOOGLE_OAUTH_CLIENT_ID",
    regex: /\b[0-9]+-[a-z0-9_]{32}\.apps\.googleusercontent\.com\b/g,
    severity: "low",
    remediation: "Client IDs are public by design, but pair them with a secret that should not be here.",
  },
  {
    name: "JWT",
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    severity: "medium",
    remediation: "If this is a real session token, rotate your signing secret. If it's an example, comment it.",
  },
  {
    name: "PRIVATE_KEY_BLOCK",
    regex: /-----BEGIN (?:RSA |OPENSSH |EC |DSA |PGP )?PRIVATE KEY-----/g,
    severity: "critical",
    remediation: "Rotate this key pair. Treat the old key as compromised.",
  },
  {
    name: "DATABASE_URL_WITH_CREDENTIALS",
    regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss):\/\/[^:\s@"']+:[^@\s"']+@[^\s"']+/g,
    severity: "high",
    remediation: "Move DB URL to an env var (DATABASE_URL) and rotate the DB password.",
  },
  {
    name: "GENERIC_API_KEY_ASSIGN",
    regex: /\b(?:api[_-]?key|access[_-]?key|auth[_-]?token)\s*[:=]\s*["']([A-Za-z0-9_\-]{20,})["']/gi,
    severity: "medium",
    remediation: "Move this key to an environment variable or secret manager.",
  },
  {
    name: "GENERIC_SECRET_ASSIGN",
    regex: /\b(?:secret|password|passwd|pwd)\s*[:=]\s*["']([^"'\s]{12,})["']/gi,
    severity: "medium",
    remediation: "If this is a real credential, rotate it. Move to env vars.",
  },
];

// ─── false-positive filters ──────────────────────────────────────────
const PATH_SKIP_REGEX = /(^|[\\/])(node_modules|\.git|\.venv|venv|dist|build|coverage|\.next|\.nuxt|\.turbo|\.cache|\.pytest_cache|__pycache__|\.vibe-sec)([\\/]|$)/i;
const FILENAME_HINT_REGEX = /(example|sample|mock|fake|placeholder|dummy|template|fixture)/i;
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp",
  ".pdf", ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".mp3", ".mp4", ".mov", ".wav", ".avi", ".ogg", ".webm",
  ".ttf", ".woff", ".woff2", ".eot",
  ".so", ".dll", ".dylib", ".bin",
  ".pyc", ".class",
]);

// Known-safe placeholder strings — publicly documented examples.
// Split across concatenation so GitHub's push-protection secret-scanner
// doesn't flag the source file itself as containing live credentials.
const KNOWN_PLACEHOLDERS = new Set([
  "AKIA" + "IOSFODNN7EXAMPLE",
  "wJalrXUt" + "nFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "sk_te" + "st_4eC39HqLyjWDarjtT1zdp7dc",
]);

// ─── scanning ────────────────────────────────────────────────────────
function isBinary(filename) {
  return BINARY_EXT.has(path.extname(filename).toLowerCase());
}

function shouldSkipPath(p) {
  return PATH_SKIP_REGEX.test(p);
}

function* walk(dir, root = dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replace(/\\/g, "/");
    if (shouldSkipPath(rel)) continue;
    if (entry.isDirectory()) {
      yield* walk(full, root);
    } else if (entry.isFile()) {
      if (isBinary(entry.name)) continue;
      yield { full, rel };
    }
  }
}

function downgradeForContext(severity, filename) {
  if (FILENAME_HINT_REGEX.test(filename)) {
    if (severity === "critical") return "medium";
    if (severity === "high") return "low";
  }
  return severity;
}

function lineColumn(text, index) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < index; i++) {
    if (text[i] === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

function maskMatch(s) {
  if (s.length <= 8) return s[0] + "…" + s[s.length - 1];
  return s.slice(0, 6) + "…" + s.slice(-4);
}

function previewAt(text, index, matchLen) {
  const before = Math.max(0, text.lastIndexOf("\n", index - 1) + 1);
  const after = text.indexOf("\n", index + matchLen);
  const end = after === -1 ? text.length : after;
  const line = text.slice(before, end);
  const full = text.slice(index, index + matchLen);
  // Replace the matched secret inside the line with its masked form —
  // the JSON report + terminal preview must never persist a raw secret.
  const masked = line.split(full).join(maskMatch(full));
  return masked.trim().slice(0, 160);
}

function scanText(text, filePath) {
  const findings = [];
  for (const p of PATTERNS) {
    for (const m of text.matchAll(p.regex)) {
      const matched = m[0];
      if (KNOWN_PLACEHOLDERS.has(matched)) continue;
      const { line, col } = lineColumn(text, m.index);
      findings.push({
        pattern: p.name,
        severity: downgradeForContext(p.severity, filePath),
        file: filePath,
        line,
        column: col,
        match: maskMatch(matched),
        preview: previewAt(text, m.index, matched.length),
        remediation: p.remediation,
      });
    }
  }
  return findings;
}

function scanRepo(root) {
  const findings = [];
  let filesScanned = 0;
  for (const { full, rel } of walk(root)) {
    let text;
    try {
      const stat = fs.statSync(full);
      if (stat.size > 1024 * 1024) continue; // skip files > 1 MB
      text = fs.readFileSync(full, "utf8");
    } catch {
      continue;
    }
    filesScanned++;
    const found = scanText(text, rel);
    findings.push(...found);
  }
  return { findings, filesScanned };
}

// ─── output ──────────────────────────────────────────────────────────
const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };
const SEVERITY_COLORS = {
  critical: "\x1b[41;97m",
  high: "\x1b[31;1m",
  medium: "\x1b[33m",
  low: "\x1b[90m",
};
const RESET = "\x1b[0m";

function countBySeverity(findings) {
  return findings.reduce(
    (acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] || 0) + 1 }),
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
}

function renderBanner(root, filesScanned, findings, noColor) {
  const counts = countBySeverity(findings);
  const useColor = process.stdout.isTTY && !noColor;
  const color = useColor ? (c, s) => c + s + RESET : (_c, s) => s;
  const lines = [];
  lines.push("");
  lines.push(`  vibe-sec audit · v${VERSION}`);
  lines.push(`  ${filesScanned} files scanned · ${root}`);
  lines.push("");
  if (!findings.length) {
    lines.push(`  ${color("\x1b[32;1m", "✓")} No secrets detected.`);
    lines.push("");
    return lines.join("\n");
  }
  lines.push(`  Findings:`);
  for (const sev of ["critical", "high", "medium", "low"]) {
    if (counts[sev]) {
      lines.push(`    ${color(SEVERITY_COLORS[sev], sev.toUpperCase().padEnd(9))} ${counts[sev]}`);
    }
  }
  lines.push("");
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  );
  for (const f of sorted.slice(0, 10)) {
    lines.push(
      `    ${color(SEVERITY_COLORS[f.severity], f.severity.padEnd(8))} ${f.pattern.padEnd(28)} ${f.file}:${f.line}:${f.column}`
    );
  }
  if (sorted.length > 10) {
    lines.push(`    … and ${sorted.length - 10} more (see JSON report)`);
  }
  lines.push("");
  return lines.join("\n");
}

// ─── CLI ─────────────────────────────────────────────────────────────
function usage() {
  return `vibe-sec audit · v${VERSION}

Usage:
  vibe-sec audit [options]
  vibe-sec [options]                   (same as 'audit')

Options:
  -r, --root <dir>         Root directory to scan                (default: cwd)
  -o, --output <file>      JSON report path                      (default: .vibe-sec/state/audit.json)
      --min-severity <lv>  Exit 1 at or above this level         (default: high)
                           Values: critical | high | medium | low
      --json               Print only JSON, no banner
      --no-color           Disable ANSI colors in the banner
  -h, --help               Show this message
  -v, --version            Show version number

Exit codes:
  0  clean, or findings below --min-severity
  1  findings at or above --min-severity
  2  scanner error
`;
}

function main(argv) {
  // Strip a leading 'audit' positional since it's the default subcommand.
  const args = argv.slice(2).filter((a, i, arr) => !(i === 0 && a === "audit"));
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        root: { type: "string", short: "r" },
        output: { type: "string", short: "o" },
        "min-severity": { type: "string" },
        json: { type: "boolean", default: false },
        "no-color": { type: "boolean", default: false },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (ex) {
    process.stderr.write(`error: ${ex.message}\n\n${usage()}`);
    process.exit(2);
  }

  if (parsed.values.help) {
    process.stdout.write(usage());
    process.exit(0);
  }
  if (parsed.values.version) {
    process.stdout.write(VERSION + "\n");
    process.exit(0);
  }

  const root = path.resolve(parsed.values.root || process.cwd());
  const outRel = parsed.values.output || ".vibe-sec/state/audit.json";
  const minSeverity = parsed.values["min-severity"] || "high";
  if (!SEVERITY_ORDER[minSeverity]) {
    process.stderr.write("error: --min-severity must be one of critical|high|medium|low\n");
    process.exit(2);
  }

  let result;
  try {
    result = scanRepo(root);
  } catch (ex) {
    process.stderr.write(`scan failed: ${ex.message}\n`);
    process.exit(2);
  }

  const { findings, filesScanned } = result;
  const report = {
    version: 1,
    scanner: "vibe-sec-cli",
    scannerVersion: VERSION,
    scannedAt: new Date().toISOString(),
    rootDir: root,
    filesScanned,
    counts: countBySeverity(findings),
    findings,
  };

  const outPath = path.resolve(root, outRel);
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  } catch (ex) {
    process.stderr.write(`warning: couldn't write report: ${ex.message}\n`);
  }

  if (parsed.values.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    process.stdout.write(renderBanner(root, filesScanned, findings, parsed.values["no-color"]));
    if (findings.length) {
      process.stdout.write(`  → JSON report: ${path.relative(root, outPath) || outPath}\n\n`);
    }
  }

  const breach = findings.some((f) => SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER[minSeverity]);
  process.exit(breach ? 1 : 0);
}

main(process.argv);
