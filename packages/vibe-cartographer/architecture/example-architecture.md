# Example Architecture Doc

This is an example of what a custom architecture doc looks like. Copy this as a starting point and modify it for your stack.

---

# Architecture: React + Supabase

## Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (Postgres database, Auth, Edge Functions, Storage)
- **Hosting:** Vercel

### Why This Stack
- React + Vite gives fast iteration with hot reload
- Supabase handles auth, database, and storage with a generous free tier — no custom backend needed
- Tailwind provides utility-first styling without writing custom CSS
- Vercel deploys from Git with zero config for Vite projects

## Patterns

### Component Structure
- Use functional components with hooks
- Colocate component, styles, and tests in the same folder
- Prefer composition over prop drilling — use React Context for shared state
- Keep components small — if it's over 100 lines, break it up

### Data Flow
- Supabase client handles all database operations
- Use React Query (TanStack Query) for data fetching, caching, and mutations
- Auth state managed via Supabase's `onAuthStateChange` listener
- Optimistic updates for mutations when appropriate

### Error Handling
- Wrap API calls in try/catch with user-friendly error messages
- Use error boundaries for component-level crashes
- Loading and empty states for every data-dependent view

## File Structure

```
project/
├── src/
│   ├── components/        # Shared UI components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── Button.test.tsx
│   │   └── ...
│   ├── features/          # Feature-specific modules
│   │   ├── auth/
│   │   ├── dashboard/
│   │   └── ...
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Supabase client, utils
│   ├── pages/             # Route-level page components
│   └── App.tsx
├── public/
├── docs/                  # Planning artifacts
├── process-notes.md
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

## Deployment

- Push to `main` branch triggers Vercel deploy
- Preview deployments on PRs
- Environment variables for Supabase URL and anon key set in Vercel dashboard
- Local development uses `.env.local` (gitignored)

## Conventions

- **Naming:** PascalCase for components, camelCase for functions/variables, kebab-case for files
- **Imports:** Absolute imports via `@/` alias mapped to `src/`
- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- **Testing:** Vitest + React Testing Library for unit/integration tests
