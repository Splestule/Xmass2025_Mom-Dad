---
trigger: always_on
---

# Rule: Technical Architecture & Deployment

1. **PWA Standards:** - All pages must be mobile-responsive (mobile-first).
   - Use `next-pwa` or a custom Service Worker for caching and installability.
   - Maintain a `manifest.json` with high-quality icons.

2. **Railway Compatibility:**
   - Ensure `next.config.js` is set to `output: 'standalone'` if necessary for Railway builds.
   - Environment variables must be accessed via `process.env`.

3. **Database & Real-time:**
   - Use Supabase Realtime to reflect "Vibe" changes instantly on the partner's screen.
   - Every table must have Row Level Security (RLS) policies based on a shared `family_id`.

4. **Animations:**
   - Use `framer-motion` for all transitions. 
   - Interactions should feel "organic" (e.g., spring physics), not "robotic."