# Internal API Gateway Refactor Checklist

## Goal

Build this project into an internal-only AI gateway for employees and internal systems, with the following priorities:

1. Secure by default
2. Unified model access
3. Auditable and cost-controllable
4. Easy to operate and easy to extend

This document is based on the current repository layout and focuses on incremental customization instead of a full rewrite.

---

## Product Direction

The internal version should be positioned as:

- A unified LLM gateway
- An internal model routing and policy control layer
- A cost and audit platform

It should not be positioned as:

- A public recharge platform
- A general-purpose SaaS console for external users
- A marketplace exposing all upstream providers to everyone

---

## Refactor Principles

1. Keep the relay core and simplify the product shell.
2. Prefer internal identity and internal authorization over public registration/login.
3. Expose internal model aliases instead of raw upstream model names.
4. Record enough metadata for audit, but avoid storing sensitive payloads by default.
5. Use configuration and policy to control behavior before adding new UI.

---

## Must Keep

These are the core assets of the project and should remain the backbone of the internal edition:

- Relay routing and provider compatibility in `router/relay-router.go`, `controller/relay.go`, `relay/`
- Channel management and selection in `controller/channel*.go`, `service/channel*.go`, `model/channel*.go`
- Token and quota mechanisms in `controller/token.go`, `service/quota.go`, `model/token.go`
- Logging and usage statistics in `controller/log.go`, `model/log.go`, `model/usedata.go`
- Option/config system in `controller/option.go`, `model/option.go`, `setting/`
- Admin console shell in `web/src/pages/*`

---

## Must Disable Or Remove

These modules are usually unnecessary or risky for an internal-only gateway:

### Public growth and public-site features

- Public registration and open self-service login flows
- Home-page marketing content as a primary entry
- Public-facing recharge and announcement workflows

Related files:

- `controller/user.go`
- `controller/misc.go`
- `web/src/pages/Home`
- `web/src/components/auth/*`

### External commercial billing flows

- Recharge
- Subscription purchase
- Redemption codes
- Stripe/EPay/Creem/Waffo callbacks

Related files:

- `controller/topup*.go`
- `controller/subscription*.go`
- `controller/redemption.go`
- `service/epay.go`
- `service/webhook.go`
- `web/src/pages/TopUp`
- `web/src/pages/Subscription`
- `web/src/pages/Redemption`

### Unnecessary third-party login options

If the target is enterprise SSO, keep only your company SSO path and remove the rest:

- GitHub
- Discord
- Telegram
- WeChat
- LinuxDO
- Misc public custom OAuth unless truly needed

Related files:

- `oauth/*`
- `controller/oauth.go`
- `controller/custom_oauth.go`
- `controller/telegram.go`
- `controller/wechat.go`

---

## Must Strengthen

### 1. Enterprise authentication

Recommended target:

- OIDC / company IdP as the primary login
- Optional internal service-to-service token authentication

Suggested work:

- Make OIDC the default auth path
- Disable self registration by default
- Map IdP groups to internal roles and groups
- Support user auto-provisioning on first login

Key files:

- `middleware/auth.go`
- `oauth/oidc.go`
- `controller/oauth.go`
- `model/user.go`

### 2. Internal authorization model

Recommended role model:

- Platform root admin
- Platform admin
- Department admin
- Normal internal user
- Service account

Recommended dimensions:

- User role
- Department or project group
- Token scope
- Model access policy

Key files:

- `middleware/auth.go`
- `controller/user.go`
- `controller/group.go`
- `model/user.go`
- `model/token.go`

### 3. Model alias and policy layer

Do not expose raw upstream models directly to most users. Add a stable internal model layer:

- `chat-default`
- `chat-fast`
- `reasoning-pro`
- `embedding-default`
- `image-default`

Each alias should map to:

- One or more upstream channels
- Allowed groups
- Price/weight/priority policy
- Optional safety policy

Key files:

