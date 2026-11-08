# DEPLOYMENT_PLAN.md

> **Historical target note (2026-11-08):** This plan predates MySQL unification and shows both managed databases. Use [`MYSQL_UNIFICATION_PLAN.md`](MYSQL_UNIFICATION_PLAN.md) for the database target and approval gates; the deployment topology below is not approval to provision or cut over production.

**Project:** 21CTA
**Target:** one public domain, one login, three environments, preserved managed databases
**Status:** plan only — no infrastructure has been provisioned

---

## 1. Target topology

```
                         Internet
                            │
                    DNS: 21cta.com
                            │
                 ┌──────────▼──────────┐
                 │  Caddy / Nginx      │  TLS, HTTP/2, security headers,
                 │  (reverse proxy)    │  rate limiting, request limits
                 └──────────┬──────────┘
                            │ private Docker network
        ┌───────────────────┼────────────────────┬───────────────────┐
        │                   │                    │                   │
 ┌──────▼──────┐     ┌──────▼──────┐      ┌──────▼──────┐     ┌──────▼──────┐
 │ 21CTA Web   │     │ 21CTA API   │      │ Worker      │     │ Redis       │
 │ React build │     │ NestJS      │      │ BullMQ jobs │     │ queue/cache │
 │ static      │     │ /api/v1     │      │             │     │             │
 └─────────────┘     └──────┬──────┘      └──────┬──────┘     └─────────────┘
                            │                    │
             ┌──────────────┼────────────────────┤
             │              │                    │
     ┌───────▼──────┐ ┌─────▼─────────┐  ┌───────▼────────┐
     │ Supabase     │ │ System A      │  │ Object storage │
     │ PostgreSQL   │ │ Express API   │  │ Supabase /     │
     │ Auth/Storage │ │ (MySQL)       │  │ Cloudinary     │
     └──────────────┘ └───────┬───────┘  └────────────────┘
                              │
                       ┌──────▼──────┐
                       │ Managed     │
                       │ MySQL       │
                       └─────────────┘
```

**Key point:** the VPS runs only stateless application containers and Redis. PostgreSQL/Supabase and
MySQL remain managed services during the initial phases. No database port is published.

---

## 2. Environments

| Environment | Purpose | Data | Domain |
|---|---|---|---|
| Development | local coding | synthetic fixtures only | `localhost` |
| Staging | integration, migration rehearsal, UAT | anonymised or synthetic; never production PII | `staging.21cta.com` |
| Production | live schools | real data | `21cta.com` |

Rules:

- Separate Supabase projects and MySQL databases per environment. Never point staging at production.
- Separate secrets per environment. No copy-paste of production keys.
- Migrations run in staging first, with timing and lock measurements.
- Feature flags gate new modules by school.

---

## 3. DNS and routing

### 3.1 DNS records

| Record | Target | Notes |
|---|---|---|
| `A 21cta.com` | VPS IPv4 | apex |
| `AAAA 21cta.com` | VPS IPv6 (optional) | if supported |
| `CNAME www` | `21cta.com` | redirect to apex |
| `A staging` | staging VPS or same VPS, different vhost | protect with auth |
| `CAA` | Let's Encrypt / chosen CA | restrict issuance |
| `MX`/`TXT` | email provider | SPF, DKIM, DMARC |

Use a short TTL (300 s) during cutover, then normal.

### 3.2 Path routing

| Path | Served by | Notes |
|---|---|---|
| `/` | 21CTA Web | public homepage |
| `/login`, `/register`, `/forgot-password` | 21CTA Web + Supabase Auth | one login |
| `/dashboard` | 21CTA Web | role-aware |
| `/schools` | 21CTA Web + API | public directory / admin |
| `/lesson-planner/*` | 21CTA shell → System A frontend or embedded module | same session via adapter |
| `/marks/*` | 21CTA shell → existing RMS-MIS SPA (pilot) | single-school until tenant isolation |
| `/library/*` | 21CTA shell → library module | existing library tables |
| `/assessment/*` | 21CTA shell → exam module | existing exam tables |
| `/class-diary`, `/attendance`, `/timetable` | 21CTA Web + API | new modules |
| `/ai-assistant` | 21CTA Web + API | provider service |
| `/cpd`, `/teacher-portfolio` | 21CTA Web + API | new modules |
| `/students`, `/parents` | 21CTA Web + API | verified links |
| `/analytics` | 21CTA Web + API | scoped queries |
| `/notifications`, `/profile`, `/settings` | 21CTA Web + API | shared |
| `/school-management` | 21CTA Web + API | school admin |
| `/admin` | 21CTA Web + API | platform admin |
| `/api/v1/*` | 21CTA API | versioned contract |
| `/legacy/*` | internal only | not publicly documented |

The reverse proxy must route by path prefix, not by hostname, so the platform truly uses one domain.

### 3.3 Headers

