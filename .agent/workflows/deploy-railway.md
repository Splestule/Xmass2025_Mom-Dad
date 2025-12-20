---
description: 
---

# Workflow: Railway Deployment

1. **Environment Check:** Verify the following variables are defined in the project:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
2. **Build Test:** Run `npm run build` locally to ensure no TypeScript or Linting errors will break the Railway build.
3. **Railway Config:** Generate a `railway.json` file if specific build commands or health checks are required.
4. **PWA Audit:** Run a Lighthouse check to ensure the "Install" prompt will trigger once deployed to the production URL.