# Mission: Project Echo

## 1. Project Intent
**Project Echo** is a bespoke, private relationship-tuning application gifted to a couple (Mom and Dad, approx. age 45). The goal is to bypass communication barriers by providing a "low-friction" digital space to express appreciation and signal emotional needs without the weight of a formal "talk."

## 2. The User Personas
- **Profiles:** Tech-savvy, 45-year-old professionals. Familiar with modern app UX (Instagram, Slack, Banking apps).
- **Pain Point:** Small frustrations often go unsaid to avoid conflict, leading to emotional distance. Positive moments are often felt but not always vocalized.
- **Goal:** Use technology to "bridge the silence" and maintain a healthy emotional baseline.

## 3. Core Feature Specifications

### A. The Vibe Dashboard (Real-time Sync)
- **Visual:** A central "Orb" or "Glow" on the home screen that shifts color based on the couple's collective "Sync Score."
- **Input:** A "Vibe Slider" for each user to indicate their current emotional state (labels: Out of Sync, Quiet, Neutral, Connected, Radiant).
- **Tech:** Supabase Realtime must update the partner's screen the second the slider is moved.

### B. "The Glow" (Appreciation Feed)
- **Action:** A quick-action button to log a "Micro-Appreciation."
- **UI:** A beautiful, scrollable feed of "Glows."
- **Requirement:** Each Glow must trigger a native Push Notification to the partner: "[Name] just sent you a Glow! ✨"

### C. "The Unspoken" (Private to Shared)
- **The Vault:** A private scratchpad for each user to write things that are bothering them.
- **The Reframer:** An AI-action button (Gemini 3) that takes a raw, frustrated note and drafts 3 "Gentle Approaches" using I-statements.
- **Sharing:** Notes are only visible to the partner if the author explicitly hits "Share with [Partner]."

### D. The Weekly "Temperature Check"
- **Logic:** Every Sunday evening, the app sends a push notification asking: "How was your connection this week?" 
- **Output:** A summary view comparing their vibes over the last 7 days.

## 4. Technical Constraints
- **Platform:** Web PWA (Must be "Add to Home Screen" compatible).
- **Host:** Railway.app.
- **Database:** Supabase (PostgreSQL).
- **Authentication:** Private invite only. Only 2 users allowed per "Family ID."
- **Push:** Web Push API (Service Worker required).

## 5. Definition of Done
- App is successfully deployed to a `.railway.app` URL.
- Both users can log in, see each other's "Glows," and update their "Vibe."
- The PWA manifest allows the app to appear without browser chrome on iOS/Android.
- The "Reframer" successfully generates constructive dialogue from raw input.