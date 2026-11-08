# Documentation archive

This directory holds documentation that has been **superseded** by
[`21CTA_MASTER_DOCUMENTATION.md`](../../21CTA_MASTER_DOCUMENTATION.md). The files are kept
for historical reference and audit trail only. They may describe designs, routes, counts,
or project states that were never implemented or that have since changed.

**Do not treat anything in this directory as current guidance.** When a file here
contradicts the code or the master document, the code and the master document win.

## Layout

| Path | Contents |
|---|---|
| `root/` | Former top-level reports and planning documents from the repository root (32 files). |
| `legacy/` | Former `docs/` planning, audit, database, and deployment material (26 files). Relative subpaths from `docs/` are preserved. |

## Root reports (`root/`)

`ALL_PAGES_AND_ROUTES.md`, `API_DOCUMENTATION.md`, `BACKEND_INTEGRATION_REPORT.md`,
`BUSINESS_LOGIC_PRESERVATION.md`, `CODE_CLEANUP_REPORT.md`, `CODEBASE_AUDIT.md`,
`CODEBASE_SUMMARY.md`, `DATABASE_ARCHITECTURE.md`, `DATABASE_CONSOLIDATION_PLAN.md`,
`DATABASE_MIGRATION_REPORT.md`, `DATABASE_MIGRATION_VERIFICATION.md`,
`DATABASE_RELATIONSHIPS.md`, `DEPENDENCY_AUDIT.md`, `DEPLOYMENT_GUIDE.md`,
`FINAL_STATUS.md`, `FRONTEND_IMPLEMENTATION_REPORT.md`,
`INTEGRATION_REGRESSION_REPORT.md`, `LESSON_PLANNER_AUDIT.md`,
`LESSON_PLANNER_TEST_REPORT.md`, `MARKS_SYSTEM_AUDIT.md`, `MARKS_SYSTEM_TEST_REPORT.md`,
`MODULE_DOCUMENTATION.md`, `MODULE_INTEGRATION_REPORT.md`, `PROJECT_PROGRESS.md`,
`PROJECT_STRUCTURE.md`, `PUBLIC_SCHOOL_PORTAL.md`, `REGRESSION_TEST_REPORT.md`,
`ROLE_PERMISSION_MATRIX.md`, `SECURITY_AUDIT.md`, `SESSION_COMPLETE.md`,
`SYSTEM_ARCHITECTURE.md`, `UNIFIED_WEBSITE_ARCHITECTURE.md`.

## Legacy `docs/` material (`legacy/`)

| File | Original location |
|---|---|
| `API_DOCUMENTATION.md` | `docs/API_DOCUMENTATION.md` |
| `DATABASE_DOCUMENTATION.md` | `docs/DATABASE_DOCUMENTATION.md` |
| `DEVELOPMENT_ROADMAP.md` | `docs/DEVELOPMENT_ROADMAP.md` |
| `PROJECT_AUDIT.md` | `docs/PROJECT_AUDIT.md` |
| `PROJECT_PROGRESS.md` | `docs/PROJECT_PROGRESS.md` |
| `SECURITY_AUDIT.md` | `docs/SECURITY_AUDIT.md` |
| `SYSTEM_ARCHITECTURE.md` | `docs/SYSTEM_ARCHITECTURE.md` |
| `api/API_INTEGRATION_MAP.md` | `docs/api/API_INTEGRATION_MAP.md` |
| `audit/API_INTEGRATION_MAP.md` | `docs/audit/API_INTEGRATION_MAP.md` |
| `audit/AUTHENTICATION_PLAN.md` | `docs/audit/AUTHENTICATION_PLAN.md` |
| `audit/DATABASE_MAP.md` | `docs/audit/DATABASE_MAP.md` |
| `audit/DEPLOYMENT_PLAN.md` | `docs/audit/DEPLOYMENT_PLAN.md` |
| `audit/MIGRATION_PLAN.md` | `docs/audit/MIGRATION_PLAN.md` |
| `audit/SYSTEM_AUDIT.md` | `docs/audit/SYSTEM_AUDIT.md` |
| `audit/phase-2/INTEGRATION_WORKSPACE.md` | `docs/audit/phase-2/INTEGRATION_WORKSPACE.md` |
| `audit/phase-2/PHASE_2_REMEDIATION.md` | `docs/audit/phase-2/PHASE_2_REMEDIATION.md` |
| `audit/phase-2/SYSTEM_AUDIT.md` | `docs/audit/phase-2/SYSTEM_AUDIT.md` |
| `database/DATABASE_MAP.md` | `docs/database/DATABASE_MAP.md` |
| `database/DATABASE_MIGRATION_REPORT.md` | `docs/database/DATABASE_MIGRATION_REPORT.md` |
| `database/FREEZE_MANIFEST.md` | `docs/database/FREEZE_MANIFEST.md` |
| `database/MIGRATION_PLAN.md` | `docs/database/MIGRATION_PLAN.md` |
| `database/MYSQL_SCHEMA_DOCUMENTATION.md` | `docs/database/MYSQL_SCHEMA_DOCUMENTATION.md` |
| `database/MYSQL_UNIFICATION_PLAN.md` | `docs/database/MYSQL_UNIFICATION_PLAN.md` |
| `database/POSTGRES_TO_MYSQL_MAPPING.md` | `docs/database/POSTGRES_TO_MYSQL_MAPPING.md` |
| `deployment/DEPLOYMENT_PLAN.md` | `docs/deployment/DEPLOYMENT_PLAN.md` |
| `security/AUTHENTICATION_PLAN.md` | `docs/security/AUTHENTICATION_PLAN.md` |

## What was retained instead

These files were **not** archived because they are still current or are required
operational/source-lineage references:

| Retained file | Reason |
|---|---|
| `README.md` (root) | Current concise introduction and navigation. |
| `21CTA_MASTER_DOCUMENTATION.md` | Canonical consolidated documentation. |
| `docs/security/KEY_ROTATION_RUNBOOK.md` | Sensitive, actionable rotation procedure. |
| `infrastructure/backup/README.md` | Backup/restore procedure and policy. |
| `apps/lesson-planner/README.md` | Source-lineage README. |
| `apps/marks/README.md` and its sub-READMEs | Source-lineage documentation. |
| `RMS-MMS-main/README.md` and its sub-READMEs | Original RMS-MIS snapshot documentation. |
| `digital_lesson_plan-main/README.md` | Original Lesson Planner snapshot documentation. |
| `archive/phase2-2026-11-08/README.md` | Existing phase archive index. |

## Important caveats about archived claims

Several archived documents state that the project is "100% complete", "production-ready",
"54/54 tests pass", or that the frontend build contains a fixed number of modules. These
claims are **not reproducible** from the current tree:

- There is no production deployment, domain, DNS, or TLS configuration.
- The backend `test` script is a placeholder that exits with an error.
- The only tests present are `apps/marks/tests/*.test.js` (and duplicates in
  `RMS-MMS-main/tests/`).
- Older route lists (`/api/public/*`, `/api/platform/public-login`,
  `/api/platform/lesson-planner`, `/api/platform/marks/export/csv`,
  `/api/platform/assessments/:id/publish`, `/api/platform/cpd/enroll`, `/api/platform/roles`,
  `/api/platform/permissions`) do not match the implemented router.
- "17 roles" is inaccurate: there are 15 role codes and 17 demo accounts.
- The Phase 1/2 Supabase/PostgreSQL, `apps/portal`, `apps/gateway`, Docker/Nginx plan was
  superseded by the implemented Express + MySQL platform.

See the master document's appendices for the full consolidation map and contradiction
record.
