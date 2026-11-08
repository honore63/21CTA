# 21CTA — Project Structure

## Root Directory

| File | Purpose |
|---|---|
| `README.md` | Project overview, architecture, setup, and contribution guidelines |
| `LICENSE` | Project license (MIT or as applicable) |
| `CONTRIBUTING.md` | Contribution guidelines and development principles |
| `CHANGELOG.md` | Version change log |
| `.gitignore` | Git ignore patterns — node_modules, .env, uploads, backups |
| `.env.example` | Example environment variables (never commit real secrets) |
| `docker-compose.yml` | Docker orchestration (if/when production deployment) |
| `DATABASE_MIGRATION_REPORT.md` | Migration execution report |

## Frontend (`apps/lesson-planner/frontend/`)

| Directory | Purpose |
|---|---|
| `public/` | Static assets: images, fonts, favicon |
| `src/app/` | Root-level page components (LandingPage, AboutUsPage, etc.) |
| `src/routes/` | Route definitions and navigation configuration |
| `src/layouts/` | Page layouts: PublicLayout, DashboardLayout, AuthLayout |
| `src/pages/` | All page components organized by category |
| ` src/public/` | Public website pages (home, about, schools, features, contact) |
| ` src/school-portal/` | Individual school portal pages |
| ` src/authentication/` | Login, register, forgot password, reset password |
| ` src/dashboards/` | Role-specific dashboards (super-admin, school-admin, headteacher, dos, teacher, student, parent, librarian, staff) |
| ` src/modules/` | Module-specific pages (lesson-planner, marks-management, digital-library, assessments, class-diary, attendance, timetable, ai-assistant, cpd, teacher-portfolio, students, teachers, parents, communication, analytics) |
| ` src/services/` | API services (platformApi, authService, notificationService) |
| ` src/hooks/` | Custom React hooks (useAuth, usePlatform, useVisitorTracker, useSocket) |
| ` src/context/` | React contexts (AuthContext, PlatformContext, i18n context) |
| ` src/permissions/`, ` src/navigation/` | Permission and navigation logic |
| ` src/i18n/` | Dictionaries: en, fr, rw, sw |
| ` src/types/` | TypeScript type definitions (if applicable) |
| ` src/utils/` | Utility functions (csvEscape, formatDate, parseIntOrNull, etc.) |
| ` src/styles/` | CSS files: pages.css, ui.css, PlatformLayout.css, responsive-overrides.css, design-system.css |
| ` package.json` | Frontend dependencies and scripts |
| ` vite.config.js` | Vite configuration |
| ` package-lock.json` | Lockfile |

## Backend (`apps/lesson-planner/backend/`)

