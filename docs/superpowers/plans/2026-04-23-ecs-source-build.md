# ECS Source-Build Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-repo deployment bundle that lets a blank Alibaba Cloud ECS clone the user's fork, build this code from source, and run it behind Nginx with an HTTP-first path and a later HTTPS upgrade path.

**Architecture:** Keep the application container source-built from the repo root `Dockerfile`, pair it with a lightweight Nginx reverse proxy, and keep SQLite in a mounted data volume for the first deployment. Add shell helpers that bootstrap the HTTP stack first, then switch to Let's Encrypt HTTPS only after a real domain exists.

**Tech Stack:** Docker Compose, Nginx, Certbot, Bash, Markdown

---

### Task 1: Add ECS deployment assets

**Files:**
- Create: `docker-compose.ecs.yml`
- Create: `deploy/ecs/.env.ecs.example`
- Create: `deploy/ecs/nginx/http.conf.template`
- Create: `deploy/ecs/nginx/https.conf.template`
- Create: `deploy/ecs/nginx/certs/.gitkeep`
- Create: `deploy/ecs/nginx/www/.gitkeep`
- Modify: `.gitignore`

- [ ] Define an ECS compose stack that uses `build:` from the repo root `Dockerfile`, keeps SQLite in `./data`, exposes the app directly on `5041`, fronts it with Nginx on `80/443`, and includes Certbot services for certificate issuance and renewal.
- [ ] Add an environment template that defaults to the user's public IP `8.160.190.198`, uses HTTP by default, and clearly marks `SESSION_SECRET` and `LETSENCRYPT_EMAIL` expectations.
- [ ] Add separate Nginx templates for HTTP and HTTPS so the first deployment works on an IP and the later domain cutover only changes env values plus the selected template.
- [ ] Update `.gitignore` so runtime secrets and generated certificate material stay out of git while `.gitkeep` placeholders keep the directory structure intact.

### Task 2: Add ECS helper scripts

**Files:**
- Create: `deploy/ecs/scripts/bootstrap-ecs.sh`
- Create: `deploy/ecs/scripts/request-cert.sh`

- [ ] Add a bootstrap script that installs Docker on Debian/Ubuntu if missing, prepares the runtime directories, creates `deploy/ecs/.env.ecs` from the example when needed, auto-generates a `SESSION_SECRET` if still placeholder, and starts the HTTP stack with `docker compose up -d --build`.
- [ ] Add a certificate request script that requires a domain-based `PUBLIC_HOST`, runs Certbot in webroot mode, updates the env file to switch to the HTTPS Nginx template and `https://` server address, then starts the Nginx and renewal services under the `tls` profile.

### Task 3: Add ECS deployment documentation

**Files:**
- Create: `docs/installation/ecs-source-build.zh-CN.md`

- [ ] Document the exact flow for this user scenario: push current code to the fork, SSH to `8.160.190.198`, clone from `https://github.com/liangyucai47-creator/new-api.git`, copy the env example, run the bootstrap script, validate the stack, and later switch to HTTPS after pointing a domain to the ECS IP.
- [ ] Include exact commands for verification, update, restart, and log inspection so the deployment guide stands on its own.

### Task 4: Verify deployment bundle consistency

**Files:**
- Verify: `.gitignore`
- Verify: `docker-compose.ecs.yml`
- Verify: `deploy/ecs/**/*.template`
- Verify: `deploy/ecs/scripts/*.sh`
- Verify: `docs/installation/ecs-source-build.zh-CN.md`

- [ ] Run `git diff --check` and confirm there are no patch formatting issues.
- [ ] Run `bunx prettier --check docker-compose.ecs.yml deploy/ecs/.env.ecs.example docs/installation/ecs-source-build.zh-CN.md docs/superpowers/specs/2026-04-23-ecs-source-build-design.md docs/superpowers/plans/2026-04-23-ecs-source-build.md` and confirm the YAML and Markdown files parse cleanly.
- [ ] Run `bash -n deploy/ecs/scripts/bootstrap-ecs.sh deploy/ecs/scripts/request-cert.sh` and confirm both shell scripts pass syntax checks.
- [ ] Commit the deployment bundle with a deployment-focused commit message.