- `controller/model.go`
- `controller/model_meta.go`
- `service/channel_select.go`
- `model/model.go`
- `model/ability.go`
- `relay/channel/*`

### 4. Cost control and usage governance

Recommended controls:

- Per-user quota
- Per-group quota
- Per-model rate limits
- Daily and monthly budget ceilings
- Alerting on abnormal spikes

Key files:

- `service/quota.go`
- `service/billing.go`
- `middleware/model-rate-limit.go`
- `controller/log.go`
- `model/usedata.go`

### 5. Auditing and compliance

Recommended behavior:

- Store request metadata by default
- Do not store raw prompt/response by default
- Support masking or hashing of sensitive request fields
- Log who called what model, from which token, for how much quota, through which channel

Key files:

- `controller/log.go`
- `model/log.go`
- `middleware/logger.go`
- `controller/relay.go`

---

## Recommended New Modules

These are the highest-value additions for an internal edition:

### 1. Service account management

Purpose:

- Give internal systems their own credentials
- Separate human users from machine callers

Recommended additions:

- Service account entity
- Token issuance with scope
- Expiration and rotation policy

### 2. Internal model catalog

Purpose:

- Publish approved models for internal use
- Hide experimental or unsafe upstream models

Recommended additions:

- Model alias table
- UI for alias management
- Group-to-model authorization matrix

### 3. Policy engine

Purpose:

- Centralize route and permission rules

Recommended policy dimensions:

- User group
- Request type
- Model alias
- Data classification
- Region or deployment requirement

### 4. Alerting and operations dashboard

Purpose:

- Make the gateway operable by a small internal platform team

Recommended metrics:

- QPS
- Success rate
- Average latency
- Error rate by provider
- Cost by group
- Top callers

---

## UI Refactor Suggestions

The current console is feature-rich, but for internal use it should be simplified.

### Keep

- Channel management
- Token management
- User management
- Logs and usage dashboard
- Settings
- Playground

### Hide or remove

- Top-up
- Subscription purchase
- Public marketing homepage modules
- Public redemption workflows

### Add

- Internal model catalog page
- Service account page
- Budget and quota policy page
- Audit search page

Frontend touch points:

- `web/src/App.jsx`
- `web/src/pages/Channel`
- `web/src/pages/Token`
- `web/src/pages/User`
- `web/src/pages/Log`
- `web/src/pages/Setting`

---

## Current Code To-Do Map

Use this section as a practical task splitter.

### Phase 1: Internalize access

- Disable public registration and public-site flows
- Enable OIDC-first login
- Remove or hide recharge/subscription/redeem UI and API
- Restrict deployment to internal network only

### Phase 2: Build internal governance

- Add internal model aliasing
- Add group-based model permissions
- Add service accounts
- Add audit-friendly log enrichment

### Phase 3: Improve operations

- Add dashboards and alerts
- Add channel health and fallback policies
- Add cost controls and daily/monthly budgets

### Phase 4: Long-term evolution

- Add prompt policies
- Add response moderation policies
- Add data residency routing
- Add request caching for internal read-heavy cases

---

## Suggested First 10 Engineering Tasks

1. Hide `TopUp`, `Subscription`, and `Redemption` pages from the frontend router.
2. Disable public registration and non-SSO login paths in `/api/user/*`.
3. Keep only OIDC in the login entry and provider registry.
4. Add a `service_account` model and admin CRUD page.
5. Add `internal_model_alias` storage and admin CRUD page.
6. Map alias -> upstream model/channel selection in the relay path.
7. Add group-based allowlist checks before relay dispatch.
8. Add masked audit logging for prompt metadata.
9. Add budget/quota views by user and group.
10. Add a deployment profile for intranet-only operation.

---

## Recommended Delivery Strategy

Do not refactor everything at once.

Recommended order:

1. Remove external/public features
2. Stabilize internal authentication
3. Add alias and policy layer
4. Add service accounts and governance
5. Add dashboards and operational polish

This order gives you a usable internal gateway early, while keeping the core relay capabilities intact.
