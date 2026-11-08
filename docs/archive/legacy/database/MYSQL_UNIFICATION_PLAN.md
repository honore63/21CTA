# MySQL Unification Plan

**Project:** 21CTA  
**Decision:** MySQL is the target and only operational relational database after a verified, approved migration.  
**Status:** Audit and design stage; no live database was contacted.  
**Date:** 2026-11-08

## 1. Target

Converge lesson planning and RMS-MIS on one MySQL 8.0+ InnoDB database, one backend API, and one unified frontend. The backend owns authentication, authorization, transactions, and all database access. A browser must never connect directly to MySQL or receive database credentials.

This decision supersedes the PostgreSQL target and Supabase Auth recommendation in the earlier Phase 1 architecture documents. Supabase Storage may remain temporarily as a separately assessed object-storage service; this does not permit any application module to depend on Supabase PostgreSQL or Supabase Auth after final cutover.

## 2. Safety invariants

1. Do not alter production schemas, move production data, switch traffic, or delete a database under this plan without the required owner approval.
2. Keep the original PostgreSQL/Supabase project available and unchanged as a rollback/reference source until migration verification and a separate decommission approval.
3. No migration starts until each source has two independent backups, at least one successful isolated restore, and a captured live schema/object inventory.
4. Never infer identity links from names. Email matches are candidates only; require verified user action or documented administrator approval.
5. Never infer a school assignment from unreviewed free-text names. Ambiguous source records remain quarantined, not assigned to a guessed tenant.
6. All migration steps are repeatable or resumable, logged, checksummed, and idempotent by source identity. Preserve original IDs as source keys.
7. Do not copy production personal data into developer environments. Staging data must be access-controlled and protected to the same standard as production.
8. Credentials and password hashes are secrets. Do not place dumps, credentials, or real user exports in this repository.

## 3. Destination architecture

- **Relational store:** one MySQL database, InnoDB, `utf8mb4`, strict SQL mode, UTC timestamps, foreign keys, explicit unique/index constraints, and short transactions.
- **Identity:** MySQL-backed account and credential records; password hashes using Argon2id or bcrypt; revocable server-side sessions/refresh credentials; expiring, single-use, hashed reset tokens; optional MFA.
- **Authorization:** backend RBAC with platform roles and school memberships. Each request resolves the authenticated user, active membership, school, and permission from trusted server-side records. A supplied school ID is a selector, never proof of access.
- **API:** one backend API is the only relational data access path. SQL uses parameterized statements and transactions for related writes. All list, export, search, background-job, and report paths enforce the same school scope.
- **Client:** one integrated frontend; no MySQL connection strings, service credentials, or privileged tokens in browser code.
- **Files and events:** object storage and WebSocket/event delivery are independent services. Replace Supabase-specific database/auth calls; keep other Supabase services only if they remain explicitly needed and independently secured.

## 4. Controlled stages and exit gates

