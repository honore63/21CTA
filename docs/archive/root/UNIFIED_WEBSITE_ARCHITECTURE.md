# Unified 21CTA Website Architecture

## 1. Purpose

The 21CTA platform is a unified multi-school educational technology system that combines public marketing, auth, school administration, teacher tooling, student/parent access, reporting, and the existing lesson-planner and marks-management workflows into one application.

This architecture preserves the proven functionality already in the codebase while centralizing access, data, and navigation behind a single backend and MySQL data layer.

## 2. System Goals

- One website, one auth system, one user identity
- Multi-school isolation with role-based permissions
- Shared student, teacher, class, subject, and academic records
- Modular support for lesson planner, marks, library, attendance, timetable, CPD, and analytics
- Protected admin controls for schools and platform settings
- Central API and database access across all modules

## 3. High-Level Architecture

```text
Browser / Mobile App
        |
        v
React Frontend (Vite)
  - Public site
  - Auth screens
  - Shared dashboard shell
  - Role-based module pages
        |
        v
Unified Backend API (Express)
  - Auth + sessions + RBAC
  - Platform settings
  - Resource CRUD endpoints
  - Module services
  - School isolation middleware
        |
        v
MySQL 21cta Database
  - Users, schools, roles, permissions
  - Student, teacher, class, subject records
  - Lesson planner tables
  - Marks, attendance, library, timetable, CPD data
        |
        v
External Services
  - AI providers (Gemini / Groq)
  - Email / notifications
  - File storage / uploads
```

## 4. Frontend Layer

### Public site
- Landing page
- About, features, schools, contact, FAQ, privacy, terms
- Login, registration, forgot-password, reset-password

### Authenticated workspace
- Shared navigation shell
- Sidebar + topbar
- Breadcrumbs and search
- Alerts, notifications, profile menu

### Role-based dashboard groups
- Super admin
- School admin
- Headteacher
- DoS
- Teacher
- Student
- Parent
- Librarian
- Configurable staff roles

## 5. Backend Layer

The backend should expose a centralized API with these responsibilities:

- Authentication and token validation
- Password reset and profile update flows
- Role-based access control
- School-scoped filtering and enforcement
- Resource CRUD through unified handlers
- Module-specific services for lesson planner and marks
- Reporting and analytics endpoints
- Notifications and announcements

## 6. Data Model Principles

- One school record for each institution
- One user identity used across multiple modules
- One class record reused by marks, timetable, diary, attendance
- One subject record reused across academic modules
- One academic year and term structure used across the entire platform
- Shared IDs and foreign keys for student, teacher, and school references

## 7. Core Entities

- users
- schools
- school_memberships
- roles
- permissions
- academic_years
- terms
- classes
- class_subjects
- subjects
- teachers
- students
- parents
- school_modules
- announcements
- notifications
- lesson_plans
- lessons
- lesson_materials
- materials
- assessments
- marks
- attendance
- timetables
- library_resources
- cpd_records

## 8. Security Model

- All requests must validate the authenticated user
- Use school scope enforcement on school-specific operations
- Use module permissions for route and UI access
- Remove implicit trust on frontend-only conditionals
- Use server-side validation for all forms and exports
- Backups and audit logs for high-impact actions

## 9. Integration Rules

- Preserve existing lesson planner tables and generation logic
- Preserve marks workflows, approvals, and formulas
- Do not duplicate class, teacher, or subject records in module-specific storage
- Use centralized school context when resolving the working school
- Add module mapping so each resource belongs to a module

## 10. Recommended Route Groups

### Public routes
- /
- /about
- /features
- /modules
- /schools
- /contact
- /login
- /register
- /forgot-password
- /reset-password

### Dashboard routes
- /dashboard/super-admin
- /dashboard/school-admin
- /dashboard/headteacher
- /dashboard/dos
- /dashboard/teacher
- /dashboard/student
- /dashboard/parent
- /dashboard/librarian

### Module routes
- /modules/lesson-planner
- /modules/marks-management
- /modules/digital-library
- /modules/assessment
- /modules/class-diary
- /modules/attendance
- /modules/timetable
- /modules/ai-assistant
- /modules/cpd
- /modules/teacher-portfolio
- /modules/communication
- /modules/analytics

## 11. Implementation Approach

1. Keep the current frontend and backend structure stable
2. Add a unified platform shell and navigation layer
3. Connect public site pages to shared layout components
4. Implement auth and school context APIs
5. Add role dashboards and route guards
6. Integrate lesson-planner and marks module pages into the shell
7. Add remaining modules as route-backed pages
8. Verify cross-school isolation and module permissions
9. Run regression checks before release

## 12. Deployment Notes

- Use the existing MySQL 21cta database as the canonical database
- Keep environment variables on the backend only
- Serve API and frontend from the same hosting strategy or via proxy
- Run build validation before deployment
- Keep rollback backups and migration scripts

## 13. Acceptance Criteria

The unified architecture is complete when:

- all public pages are available
- the auth system is centralized
- dashboards respect role and school
- lesson planning and marks remain functional
- modules are available through unified navigation
- data integrity is preserved across modules
- exports, reports, and actions work with current schemas
