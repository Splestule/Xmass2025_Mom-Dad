---
trigger: always_on
---

# Rule: System Architecture & Security

1. **Project Structure:**
   - Use the Next.js **App Router** (`/app` directory).
   - Components must be split into `components/ui` (stateless/shadcn) and `components/features` (logic-heavy).
   - Hooks should be extracted to `/hooks` for Supabase subscriptions and PWA logic.

2. **Database Schema & Multi-Tenancy:**
   - The app uses a **Shared-Space Model**.
   - Every table (vibes, glows, notes) must have a `family_id` (UUID).
   - **Row Level Security (RLS):** Policies must ensure `auth.uid()` can only read/write rows where their `profile.family_id` matches the row's `family_id`.

3. **PWA & Offline Strategy:**
   - **Service Worker:** Must implement "Stale-While-Revalidate" for UI assets.
   - **Optimistic Updates:** Use TanStack Query (React Query) for the "Vibe Slider" and "Glows" so the UI updates instantly before the server responds.

4. **Security & Privacy:**
   - **Client-Side Privacy:** "Unspoken Notes" (bothers) must be stored with a `is_shared: boolean` flag. The API must never return rows where `is_shared` is false to the partner's client.
   - **Environment Variables:** Never hardcode keys. Use `.env.local` for development and Railway variables for production.

5. **API Design:**
   - Use **Server Actions** for database mutations (sending glows, updating vibes).
   - Use **Route Handlers** (`/api/...`) specifically for Web-Push notifications and Gemini AI reframing tasks.