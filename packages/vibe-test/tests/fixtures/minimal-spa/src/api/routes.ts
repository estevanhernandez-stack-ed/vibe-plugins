// Simulated Express-style route definitions for scanner testing.
// In a real SPA this would be imported from an API package; we inline to avoid deps.

declare const app: {
  get: (path: string, ...handlers: Array<(...args: unknown[]) => unknown>) => void;
  post: (path: string, ...handlers: Array<(...args: unknown[]) => unknown>) => void;
};

function healthHandler(): unknown {
  return { ok: true };
}

function createBadgeHandler(): unknown {
  return { created: true };
}

app.get('/api/health', healthHandler);
app.post('/api/badges', createBadgeHandler);
