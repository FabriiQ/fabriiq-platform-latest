# FabriiQ LXP Internationalization (i18n) – Non‑Breaking Implementation Plan

## Executive Summary
- No URL changes. Keep existing routes (/student, /teacher, /admin, etc.).
- System‑wide default language is set by System Admin. Optional user preference can override system default without changing URLs.
- Use next-intl for translations and formatting. No middleware required in Phase 1.
- Rollout portal‑by‑portal and only internationalize pages/components that are in use.
- RTL support via html[dir] and CSS logical properties. Avoid risky Tailwind RTL plugins initially.
- Phased, safe changes with clear backout at each step.

## Goals & Non‑Goals
- Goals: Multi-language UI (EN, AR, ES), RTL for AR, non‑breaking rollout, SSR‑safe, performant, testable.
- Non‑Goals (Phase 1): Locale in URLs, full translation of all historical/unused pages, complex middleware stacking.

## Language Resolution (no URL change)
Order of precedence on every request:
1) Logged-in user preference (if enabled and present)
2) System default language (configured by System Admin)
3) Accept-Language header (fallback)
4) Hard default: "en"

Mechanics:
- Server resolves the effective locale and sets a cookie (e.g., NEXT_LOCALE) for client hydration consistency.
- next-intl provider receives the same locale/messages on SSR.
- html lang and dir are set server-side in the root layout.

## Key Technical Decisions
- Library: next-intl v3 (App Router support)
- Message format: JSON namespaces (common, navigation, forms, errors, portal-specific)
- Loading: Load only required namespaces per page when feasible; otherwise start with common + portal namespace.
- RTL: Use dir="rtl" on <html> for Arabic and prefer CSS logical properties (margin-inline-start, padding-inline-end, etc.).
- Type safety: Optional typed messages via next-intl plugin after scaffolding is stable.

---

## Phase 0 – Scaffolding & Safety (Non‑Breaking)
Deliverables:
- Install deps (with approval): next-intl, negotiator, @formatjs/intl-localematcher (optional for future)
- Create configuration and utilities:
  - src/config/i18n.ts – locales: ["en","ar","es"], default: "en", rtlLocales: ["ar"], cookieName: "NEXT_LOCALE"
  - src/lib/i18n/resolve-locale.ts – resolves locale from (user pref | system default | Accept-Language | fallback)
  - src/lib/i18n/messages.ts – helper to load messages for a locale + namespace(s)
  - messages/en/common.json (seed) + messages/ar/common.json + messages/es/common.json (start minimal; fallback to EN)
- Wire up provider without route changes:
  - Wrap NextIntlClientProvider high in src/app/client-layout.tsx
  - Set <html lang dir> in src/app/layout.tsx from resolved locale
- Feature flag: Environment toggle ENABLE_I18N=true to disable quickly if needed

Tasks:
- [ ] Get approval to add dependencies (package.json + lock update)
- [ ] Add src/config/i18n.ts
- [ ] Add src/lib/i18n/resolve-locale.ts
- [ ] Add src/lib/i18n/messages.ts
- [ ] Add initial messages (EN/AR/ES) for common.json (buttons, generic labels)
- [ ] Integrate provider in ClientLayout
- [ ] Compute and set html lang/dir in RootLayout (SSR)
- [ ] Add safe defaults (when missing, use EN)
- [ ] Smoke run dev/build locally

Backout: Remove provider usage and ignore cookie; app returns to EN content.

---

## Phase 1 – Core UX & Auth (Used screens only)
Scope:
- Layout shell (navigation, menus, breadcrumbs), common UI components (Button, Modal/Alert/Toast), and Authentication pages.
- Do not translate unused/test pages.

Tasks:
- [ ] Identify in-use components/pages (script: scan src/app and src/components for page.tsx excluding test/docs; produce report of files with hardcoded strings)
- [ ] Create namespaces: messages/*/common.json, navigation.json, auth.json, errors.json, forms.json
- [ ] Replace hardcoded strings with t('...') in:
  - Layout/Nav shell (src/components/layout, src/components/navigation, app shell wrappers)
  - Common UI (src/components/ui/* selectively used)
  - Auth flows (src/app/auth/* and/or login/reset pages used in your app)
- [ ] Set default direction-aware classes using logical utilities and dir test points
- [ ] QA: English, Arabic (RTL smoke), Spanish

Acceptance:
- Build passes; no route or auth breakage
- All core navigation labels are translated; auth screens read from messages
- AR renders with dir=rtl and no obvious broken layouts

---

## Phase 2 – Student Portal (Used screens only)
Scope:
- src/app/student and related components actually used in production; skip experimental/test folders
- Prioritize: dashboard, classes, calendar, grades, resources

Tasks:
- [ ] From the report, list active student pages/components
- [ ] Create namespaces: messages/*/student/dashboard.json, classes.json, calendar.json, grades.json, resources.json (start minimal)
- [ ] Replace visible hardcoded strings with t()
- [ ] Add missing keys to EN first, then AR/ES; log missing keys during dev
- [ ] RTL spot checks on complex layouts (cards, tables, grids)