| Directory | Purpose |
|---|---|
| `src/config/` | Configuration: database, rateLimit, JWT, CORS |
| `src/core/` | Core: middleware, guards, validators, errors, utilities |
| ` src/core/middleware/` | authMiddleware, platformAuth, rateLimit middleware |
| ` src/core/guards/` | requirePermission, requireModule, requireSuperAdmin |
| ` src/core/validators/` | Request body/param/query validators |
| ` src/core/errors/` | Custom error classes and error handler |
| ` src/core/utilities/` | Reusable utility functions |
| ` src/modules/` | Module-specific route groups |
| ` src/modules/authentication/` | Auth routes and logic |
| ` src/modules/users/` | User CRUD, role assignment, permissions |
| ` src/modules/roles/` | Role management, permission assignment |
| ` src/modules/schools/` | School CRUD, update status, module toggles |
| ` src/modules/school-portals/` | School portal management |
| ` src/modules/students/` | Student CRUD, profiles, class assignments |
| ` src/modules/teachers/` | Teacher CRUD, qualifications, subject specialization |
| ` src/modules/parents/` | Parent CRUD, student-linkage, communication |
| ` src/modules/lesson-planner/` | Lesson plan CRUD, AI generation, curriculum management |
| ` src/modules/marks-management/` | Marks entry, approval lifecycle, CSV export |
| ` src/modules/digital-library/` | Resource CRUD, book loans, returns |
| ` src/modules/assessments/` | Assessment creation, scheduling, results publication |
| ` src/modules/class-diary/` | Diary entries, class notes, multimedia |
| ` src/modules/attendance/` | Student attendance, teacher attendance, bulk operations |
| ` src/modules/timetable/` | Timetable creation, day-of-week grid, conflict detection |
| ` src/modules/ai-assistant/` | AI chat queries, session management |
| ` src/modules/cpd/` | CPD activity enrollment, completion tracking |
| ` src/modules/notifications/` | Platform notifications, announcements, read/unread |
| ` src/modules/analytics/` | Dashboard stats, performance data, export reports |
| ` src/integrations/` | External service integrations (Gemini, Groq — optional) |
| ` src/jobs/` | Background jobs (email queue, report generation) |
| ` src/events/` | Event emitters and listeners |
| ` src/api/` | API route definitions (platformRoutes.js is the single platform router) |
| ` src/server.js` | Express app setup, middleware, rate limiters, port listening |
| ` migrations/` | Database migration files (lesson-planner/, platform/) |
| ` scripts/` | Helper scripts (import_db.js, backup, etc.) |
| ` .env` | Backend environment variables (git-ignored) |
| ` .env.example` | Example env vars template |
| ` package.json` | Backend dependencies and scripts |
| ` package-lock.json` | Lockfile |
| ` uploads/` | Uploaded files: lesson plans, resources, profile photos, reports |

## Database (`database/`)

| Directory | Purpose |
|---|---|
| ` schema/` | Master schema organization by module |
| ` migrations/` | Idempotent migrations in dependency order |
| ` seeders/` | Seed data: 003_platform_seed.sql (idempotent), 003_seed_platform_complete.sql (reference) |
| ` reference/` | Reference schemas: mysql/ (lessonplan-mysql-schema-only.sql), postgres/ (30+ upgrade scripts — reference only) |
| ` documentation/` | MD files: DATABASE_ARCHITECTURE.md, MYSQL_MASTER_SCHEMA.md, etc. |
| ` backups/` | Automated and manual database backups |
| ` tests/` | Database validation and integration tests |

## Infrastructure (`infrastructure/`)

| Directory | Purpose |
|---|---|
| ` docker/` | Docker configurations (if/when production deployment) |
| ` deployment/` | Deployment scripts and guides |
| ` nginx/` | Nginx reverse proxy config (if/when production) |
| ` monitoring/` | Health check and monitoring scripts |
| ` backup-scripts/` | Automated backup scripts (PowerShell, bash) |

## Tests (`tests/`)

| Directory | Purpose |
|---|---|
| ` unit/` | Unit tests for utilities, validators, helpers |
| ` integration/` | Integration tests for API endpoints, module behavior |
| ` regression/` | Regression tests: Lesson Planner (18/18), Marks (32/32), Integration (24/24) |
| ` security/` | Security tests: RBAC, school isolation, auth boundaries |

## Docs (`docs/`)

| Directory | Purpose |
|---|---|
| ` architecture/` | Architecture diagrams, system design documents |
| ` database/` | Database architecture, migration reports, relationship diagrams |
| ` api/` | API documentation, endpoint references |
| ` modules/` | Module-specific documentation |
| ` security/` | Security audit reports, vulnerability assessments |
| ` deployment/` | Deployment guides, production configuration |
| ` user-guides/` | User guides for each role and module |

## Scripts (`scripts/`)

| Directory | Purpose |
|---|---|
| ` setup/` | Project setup scripts |
| ` migration/` | Migration execution and verification scripts |
| ` backup/` | Backup and restore scripts |
| ` testing/` | Test execution and reporting scripts |
| ` deployment/` | Deployment automation scripts |

---
*Structure last verified: All 17 roles work, build passes, 54/54 tests pass.*