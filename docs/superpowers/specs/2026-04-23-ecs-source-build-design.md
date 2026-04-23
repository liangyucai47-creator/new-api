# ECS Source-Build Deployment Design

## Goal

Provide an in-repo deployment bundle for a brand-new Alibaba Cloud ECS so the current forked codebase can be cloned, built from source with Docker, and started quickly.

## Scope

This design covers:

- Source-build deployment from the user's fork
- Single-node ECS deployment
- SQLite as the initial database
- Nginx reverse proxy in front of the app
- HTTP by default for the public-IP bootstrap
- A ready path to Let's Encrypt HTTPS once a real domain exists

This design intentionally does not cover:

- Multi-node deployment
- External PostgreSQL or Redis
- Kubernetes
- Managed TLS without a domain

## Assumptions

- ECS public IP is `8.160.190.198`
- The user will deploy from `https://github.com/liangyucai47-creator/new-api.git`
- The first production-like deployment should favor simplicity over scale
- HTTPS cannot be enabled on a bare public IP using public CA certificates, so the initial stack must remain HTTP until a domain is available

## Approach Options

### Option 1: Direct app exposure only

Expose the Go app on `5041` and skip a reverse proxy.

Pros:

- Fewest moving parts
- Fastest bootstrap

Cons:

- No clean path for TLS termination
- Harder to normalize public URLs
- Less production-like

### Option 2: Nginx plus direct debug port

Run the app on Docker port `3000`, expose it directly on `5041` for debugging, and also place Nginx on `80/443` as the preferred public entry.

Pros:

- Easy first bootstrap on a blank ECS
- Keeps a direct app port for emergency debugging
- Supports later domain-based HTTPS without redesign

Cons:

- Slightly more configuration than direct exposure only

### Option 3: Nginx plus external PostgreSQL/Redis

Add Nginx, PostgreSQL, and Redis from day one.

Pros:

- More scalable foundation

Cons:

- Too much operational overhead for an empty ECS bootstrap
- More secrets and state to manage before the app is even running

## Recommendation

Use Option 2.

It keeps the first deployment simple enough for a blank server while still preparing a proper public edge and a clean TLS upgrade path.

## Deliverables

- A source-build ECS compose file at repo root
- An ECS env template with IP-first defaults
- HTTP and HTTPS Nginx templates
- A bootstrap script for first server setup
- A certificate request script for domain cutover
- A Chinese deployment guide with exact commands for this ECS scenario

## Verification Strategy

- Validate YAML and Markdown syntax with formatter checks
- Validate shell scripts with `bash -n`
- Validate git patch integrity with `git diff --check`

## Risks and Mitigations

- Risk: user expects HTTPS on an IP
  Mitigation: document clearly that public CA TLS requires a domain; ship HTTP-by-default and a domain-only cert script.

- Risk: user clones code but still uses upstream prebuilt image
  Mitigation: the ECS compose file must use `build:` against the repo `Dockerfile`.

- Risk: ECS bootstrap drifts from actual repository layout
  Mitigation: keep build context at repo root and colocate deployment assets under `deploy/ecs`.
