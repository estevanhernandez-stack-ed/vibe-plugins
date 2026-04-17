// Zod schemas for scanner testing. Kept deliberately simple.
import { z } from 'zod';

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
