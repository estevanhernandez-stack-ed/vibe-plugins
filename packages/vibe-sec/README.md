# Vibe Sec

**Security scanner and fix generator for vibe-coded apps.**

Vibe-coded applications ship with a predictable, classifiable set of security gaps. Vibe Sec scans for the fingerprint, prioritizes findings by app type and deployment context, and generates fixes proportional to what the app actually needs — not to an abstract security ideal.

## Status

**Framework drafted. Implementation pending.** See [framework.md](./framework.md) for the full thesis, scanner taxonomy, fix engine design, and v1 scope.

Version `0.0.1` is reserved for the first working implementation. Until then, this package exists to establish the marketplace slot and document the design.

## What it will do (v1)

- **Layer 1 — Hygiene:** Secrets detection, `.gitignore` audit, security headers, dependency CVE audit, CORS config review, security-related `console.log` leakage
- **Layer 2 — Architecture:** Auth flow review, input validation detection, authorization check audit
- **Automated fixes** for Layer 1 findings with confidence ≥ 0.9
- **Guided fix templates** for Layer 2 findings
- **CI check command** that pass/fails against the app's security tier
- **Classification-driven prioritization** — same finding might be critical for a payment API and informational for a static site
- **Level 2 self-evolution** — persistent profile + session memory

## What it won't be (v1)

- A penetration testing tool
- A WAF or runtime security solution
- A compliance certification tool (maps to frameworks, doesn't certify)
- A replacement for professional security review on high-stakes systems

## Relationship to other Vibe plugins

- **Vibe Doc** — Vibe Sec findings feed into threat model doc generation
- **Vibe Test** — Vibe Sec findings suggest security-specific test cases for Vibe Test
- **Vibe Cartographer** — the security verification step in `/checklist` is where Vibe Sec plugs in for the full development lifecycle

## License

MIT
