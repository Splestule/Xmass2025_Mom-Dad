---
description: Add a new feature using Spec-Driven Development
---

# Workflow: Feature Implementation (Spec-Driven)

1. **Analysis:** Review `mission.md` and `rules/communication.md` to determine if the requested feature aligns with the app's spirit.
2. **Technical Plan:** Create a detailed plan including:
   - Necessary Supabase schema changes.
   - New UI components (Tailwind + Framer Motion).
   - Notification triggers.
3. **Draft Artifact:** Present the plan to the user. DO NOT write code until the user says "Approve."
4. **Execution:** - Update Supabase (provide SQL migrations).
   - Implement the frontend components.
   - Verify PWA installability.
5. **Verification:** Check that the feature works on mobile viewports and that notifications are correctly queued.