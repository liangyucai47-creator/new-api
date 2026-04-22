# Internal Mode Foundation Design

**Date:** 2026-04-22

## Goal

Add a phase-1 internal deployment profile that hides public growth and monetization features without changing the relay core, database schema, or authentication model.

## Scope

This design only covers the approved first slice:

- Add a unified `INTERNAL_MODE` runtime flag.
- Expose the flag through `/api/status`.
- Hard-disable public/self-service flows on the backend when the flag is enabled.
- Hide matching routes, menus, and entry points in the frontend when the flag is enabled.

This design explicitly does not include:

- OIDC-only login
- service accounts
- model aliases
- new database tables
- policy engine work

## Backend Design

The backend will treat `INTERNAL_MODE` as a top-level runtime switch stored in `common`. `InitEnv()` will load it once from the process environment, and `/api/status` will surface it as `internal_mode_enabled` so the frontend can react without extra API calls.

Public-facing routes that are not appropriate for an internal gateway will be guarded at the router layer. A dedicated middleware will return HTTP 403 with a consistent JSON payload when internal mode is enabled. This keeps the relay path, token APIs, admin console APIs, and existing user-authenticated core flows intact while making the blocked paths truly unavailable rather than merely hidden.

The first blocked set is:

- registration
- password reset and verification endpoints
- public payment callbacks and user top-up/payment endpoints
- subscription purchase and subscription admin management
- redemption management

OAuth providers are not refactored in this slice. Existing provider implementations remain untouched to keep the first phase shallow and reduce regression risk.

## Frontend Design

The frontend will read `internal_mode_enabled` from the shared status payload already cached in context/local storage. When enabled, the app will remove public/commercial routes and navigation links instead of rendering dead-end pages.

The first hidden set is:

- home page as the default landing page
- pricing page
- register and reset-password pages
- top-up, subscription, and redemption console pages
- corresponding sidebar and header navigation entries

The login page will stay functional in phase 1, but it will stop advertising self-registration and password reset while internal mode is on. Register UI will render a simple internal-use message rather than a self-service form.

## Data Flow

1. Process starts with `INTERNAL_MODE=true`.
2. `common.InitEnv()` sets `common.InternalModeEnabled`.
3. `/api/status` returns `internal_mode_enabled: true`.
4. Frontend status bootstrap stores the flag and conditionally filters routes/navigation.
5. If a client still calls a blocked backend endpoint directly, router middleware aborts the request with 403.

## Error Handling

Blocked endpoints should fail closed with a short, operator-readable message such as “internal mode disables this endpoint”. The middleware should not panic, redirect, or return HTML. Existing auth and admin checks should remain in place for routes that are still available.

On the frontend, removed routes should resolve to the nearest safe page (`/console` or `/login`) rather than exposing a broken form.

## Testing Strategy

Phase 1 verification will focus on:

- backend test proving `/api/status` includes `internal_mode_enabled`
- backend test proving the new middleware blocks requests when enabled and passes through when disabled
- focused Go test run for the new tests
- frontend production build to ensure route/menu/login changes compile cleanly

## Notes

This slice is intentionally a foundation layer. Phase 2 can build on the same flag to tighten auth into OIDC-only mode without needing to redesign the phase-1 guardrails.
