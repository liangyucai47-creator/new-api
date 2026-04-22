# Git Repository Design For The Internal Gateway

## Recommendation

Use a single monorepo based on the current repository.

Reason:

- Backend and frontend are tightly coupled
- Relay changes usually require console changes
- Shared release cadence is simpler for an internal platform
- The current codebase is already organized like a monorepo

Do not split backend and frontend into separate repositories in the first stage.

---

## Repository Goal

The repository should support:

- Fast internal customization
- Clear ownership by business domain
- Safe release management
- Incremental migration from the upstream project

---

## Recommended Repo Strategy

### Upstream model

Treat this repository as an internal customized fork.

Recommended remotes:

- `origin`: your internal repository
- `upstream`: `https://github.com/Calcium-Ion/new-api.git`

Goal:

- Keep your internal changes in your own mainline
- Periodically sync useful upstream updates
- Avoid editing directly against an anonymous local clone

### Branch model

Recommended long-lived branches:

- `main`: production-ready internal branch
- `develop`: integration branch for upcoming work
- `upstream-sync`: temporary branch used only for upstream merge/rebase work

Recommended short-lived branches:

- `feature/<domain>-<name>`
- `fix/<domain>-<name>`
- `hotfix/<name>`
- `chore/<name>`

Examples:

- `feature/auth-oidc-only`
- `feature/model-alias-policy`
- `feature/service-account-admin`
- `fix/relay-gemini-routing`

### Tag strategy

Use internal release tags instead of upstream release semantics.

Recommended format:

- `internal-v0.1.0`
- `internal-v0.2.0`
- `internal-v0.2.1`

If you want traceability to upstream:

- `internal-v0.2.0+upstream-f995a86`

---

## Recommended Directory Strategy

### Stage 1: Keep current layout, add internal overlays

This is the most practical short-term option because it avoids a large Go import refactor.

Recommended top-level additions:

- `docs/internal/`
- `deploy/`
- `configs/`
- `tests/`

Recommended structure:

```text
.
├─ common/
├─ constant/
├─ controller/
├─ middleware/
├─ model/
├─ oauth/
├─ relay/
├─ router/
├─ service/
├─ setting/
├─ web/
├─ docs/
│  └─ internal/
├─ deploy/
│  ├─ docker/
│  ├─ compose/
│  └─ k8s/
├─ configs/
│  ├─ dev/
│  ├─ staging/
│  └─ prod/
├─ scripts/
└─ tests/
```

### Stage 2: Optional structural cleanup

Only do this after the internal version is stable.

Potential target:

```text
.
├─ apps/
│  ├─ gateway-api/
│  └─ admin-web/
├─ packages/
│  ├─ relay-core/
│  ├─ auth-core/
│  └─ policy-core/
├─ deploy/
├─ docs/
└─ tests/
```

This stage is optional and should not block product delivery.

---

## Suggested Module Ownership

Assign ownership by domain, not by technical layer only.

Recommended ownership slices:

- `auth-and-access`
  - `middleware/auth.go`
  - `oauth/*`
  - `controller/oauth.go`
  - `controller/user.go`
- `relay-and-routing`
  - `controller/relay.go`
  - `relay/*`
  - `service/channel*.go`
- `governance-and-billing`
  - `service/billing.go`
  - `service/quota.go`
  - `model/log.go`
  - `model/usedata.go`
- `admin-console`
  - `web/src/pages/*`
  - `web/src/components/*`
- `platform-and-deploy`
  - `Dockerfile`
  - `docker-compose.yml`
  - `deploy/*`
  - `.github/workflows/*`

---

## Recommended Internal Docs Layout

Use `docs/internal/` as the home for internal-only decisions.

Recommended files:

- `docs/internal/internal-gateway-refactor-checklist.md`
- `docs/internal/git-repository-design.md`
- `docs/internal/auth-design.md`
- `docs/internal/model-alias-design.md`
- `docs/internal/service-account-design.md`
- `docs/internal/deployment-profile.md`
- `docs/internal/upstream-sync-playbook.md`

---

## CI/CD Design

Keep CI simple at first.

Recommended workflows:

1. `ci-backend`
   - Go build
   - Go tests
   - lint if introduced

2. `ci-frontend`
   - frontend install
   - build
   - lint

3. `ci-integration`
   - build frontend + backend
   - smoke test `/api/status`

4. `release-internal`
   - build internal image
   - tag release
   - publish artifact to internal registry

Current workflow files already exist under `.github/workflows/`, so you can add internal workflows alongside them before removing public-release-specific ones.

---

## Commit Convention

Use a lightweight conventional commit style.

Recommended prefixes:

- `feat:`
- `fix:`
- `refactor:`
- `docs:`
- `chore:`
- `test:`

Examples:

- `feat: add internal model alias management`
- `fix: restrict public signup in internal profile`
- `refactor: simplify auth flow for oidc-only mode`

---

## Upstream Sync Strategy

Because this project started as an upstream-based internal fork, define a stable sync process.

Recommended rules:

1. Never develop directly on a temporary upstream sync branch.
2. Keep internal-only features behind clearly named commits and docs.
3. Sync upstream into `upstream-sync`, resolve conflicts there, then merge into `develop`.
4. Promote to `main` only after smoke testing.

Recommended cadence:

- Monthly sync for normal periods
- Immediate sync for security fixes or critical provider compatibility updates

---

## Suggested Initial Branch Setup

Once you move to your internal remote, create:

1. `main`
   - current stable internal baseline
2. `develop`
   - next integration branch
3. `feature/internal-gateway-foundation`
   - remove public flows, keep relay core
4. `feature/auth-oidc-only`
   - enterprise login refactor
5. `feature/model-alias-policy`
   - internal model abstraction
6. `feature/service-account-governance`
   - machine identity support

---

## Suggested Milestone Mapping

### Milestone 1: Internal baseline

- Remove public commerce features
- Restrict auth paths
- Prepare internal deployment profile

### Milestone 2: Identity and policy

- OIDC-only login
- Role/group mapping
- Internal model aliasing

### Milestone 3: Governance

- Service accounts
- Quota and budget control
- Stronger audit search

### Milestone 4: Operability

- Internal dashboards
- Alerting
- Automated upstream sync process

---

## Final Recommendation

For this project, the best Git design is:

- One internal monorepo
- One production branch plus one integration branch
- Feature branches by business domain
- Internal docs under `docs/internal/`
- Periodic upstream sync instead of frequent structural rewrites

This keeps the codebase easy to modify now, while leaving room for larger refactors later.
