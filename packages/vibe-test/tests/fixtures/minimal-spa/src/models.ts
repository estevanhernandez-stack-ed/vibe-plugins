// Zod-shaped schemas for scanner testing. Kept intentionally simple — we
// don't actually import `zod` because the fixture ships without runtime deps;
// the scanner extracts the shape from the AST pattern alone.
declare const z: {
  object: (shape: Record<string, unknown>) => unknown;
  string: () => { optional: () => unknown };
};

export const User = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().optional(),
});

export const Badge = z.object({
  id: z.string(),
  userId: z.string(),
  earnedAt: z.string(),
});

