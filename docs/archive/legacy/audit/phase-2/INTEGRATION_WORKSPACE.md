# 21CTA — Integration Workspace

**21st Century Teacher Assistant (21CTA)**
*Empowering Teachers Through Technology and Innovation.*

This folder is the **new integration workspace**. Both original applications remain in place.

| Path | Role | Status |
|---|---|---|
| `../digital_lesson_plan-main` | System A — 21st Century Lesson Plan Generator | Preserved; **three safety-only edits** in Phase 2 |
| `../RMS-MMS-main` | System B — RMS-MIS marks / school management | **Preserved, unmodified** |
| `./docs` | Audit, plans and remediation reports | Phase 1 + Phase 2 |
| `./db` | Frozen schema references | Phase 2 |
| `./infra` | Backup and restore tooling | Phase 2 |
| `./backups` | Pre-change file snapshots with hashes | Phase 2 |
| `./apps`, `./services` | Target platform code | **Not created — gated on Phase 2 completion** |

> No application code has been generated. No database has been connected to or
> altered. No deployment has occurred. The only source changes are the Phase 2
> safety fixes recorded in `docs/PHASE_2_REMEDIATION.md`.

## Current database direction

The approved target direction is **one MySQL database** for all operational relational data, with a
unified backend API and centralized MySQL-backed authentication. The following 2026-11-08 documents
are the current unification baseline and supersede the earlier PostgreSQL target and Supabase Auth
recommendations in the Phase 1 design documents:

- [MYSQL_UNIFICATION_PLAN.md](./docs/MYSQL_UNIFICATION_PLAN.md) — controlled stages, gates, and approvals.
- [POSTGRES_TO_MYSQL_MAPPING.md](./docs/POSTGRES_TO_MYSQL_MAPPING.md) — object/data conversion and authorization mapping.
- [DATABASE_MIGRATION_REPORT.md](./docs/DATABASE_MIGRATION_REPORT.md) — source audit findings and blockers.
- [MYSQL_SCHEMA_DOCUMENTATION.md](./docs/MYSQL_SCHEMA_DOCUMENTATION.md) — proposed logical MySQL schema.

This is a target decision, **not a completed migration**. No live database was inspected or changed;
production cutover and database decommissioning still require explicit approval.

## Documents

### Phase 1 — audit and plans (historical baseline)

1. [SYSTEM_AUDIT.md](./docs/SYSTEM_AUDIT.md) — architecture, modules, conflicts, security findings, risks, strategy.
2. [DATABASE_MAP.md](./docs/DATABASE_MAP.md) — table inventory, ownership, multi-tenant gaps, target schema.
3. [API_INTEGRATION_MAP.md](./docs/API_INTEGRATION_MAP.md) — existing APIs, target `/api/v1`, adapter contracts.
4. [AUTHENTICATION_PLAN.md](./docs/AUTHENTICATION_PLAN.md) — central identity, account linking, roles, token validation.
5. [DEPLOYMENT_PLAN.md](./docs/DEPLOYMENT_PLAN.md) — hosting, routing, containers, CI/CD, backup, rollback.
6. [MIGRATION_PLAN.md](./docs/MIGRATION_PLAN.md) — staged, reversible migration and validation plan.

### Phase 2 — remediation and safety

7. [PHASE_2_REMEDIATION.md](./docs/PHASE_2_REMEDIATION.md) — what changed, evidence, remaining blockers.
8. [KEY_ROTATION_RUNBOOK.md](./docs/KEY_ROTATION_RUNBOOK.md) — revocation steps for every exposed credential.
9. [db/FREEZE_MANIFEST.md](./db/FREEZE_MANIFEST.md) — schema snapshots and SHA-256 hashes.
10. [infra/backup/README.md](./infra/backup/README.md) — backup and restore-verification procedure.

## Read this first

The audit found **five blocking conditions**. Status after Phase 2 remediation:

| # | Condition | Status |
|---|---|---|
| B-1 | Exposed AI keys and a hardcoded MySQL password | **Removed from files; provider revocation still pending** |
| B-2 | Destructive startup auto-migration | **Fixed — `DROP TABLE` path removed** |
| B-3 | No tenant isolation in RMS-MIS | **Open — do not onboard a second school** |
| B-4 | No verified backups or restore test | **Tooling added; drill still required** |
| B-5 | Unverified account linking | **Open — design only** |

The most urgent remaining actions:

1. **Revoke and rotate every exposed credential** — see `docs/KEY_ROTATION_RUNBOOK.md`.
   Removing a secret from a file does not revoke it.
2. **Take backups and complete a restore drill** before any migration.
3. **Do not expose RMS-MIS to a second school** until `school_id` isolation and
   cross-school tests exist.
4. **Do not merge user accounts by name.** Linking must be verified or admin-approved.
5. **Do not run `clear-data.sql`.**

## Status

| Phase | Name | Status |
|---|---|---|
| 1 | Technical audit and architecture | **Complete — approved** |
| 2 | Hosting and infrastructure | **In progress — safety remediation done; credentials, backups and VPS outstanding** |
| 3 | Central authentication | MySQL-backed target documented; implementation pending live inventory and staging approval |
| 4 | Multi-school data model and permissions | Design ready; implementation pending |
| 5–15 | Unified frontend through national deployment | Not started |

See `docs/MIGRATION_PLAN.md` for gate criteria and `docs/PHASE_2_REMEDIATION.md`
for the current blocker list.
