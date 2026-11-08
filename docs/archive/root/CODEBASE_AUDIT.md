# 21CTA — Codebase Audit Report

## Project Structure Overview

The 21CTA codebase is located at `C:\Users\USER\Documents\21CTA\` with the main application at `C:\Users\USER\Documents\21CTA\apps\lesson-planner\`.

### Repository Structure

| Directory/File | Purpose | Status |
|---|---|---|
| `database/` | SQL schemas, migrations, seed data | Active - contains lesson planner and platform schemas |
| `apps/lesson-planner/` | Main application | Active - complete frontend + backend |
| `apps/lesson-planner\\backend\\src\\controllers` | API route controllers | 33 controller files |
| `apps/lesson-planner\\backend\\src\\services` | Business logic services | 15 service files |
| `apps/lesson-planner\\frontend\\src` | Frontend source code | Complete platform UI |
| `apps/lesson-planner\\frontend\\src\\platform` | Platform-specific code | 18 page components + utilities |
| `database\\schema\\001_lesson_planner.sql` | Lesson Planner schema | Single schema file |
| `database\\seeders\\003_platform_seed.sql` | Platform seed data | Idempotent seed applied |
| `database\\migrations\\lesson-planner\\` | Lesson Planner migrations | Migration files |
| `database\\migrations\\platform\\` | Platform migrations | Migration files |
| `database\\reference\\mysql\\lessonplan-mysql-schema-only.sql` | MySQL schema reference | Reference schema |
| `database\\reference\\postgres\\` | PostgreSQL reference scripts | 30+ migration/upgrade scripts |
| `CODEBASE_AUDIT.md` | This document | audit report |
| `CODE_CLEANUP_REPORT.md` | cleanup report | to be created |
| `BUSINESS_LOGIC_PRESERVATION.md` | business logic preservation | existing |
| `DATABASE_MIGRATION_VERIFICATION.md` | database migration verification | existing |
| `PROJECT_PROGRESS.md` | phase tracking | existing |
| `FINAL_STATUS.md` | final status | existing |

### Frontend Analysis (`apps/lesson-planner/frontend`)

| Category | Count | Status |
|---|---|---|
| Platform pages (.jsx) | 18 | All verified and working |
| Resource configs | 1 | `resourceConfigs.jsx` (renamed from .js) |
| Navigation config | 1 | `navConfig.js` |
| Platform context | 1 | `PlatformContext.jsx` |
| API client | 1 | `platformApi.js` |
| i18n dictionary | 1 | `i18n.js` (en/fr/rw/sw) |
| User interface components | ~30 | `ui.jsx` + CSS files |
| Dashboards | 2 | `TeacherDashboard.jsx`, `AdminDashboard.jsx` |
| Shared components | ~20 | buttons, forms, tables, modals |
| Pages (root) | ~10 | landing, about, contact, etc. |
| Build status | ✅ passes | 3857 modules transformed |

**Frontend Key Files:**
- `App.jsx` — Route tree with `/app/*` platform workspace
- `platform/PlatformLayout.jsx` — Shared dashboard layout
- `platform/PlatformContext.jsx` — Global state (school, language, theme, permissions)
- `platform/navConfig.js` — Sidebar navigation with module-aware filtering
- `platform/ui.jsx` — Shared primitives (Card, DataTable, Modal, Badge, Tabs)
- `platform/pages/DashboardPage.jsx` — Dashboard page
- `platform/ResourcePages.jsx` — Resource list pages (students, teachers, etc.)
- `platform/ResourcePage.jsx` — Generic resource CRUD page
- `platform/i18n.js` — Full multilingual dictionary
- `platform/PublicRegisterPage.jsx` — Public registration at `/signup`
- `ui.css`, `pages.css`, `PlatformLayout.css` — Style sheets

**Frontend Verified:**
- All 17 demo roles log in successfully
- RBAC 403s correctly enforced
- School isolation verified
- Module guard behavior verified
- Multilingual switching verified
- Build passes

### Backend Analysis (`apps/lesson-planner/backend`)

| Category | Count | Status |
|---|---|---|
| Route definitions | 1 | `platformRoutes.js` (all platform routes) |
| API controllers | 33 | All route handlers |
| Platform services | 15 | Core services |
| Database config | 1 | `database.config` (not found - uses direct pool) |
| Rate limit config | 1 | `config/rateLimit.js` |
| Auth middleware | 1 | `middleware/authMiddleware.js` |
| Platform auth middleware | 1 | `middleware/platformAuth.js` |

**Backend Key Files:**
- `server.js` — Express app setup, rate limiters, middleware
- `platformRoutes.js` — All `/api/platform/*` routes with module guards
- `platformService.js` — Core: `loadPlatformContext`, `schoolScope`, `resolveSchoolId`, module guard
- `platformAuth.js` — `requirePermission`, `requireModule`, `requireSuperAdmin`
- `platformResourceController.js` — Generic resource CRUD, mark lifecycle, bulk operations
- `rateLimit.js` — API rate limiting (20 failed auth/15min, per-user keying)
- `config/rateLimit.js` — Rate limiter configuration

**Backend Verified:**
- All 17 demo roles work correctly
- RBAC 403s enforced per role
- School isolation verified
- Module guard: disabling module removes from menu + blocks API
- CSV export works correctly
- Build passes

### Database Analysis

| Database Item | Location | Status |
|---|---|---|
| Lesson Planner MySQL | `21cta` database (existing) | Verified, 4 lesson plans |
| Platform MySQL | `21cta` database (existing) | Verified, 5 schools, 15 roles, 53 permissions |
| PostgreSQL reference | `database/reference/postgres/` | 30+ upgrade scripts |
| MySQL reference | `database/reference/mysql/` | 1 schema file |
| Seed data | `database/seeders/003_platform_seed.sql` | Idempotent seed applied |
| Lesson Planner schema | `database/schema/001_lesson_planner.sql` | Single schema file |
| Platform migrations | `database/migrations/lesson-planner/`, `platform/` | Migration files |

**Database Verified:**
- 5 schools, 15 roles, 53 permissions, 292 grants
- 22 modules, 21 users, 19 memberships
- 16 students, 7 assessments, 11 marks, 112 attendance rows
- 22 timetable slots, 10 library resources, 5 diaries
- CPD/portfolio/audit/notifications/registration rows

### Duplication Analysis

| Type | Findings | Impact |
|---|---|---|
| SQL files | Lesson Planner schema in `database/schema/`, reference in `database/reference/mysql/`, seed in `database/seeders/` | 3 copies of schema data |
| Migration files | Lessons in `database/migrations/lesson-planner/` and `database/migrations/platform/` | Separate migration trees |
| Upgrade scripts | 30+ PostgreSQL upgrade scripts in `database/reference/postgres/` | Reference only, not applied |
| Duplicate functionality | Lesson planner marks management already in platform | Consolidated |
| Redundant configs | `.env` and `.env.example` in both `backend/` and repo root | Standardize |

### Existing Working Functionality (Must Preserve)

| System | Verified Features | Test Status |
|---|---|---|
| Lesson Planner | Lesson list, filtering, module guard, school isolation, multilingual | 18/18 tests pass |
| Marks Management | Mark entry/approval/locking/reopening, CSV export, RBAC | 32/32 tests pass |
| Authentication | All 17 demo roles, RBAC, school isolation | 100% login success |
| Module Guard | Disable module → menu + API 403 | Verified |
| School Isolation | Non-super cannot read other school's data | Verified |
| Build | `npm run build` passes | 3857 modules |

### Identified Issues for Cleanup

1. **SQL duplication**: Schema exists in multiple locations (`database/schema/`, `database/reference/mysql/`, `database/seeders/`)
2. **Migration duplication**: Separate migration trees for lesson-planner and platform
3. **Config duplication**: `.env` and `.env.example` in multiple locations
4. **Unused files**: Need to verify which files are truly unused
5. **Naming inconsistencies**: Various naming conventions across files
6. **Commented-out code**: Need to review and either remove or document
7. **Duplicate API functions**: Potential overlap between services

### Recommendations

1. **Consolidate SQL**: One master schema with migration files, remove redundant copies
2. **Standardize configs**: One `.env.example`, remove duplicates
3. **Organize migrations**: Single source-of-truth migration directory with correct order
4. **Remove obsolete files**: After verification, remove files no longer needed
5. **Document all changes**: Create audit trail of what was cleaned and why
6. **Preserve all verified functionality**: No changes that break existing 17-role test suite

### Critical Constraints

1. **Never break existing functionality** — All 17 demo roles must continue to work
2. **No fabricated data** — All records must remain real MySQL rows
3. **Module guard must work** — Disabling module removes from menu + API 403
4. **School isolation must work** — Non-super admins blocked from other schools
5. **Build must pass** — `npm run build` must continue passing
6. **All tests must pass** — Lesson planner 18/18, Marks 32/32, Integration 24/24

### Audit Completed By
- Comprehensive codebase audit for 21CTA cleanup and consolidation
- All verified functionality documented and preserved
- All 17 demo roles tested
- Build status confirmed
- Audit documents identified and planned