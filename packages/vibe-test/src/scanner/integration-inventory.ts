/**
 * Integration inventory — detects third-party integrations via import graph +
 * config file hints.
 *
 * Providers covered in v0.2:
 * - Stripe         (`stripe` package, webhook handlers, checkout sessions)
 * - Firebase       (`firebase` / `firebase-admin`, firestore + auth imports)
 * - Sentry         (`@sentry/*`)
 * - Auth0          (`@auth0/*`, `auth0`)
 * - Twilio         (`twilio`)
 * - SendGrid       (`@sendgrid/mail`)
 */

import type { ParsedFile, AstNode } from './ast-walker.js';
import { walk } from './ast-walker.js';

export type IntegrationType =
  | 'payment'
  | 'auth'
  | 'database'
  | 'analytics'
  | 'messaging'
  | 'email'
  | 'observability';

export interface IntegrationEntry {
  type: IntegrationType;
  provider: 'stripe' | 'firebase' | 'sentry' | 'auth0' | 'twilio' | 'sendgrid';
  config_hints: string[];
}

interface ProviderRule {
  provider: IntegrationEntry['provider'];
  type: IntegrationType;
  /** Match if any import source starts with one of these prefixes. */
  importPrefixes: string[];
  /** Extra dependency keys (from package.json) that count as evidence. */
  dependencyKeys?: string[];
  /** Config-hint snippets we'll report if observed in source text. */
  textHints?: RegExp[];
}

const RULES: ProviderRule[] = [
  {
    provider: 'stripe',
    type: 'payment',
    importPrefixes: ['stripe'],
    dependencyKeys: ['stripe', '@stripe/stripe-js'],
    textHints: [/stripe\.checkout/i, /stripe\.webhooks/i, /stripe\.customers/i],
  },
  {
    provider: 'firebase',
    type: 'database',
    importPrefixes: ['firebase', 'firebase-admin', '@firebase/', '@google-cloud/firestore'],
    dependencyKeys: ['firebase', 'firebase-admin', '@firebase/firestore', '@firebase/auth'],
    textHints: [/getFirestore\(/i, /initializeApp\(/i, /getAuth\(/i],
  },
  {
    provider: 'sentry',
    type: 'observability',
    importPrefixes: ['@sentry/'],
    dependencyKeys: ['@sentry/node', '@sentry/browser', '@sentry/react', '@sentry/nextjs'],
    textHints: [/Sentry\.init\(/i, /Sentry\.captureException\(/i],
  },
  {
    provider: 'auth0',
    type: 'auth',
    importPrefixes: ['@auth0/', 'auth0'],
    dependencyKeys: ['@auth0/nextjs-auth0', '@auth0/auth0-react', 'auth0', 'auth0-js'],
    textHints: [/useAuth0\(/i, /\bAuth0Provider\b/i],
  },
  {
    provider: 'twilio',
    type: 'messaging',
    importPrefixes: ['twilio'],
    dependencyKeys: ['twilio'],
    textHints: [/twilio\(/i, /messages\.create\(/i],
  },
  {
    provider: 'sendgrid',
    type: 'email',
    importPrefixes: ['@sendgrid/mail', '@sendgrid/client'],
    dependencyKeys: ['@sendgrid/mail', '@sendgrid/client'],
    textHints: [/sgMail\.send\(/i, /sgMail\.setApiKey\(/i],
  },
];

function importsFromFile(parsed: ParsedFile): string[] {
  const sources: string[] = [];
  walk(parsed.ast, (node) => {
    if (node.type === 'ImportDeclaration') {
      const src = (node as { source?: AstNode }).source;
      if (src && src.type === 'Literal') {
        const v = (src as { value?: unknown }).value;
        if (typeof v === 'string') sources.push(v);
      }
    }
    // Capture `require('x')` too.
    if (node.type === 'CallExpression') {
      const callee = (node as { callee?: AstNode }).callee;
      if (callee && callee.type === 'Identifier' && (callee as { name?: string }).name === 'require') {
        const args = ((node as { arguments?: AstNode[] }).arguments ?? []) as AstNode[];
        const first = args[0];
        if (first && first.type === 'Literal') {
          const v = (first as { value?: unknown }).value;
          if (typeof v === 'string') sources.push(v);
        }
      }
    }
    return;
  });
  return sources;
}

function matchPrefix(source: string, prefixes: string[]): boolean {
  for (const p of prefixes) {
    if (source === p || source.startsWith(p + '/') || source.startsWith(p)) return true;
  }
  return false;
}

export interface IntegrationInventoryInput {
  files: ParsedFile[];
  dependencies: Record<string, string>;
}

export function extractIntegrations(input: IntegrationInventoryInput): IntegrationEntry[] {
  const perProvider = new Map<IntegrationEntry['provider'], IntegrationEntry>();

  function ensure(rule: ProviderRule): IntegrationEntry {
    const existing = perProvider.get(rule.provider);
    if (existing) return existing;
    const fresh: IntegrationEntry = {
      provider: rule.provider,
      type: rule.type,
      config_hints: [],
    };
    perProvider.set(rule.provider, fresh);
    return fresh;
  }

  for (const rule of RULES) {
    const depMatch =
      (rule.dependencyKeys ?? []).some((k) => k in input.dependencies);
    let importMatch = false;
    const hints = new Set<string>();

    for (const parsed of input.files) {
      const imports = importsFromFile(parsed);
      for (const src of imports) {
        if (matchPrefix(src, rule.importPrefixes)) {
          importMatch = true;
          hints.add(`import: ${src}`);
        }
      }
      if (rule.textHints && rule.textHints.length > 0) {
        for (const hint of rule.textHints) {
          if (hint.test(parsed.source)) {
            hints.add(`usage: ${hint.source}`);
          }
        }
      }
    }

    if (depMatch || importMatch) {
      const entry = ensure(rule);
      for (const h of hints) entry.config_hints.push(h);
      if (depMatch) entry.config_hints.push('dependency: present');
      // Deduplicate.
      entry.config_hints = [...new Set(entry.config_hints)];
    }
  }

  return [...perProvider.values()];
}