| Stage | Work | Exit gate |
|---|---|---|
| 0. Ownership and access | Name data owners/operators; confirm MySQL, PostgreSQL, Supabase Auth, Storage, deployment and DNS ownership; confirm legal/data-retention requirements. | Written scope and approvals; production change freeze window identified. |
| 1. Live inventory and protection | Capture live DDL, table/column/index/FK metadata, views, triggers, routines, extensions, RLS policies, Auth settings, Storage buckets/policies, row counts, data sizes and application release SHAs. Create checksummed backups and restore each into isolated environments. | Restore evidence, inventory, count baseline, backup access/retention, and rollback owner recorded. No production writes. |
| 2. Mapping and conflict resolution | Approve source-to-target mapping, identity/school maps, identifier strategy, duplicate report, orphan report, enum/status mappings, file references and unsupported data decisions. | Every source object and record class has an approved destination or documented exclusion; no ambiguous identity/school mapping is silently accepted. |
| 3. Target schema and migration tooling | Implement versioned MySQL DDL, schema ledger, staging-only migrator, dry-run mode, checkpoint/resume, per-table counts, FK/orphan checks and audit output. | Clean MySQL staging schema builds reproducibly; migration runs twice without duplicates; rollback/restore test passes. |
| 4. Backend compatibility | Replace RMS browser-to-Supabase database access with API repositories; migrate System A runtime DDL into versioned MySQL migrations; implement centralized auth/RBAC, tenant filters, transactional workflows, storage adapter and event delivery. | Feature tests pass against staging; cross-school negative tests pass for API, exports, jobs and direct-object lookups. |
| 5. Staging data rehearsal | Restore protected copies into isolated staging, migrate both systems, resolve exceptions, compare record counts and relationships, validate file reachability and all module workflows. | Signed reconciliation report; business owners accept sample and aggregate checks; no unexplained loss, duplicates, or orphan references. |
| 6. Cutover rehearsal | Test maintenance/read-only window, final delta capture, migration duration, rollback to old service, DNS/routing and operator runbooks. | Rehearsal meets RPO/RTO and rollback succeeds. No production cutover yet. |
| 7. Production cutover | Take fresh backups, freeze writes, migrate final delta, reconcile, smoke-test, and route traffic only after explicit production-switch approval. Keep the source PostgreSQL system intact and read-only during the observation period. | Named data owner approves switch; all acceptance checks pass; rollback remains viable. |
| 8. Retirement | Remove old operational PostgreSQL/Auth dependencies only after the agreed observation period, verified MySQL backups, retention/legal review and explicit decommission approval. | Separate written approval to decommission; no module or job still requires PostgreSQL/Supabase PostgreSQL. |

## 5. Migration controls

- Use a migration ledger with migration version, file checksum, applied timestamp and operator identity.
- Use a durable mapping table keyed by `(source_system, source_table, source_id)` with destination table/id, status, checksum, and error detail. This is the authoritative old-to-new identifier map.
- Preserve source UUIDs when collision-free and compatible. For legacy integer keys, retain them in mapping/legacy-key columns; do not assume equal IDs across systems identify the same person or entity.
- Use deterministic UUID-to-MySQL representation during initial transition (`CHAR(36)` with ASCII/binary collation) unless a tested binary representation is approved. Do not change public IDs as part of the first data move.
- Migrate parent/reference rows before dependent rows. Use bounded batches, per-batch commits, checkpointing and dead-letter/error reporting. Disable no constraints silently; if loading requires deferred checks, re-enable and verify before acceptance.
- Treat files, audit history, AI prompts, temporary credentials, and reset tokens as sensitive. Migrate only the documented required fields; expire/reset secrets rather than copying invalid credentials.
- Use dual-read or shadow comparison only in non-production or through a controlled, read-only path. Avoid unbounded dual writes.

## 6. Required verification

- Exact per-table source and destination counts for in-scope data, plus counts for intentionally excluded/quarantined records.
- Deterministic checksums for selected high-value tables and normalized data comparisons for transformed columns.
- Zero unexpected FK orphans; verify relationship cardinalities and composite school boundaries.
- Login, registration, password reset, session revocation, every school role, and unauthorized cross-school access tests.
- Lesson plan history/materials, marks calculations and approval/lock states, report/export parity, assessments/attempts/answers, notifications, library metadata/files, attendance, timetable, diary, CPD, and audit-log checks.
- API, scheduled jobs, background workers, realtime replacement, and deployment configuration scans for PostgreSQL/Supabase database or Auth dependencies.
- Backup and restore of the final MySQL database, and a rehearsed rollback before any traffic switch.

## 7. Current blockers

The workspace has source snapshots and backup tooling, but no verified live schema, row counts, production backups/restores, Supabase Auth export/configuration, or staging database. No migration script can yet be considered safe or complete against production because the deployed source can differ from the committed snapshot. These are Stage 0/1 prerequisites, not assumptions to fill with invented data.

## 8. Approval boundaries

Approval is required before (a) applying a change to either production database, (b) running production migration writes, (c) switching production traffic, and (d) deleting or decommissioning PostgreSQL/Supabase resources. Approval of this plan alone does not authorize any of those actions.