- HSTS (`max-age=31536000; includeSubDomains; preload`) after TLS is stable.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` minimal
- CSP tuned per app; legacy RMS may keep a temporary exception while embedded.
- `Cache-Control: no-store` for HTML and authenticated API responses.
- Long immutable caching for hashed static assets only.

---

## 4. Container plan

`infra/docker-compose.yml` (illustrative):

| Service | Image/build | Port | Persistence |
|---|---|---|---|
| `proxy` | Caddy 2 | 80/443 | certificates volume |
| `web` | multi-stage Node build → static files | internal 80 | none |
| `api` | NestJS production image (non-root) | internal 3000 | none |
| `worker` | same image, different command | none | none |
| `redis` | Redis 7 with AOF | internal 6379 | volume |

Optional later: `pdf` service, `meilisearch`, `minio` (only if storage must be self-hosted), monitoring.

Guidelines:

- Multi-stage builds; production image excludes dev dependencies.
- Run as non-root; read-only filesystem where possible.
- Health checks for `api`, `worker`, `redis`, `proxy`.
- Resource limits (CPU/memory) to prevent one module starving the platform.
- Log to stdout; the host collects/rotates.
- Pin image digests for production deploys.

**Suggested VPS starting point (estimate, not a quote):** 4 vCPU, 8 GB RAM, 160 GB SSD for the app
tier; scale based on load tests. Managed databases are separate and not sized here.

---

## 5. Configuration and secrets

### 5.1 Environment variables (names only)

**Platform**
```
NODE_ENV
APP_URL
API_BASE_URL
PORT
LOG_LEVEL
```

**Supabase**
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server/worker only, never shipped to browser
SUPABASE_JWKS_URL
SUPABASE_JWT_ISSUER
SUPABASE_JWT_AUDIENCE
```

**System A adapter**
```
LESSON_API_BASE_URL
LESSON_API_AUDIENCE
LESSON_API_PRIVATE_KEY          # signs internal tokens
LESSON_API_PUBLIC_KEY           # used by System A to verify
LESSON_API_TIMEOUT_MS
```

**Redis / jobs**
```
REDIS_URL
QUEUE_PREFIX
```

**AI providers** (server only)
```
AI_DEFAULT_PROVIDER
GEMINI_API_KEY
GROQ_API_KEYS
AI_DAILY_LIMIT_TEACHER
AI_DAILY_LIMIT_SCHOOL
```

**Email / SMS**
```
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
MAIL_FROM
SMS_PROVIDER_URL
SMS_PROVIDER_KEY
```

**Observability**
```
SENTRY_DSN
OTEL_EXPORTER_OTLP_ENDPOINT
```

### 5.2 Handling rules

- `.env` is never committed. `.env.example` contains **placeholders only**.
- Production secrets live in a secret manager or the host's encrypted environment, injected at deploy.
- Rotate any credential that has ever been committed or shared in plain text.
- Separate keys for staging and production.
- Service-role and AI keys are available only to `api` and `worker`, never to `web`.
- Audit secret access; restrict who can read production variables.
- Enable secret scanning and block pushes containing known key patterns.

---

## 6. CI/CD

### 6.1 Pipeline

```
pull request
  ├─ lint + typecheck
  ├─ unit tests
  ├─ integration tests (ephemeral PostgreSQL + MySQL fixtures)
  ├─ build web + api
  ├─ security: dependency audit, secret scan, container scan
  ├─ OpenAPI validation
  └─ preview deploy (staging only, optional)

merge to development
  └─ deploy staging automatically

tag / manual approval
  └─ deploy production (blue/green or rolling)
```

### 6.2 Branching

- `main` — production-ready only.
- `development` — integration.
- `staging` — optional release branch.
- Feature branches per module: `feature/auth`, `feature/lesson-integration`, `feature/marks-integration`,
  `feature/library`, `feature/assessment`, `feature/class-diary`.
- Pull requests required; no direct pushes to `main`.
- Original repositories are never overwritten. Import their real histories into the new repo if the
  owners approve; otherwise keep them as read-only references.

### 6.3 Release artifacts

- Immutable container images tagged with git SHA.
- Database migration version recorded in `/api/v1/health/version`.
- Changelog entry required for user-visible changes.
- Rollback uses the previous image tag plus a tested compensating migration.

---

## 7. Database operations

### 7.1 Connectivity

- TLS required for MySQL and PostgreSQL.
- Restrict by IP allow-list where the provider supports it.
- Least-privilege database users: separate migration user and runtime user.
- Connection pooling at the app layer; monitor saturation.
- No public database ports; no direct browser access to MySQL.

### 7.2 Migrations

- Versioned SQL/TypeORM migrations, one logical change per file.
- Forward-only in production; every migration has a documented rollback or compensating action.
- Test on a production-sized snapshot in staging.
- Measure lock time; use concurrent index creation where supported.
- Never run the old System A auto-migration.