Acceptance:
- Student primary journeys fully localized; no console spam for missing keys in common flows

---

## Phase 3 – Teacher Portal (Used screens only)
Scope:
- src/app/teacher and its used components: dashboard, classes, schedule/calendar, content studio (as used)

Tasks:
- [ ] Confirm active teacher pages/components
- [ ] Add teacher namespaces (dashboard.json, classes.json, schedule.json, content-studio.json)
- [ ] Replace hardcoded strings with t()
- [ ] Validate forms/validation messages
- [ ] RTL spot checks

Acceptance:
- Teacher primary journeys localized with minimal missing keys

---

## Phase 4 – Admin Portal (Used screens only)
Scope:
- src/app/admin/system and sub-areas used today (settings, users, campuses, etc.)
- Include System Admin UI to set the default language

Tasks:
- [ ] Expose System Default Language setting in Admin (persist in config table or settings store)
- [ ] On app init/session, read system default and set cookie if no user preference
- [ ] Add admin namespaces (system.json, settings.json, users.json, campuses.json as needed)
- [ ] Internationalize visible strings in active admin screens

Acceptance:
- Changing system default language updates the whole system (for users with no explicit preference)

---

## Phase 5 – Optional User Preference (No URL change)
Scope:
- Allow users to set a preferred language (overrides system default) without altering URLs

Data & API:
- [ ] Add preferredLanguage to User model (e.g., enum: 'en'|'ar'|'es')
- [ ] Minimal API to update preference; ensure next-auth session refresh picks it up
- [ ] On login/session refresh, set NEXT_LOCALE cookie to preferredLanguage

UI:
- [ ] Settings/Profile page: show language selector (only if feature enabled)
- [ ] No language switcher in header if product forbids on-the-fly switching; keep it in profile only

Acceptance:
- Users with preference see UI in their language; guests/unset users see system default

---

## Phase 6 – Hardening, Types, and Tooling
- Optional: enable next-intl plugin in next.config.js (typed messages) after stability
- Add validation scripts:
  - i18n:missing – report missing keys across locales
  - i18n:validate – ensure all required namespaces exist
  - i18n:report – counts, coverage
- Performance checks: ensure message bundles are small; split by namespace where helpful

Tasks:
- [ ] Add scripts in package.json and implement simple validators
- [ ] Consider typed messages (gradual adoption)
- [ ] Bundle size and LCP checks for localized pages

---

## RTL Strategy (Pragmatic)
- Use html dir attribute (dir="rtl" for AR) set in RootLayout
- Prefer CSS logical properties (margin-inline-start, padding-inline-end). For Tailwind, prefer classes that are direction-agnostic or wrap with dir selectors only where needed
- Avoid @tailwindcss/rtl initially to reduce risk; reconsider after stabilization

---

## Testing & QA
- Unit-level: simple tests to assert translation keys exist for EN/AR/ES in critical namespaces
- E2E smoke per portal (EN and AR): navigation, forms, error states
- Visual RTL checks for common layouts (cards/grids/tables)

---

## Risks & Mitigations
- Hydration mismatch: always resolve locale on server and pass to provider + set cookie
- Middleware conflicts: avoid adding locale middleware now; keep current next-auth/institution logic unchanged
- Layout drift in RTL: limit to high-impact screens first; use logical CSS
- Scope creep: only translate in-use pages/components per automated report

---

## Milestones (Indicative)
1) Phase 0 – Scaffolding (1–2 days)
2) Phase 1 – Core UX & Auth (2–4 days)
3) Phase 2 – Student (3–5 days)
4) Phase 3 – Teacher (3–5 days)
5) Phase 4 – Admin + System Default Language setting (3–5 days)
6) Phase 5 – Optional User Preference (2–3 days)
7) Phase 6 – Hardening & Tooling (2–3 days)

Timeline scales with how many pages are “in use.”

---

## Deliverables
- Working non‑breaking i18n scaffold with next-intl
- Localized Core + selected Student/Teacher/Admin journeys
- System Default Language setting
- Optional User Preference support (feature‑toggled)
- Validation scripts and updated docs