### 7.3 Backups

| Item | Policy |
|---|---|
| PostgreSQL | provider continuous backup + daily logical dump |
| MySQL | daily `mysqldump --single-transaction --routines --triggers` + provider snapshot |
| Encryption | at rest, separate key/account |
| Retention | 30 daily, 12 monthly, plus academic-year archives |
| Restore test | quarterly, into an isolated environment |
| RPO target | ≤ 15 minutes where PITR is available; otherwise ≤ 24 hours |
| RTO target | ≤ 4 hours for the platform; documented per database |

A backup that has not been restored is not a backup.

---

## 8. Monitoring and operations

### 8.1 Health

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready` (PostgreSQL, Redis, MySQL adapter, Supabase)
- `GET /api/v1/health/version`

### 8.2 Metrics and alerts

- Uptime and TLS expiry.
- HTTP 5xx rate, p95 latency, request volume.
- Database connections, slow queries, replication lag.
- Redis memory and queue depth.
- Worker failures and retry storms.
- AI spend and quota exhaustion.
- Auth failures, lockouts, role changes.
- Disk, memory, CPU, container restarts.
- Backup success/failure.

Alerts go to email and a chat channel; define on-call ownership before launch.

### 8.3 Logging

- Structured JSON with request ID, user ID (not email), school ID, route, status, latency.
- Central retention 30–90 days; audit logs retained per policy.
- No tokens, passwords, marks payloads or learner PII in application logs.
- Error tracking (Sentry or equivalent) with PII scrubbing.

### 8.4 Runbooks

- Service down / 502.
- Database connection exhausted.
- Redis down (degrade non-critical jobs).
- AI provider outage (disable generation gracefully).
- Suspected data leak / cross-school access.
- Certificate expiry.
- Restore from backup.
- Roll back a release.
- Rotate a compromised key.

---

## 9. Staging and production cutover

### 9.1 Staging acceptance

- [ ] All migrations applied cleanly.
- [ ] Two synthetic schools isolated (read/write/delete tests).
- [ ] One login works for System A and System B pilot accounts.
- [ ] Lesson generation, export and history work through the adapter.
- [ ] Marks entry → submit → approve → lock → report works.
- [ ] Library upload/search/download works.
- [ ] Exam start → autosave → submit → mark works.
- [ ] Backup restore verified.
- [ ] Load test at expected peak with headroom.
- [ ] Security headers and TLS grade acceptable.
- [ ] No secrets in built assets or logs.

### 9.2 Production cutover sequence

1. Freeze schema changes; announce the window.
2. Take fresh backups and verify checksums.
3. Deploy the new app tier behind the proxy with the legacy site still reachable.
4. Run smoke tests against `/api/v1/health/*` and key pages.
5. Switch DNS/route for the pilot school only.
6. Monitor errors, latency and auth failures for 60 minutes.
7. Enable additional schools in batches with a kill switch.
8. Keep the legacy route available for the rollback window (at least 14 days).

### 9.3 Rollback

- Re-point the proxy to the previous deployment/image.
- Restore the database only if a migration is proven unsafe; otherwise run the compensating migration.
- Revoke any tokens issued by a faulty deployment if identity behaviour changed.
- Record the incident and update the runbook.

---

## 10. Pre-flight checklist (Phase 2 gate)

- [ ] Domain ownership confirmed; DNS access available.
- [ ] VPS provisioned, hardened, firewall default-deny inbound except 80/443/SSH.
- [ ] SSH key-only access; no password login; fail2ban or equivalent.
- [ ] Automatic security updates enabled.
- [ ] Docker and compose installed from official sources.
- [ ] TLS issued and auto-renewal verified.
- [ ] Secrets generated and stored outside git.
- [ ] All previously exposed keys rotated.
- [ ] Supabase project ownership confirmed; staging project created.
- [ ] MySQL access confirmed; read-only inventory user created.
- [ ] Backups configured and a restore test completed.
- [ ] Monitoring and alerting reachable.
- [ ] CI/CD credentials scoped and stored as secrets.
- [ ] Incident contacts and escalation path documented.

---

## 11. Known dependencies and unknowns

| Dependency | Status | Impact if unavailable |
|---|---|---|
| Supabase project admin access | unknown | blocks central auth and PostgreSQL changes |
| MySQL credentials and write access | unknown | blocks school/user columns and adapter |
| Domain `21cta.com` ownership | unconfirmed | blocks production TLS and routing |
| Email sending domain and SMTP | unknown | blocks verification and invitations |
| SMS provider | unknown | optional; email fallback |
| AI provider keys | compromised in repo | must rotate before use |
| VPS provider and budget | unknown | blocks Phase 2 |
| Legal/privacy review | not started | blocks learner/parent production data |
| School pilot list | not provided | blocks staged onboarding |

Each unresolved dependency is documented rather than silently mocked.
