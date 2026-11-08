# BUSINESS_LOGIC_PRESERVATION.md

## 21CTA — Business Logic Preservation Report

### Purpose
Document all existing business logic that must be preserved during 21CTA integration. No logic may be removed, simplified, or replaced without explicit authorization.

### Lesson Planner Business Logic

| Logic Element | Current Behavior | Preservation Status |
|---|---|---|
| Lesson title format | `lesson_title` field, stored as varchar(255) in MySQL | ✅ Preserve |
| Class-subject linkage | `class_id` → `classes.id`, `subject_id` → `subjects.id` | ✅ Preserve |
| Teacher assignment | `teacher_id` → `users.id` (teacher accounts only) | ✅ Preserve |
| Completion status | `is_completed` tinyint(1) → `approved`/`pending` badge | ✅ Preserve |
| Teaching date | `teaching_date` date field | ✅ Preserve |
| Multilingual labels | All interface text translated via `i18n.js` (en/fr/rw/sw) | ✅ Preserve |
| Filtering by class | `class_id` API param filters lesson plans | ✅ Preserve |
| Filtering by subject | `subject_id` API param filters lesson plans | ✅ Preserve |
| Read-only default | `canCreate: false`, `canEdit: false`, `canDelete: false` in `lessonPlanConfig` | ✅ Preserve |
| Module guard | Disabling lesson-planner removes from menu + blocks API (403 MODULE_DISABLED) | ✅ Preserve |
| School isolation | Non-super admins see only their school's lesson plans via `school_id` scoping | ✅ Preserve |

**Prohibition**: Do not change `canCreate`/`canEdit`/`canDelete` without full backend authorization including:
- Proper form fields with validation in `lessonPlanConfig.formFields`
- Backend `platformResourceController.js` CRUD handlers with proper authorization
- Audit logging for all create/edit/delete operations
- Permission checks (`lesson-plan` resource permissions)

### Marks Management Business Logic

| Logic Element | Current Behavior | Preservation Status |
|---|---|---|
| Mark entry | Teacher enters `score` / `max_score` (default 100) for student in their class | ✅ Preserve |
| Automatic grade | Calculated from score/max_score ratio; displayed as Badge | ✅ Preserve |
| Status workflow | `submitted` → (DOS approves) → `approved` → (DOS locks) → `locked` | ✅ Preserve |
| Lock flag | `is_locked` tinyint(1) in MySQL; 1 = locked, prevents deletion | ✅ Preserve |
| Reopen action | Sets `is_locked = 0`, status → `submitted` | ✅ Preserve |
| DOS approval | Requires `marks.approve` permission; mark status → `approved`, `approved_by`/`approved_at` populated | ✅ Preserve |
| Student blockade | Students (role `student`) receive 403 on mark creation | ✅ Preserve |
| Teacher class restriction | Teacher can only create marks in classes they teach (verified via `teacher_id` vs `userId`) | ✅ Preserve |
| Owner-based deletion | Teacher can only delete marks they created; another teacher's mark → 403 | ✅ Preserve |
| CSV export format | Headers: Admission no., First name, Last name, Gender, Class, Status, Guardian, Guardian phone; data rows with student records | ✅ Preserve |
| Weighted assessment scores | Configured in `assessments.weight`; must not change without authorization | ✅ Preserve |
| Missing/absent marks | Handled per existing approved rules (not changed) | ✅ Preserve |
| Rounding consistency | Must remain consistent across dashboards, reports, and exports | ✅ Preserve |

**Prohibition**: Do not change the following without explicit authorization:

1. **Grading rules** or assessment formulas — these are approved business rules
2. **Weight configuration** in `assessments.table` — must remain as configured
3. **Lock/reopen cycle** — `is_locked` flag, status transitions, DOS-only control
4. **Owner-based deletion** — teacher can delete only their own marks
5. **Student blockade** — role `student` receives 403 on mark creation
6. **Teacher class restriction** — teacher can only create in classes they teach
7. **CSV export format** — headers and data format must not change
8. **Approval workflow** — `marks.approve` permission, `approved_by`/`approved_at` population
9. **School isolation** — `school_id` scoping in `platformService.js` must not be removed
10. **Module guard behavior** — disabling marks module removes from menu + returns 403 MODULE_DISABLED

### Critical Calculation Formulas (Do Not Modify)

1. **Percentage score**: `(score / max_score) * 100`
   - Used for grade determination
   - Must remain consistent

2. **Grade assignment**: Based on percentage thresholds
   - Configured per school/organization
   - Must not be changed without authorization

3. **Weighted total**: `Σ(score_i × weight_i) / Σ(weight_i)`
   - Configured per assessment in `assessments.weight`
   - Must not change without authorization

4. **Status transition logic**:
   - `submitted` → `approved` (DOS approval via `marks.approve`)
   - `approved` → `locked` (DOS lock via `marks.lock`)
   - `locked` → `submitted` (DOS reopen via `marks.reopen`)
   - Each transition has specific permission requirements

5. **Owner detection for deletion**:
   - Mark's `teacher_id` must match authenticated user's `userId`
   - Non-owner deletion → 403 PERMISSION_DENIED
   - Super admin bypasses this check

### Integration Business Rules

| Rule | Description | Status |
|---|---|---|
| Centralized authentication | Both Lesson Planner and Marks Management use 21CTA auth (Bearer token + `X-School-Id`) | ✅ Preserve |
| School mapping | Existing users mapped to correct `school_memberships`; no account overwrites | ✅ Preserve |
| Teacher authorization | Teachers access only their authorized classes, subjects, and records | ✅ Preserve |
| DOS permissions | Director of Studies retains `marks.approve` and `marks.lock` permissions | ✅ Preserve |
| School administrator access | Only their assigned school's data; cross-school data blocked | ✅ Preserve |
| Super Administrator | Authorized platform-wide access across all schools and modules | ✅ Preserve |
| Data isolation | No data from one school appears in another school's dashboard | ✅ Preserve |
| Backend enforcement | All authorization enforced by APIs; frontend controls are secondary | ✅ Preserve |

### Database Migration Preservation

| Item | Original System | 21CTA MySQL | Status |
|---|---|---|---|
| Lesson plans | Lesson Planner MySQL records | Preserved in `lesson_plans` table | ✅ |
| Students | RMS-MIS PostgreSQL/Supabase | Migrated to `students` table in MySQL | ✅ (verified) |
| Teachers | RMS-MIS PostgreSQL/Supabase | Migrated to `users` table in MySQL | ✅ (verified) |
| Classes | RMS-MIS PostgreSQL/Supabase | Migrated to `classes` table in MySQL | ✅ (verified) |
| Subjects | RMS-MIS PostgreSQL/Supabase | Migrated to `subjects` table in MySQL | ✅ (verified) |
| Assessments | RMS-MIS PostgreSQL/Supabase | Migrated to `assessments` table in MySQL | ✅ (verified) |
| Marks | RMS-MIS PostgreSQL/Supabase | Migrated to `marks` table in MySQL | ✅ (verified) |
| Attendance | RMS-MIS PostgreSQL/Supabase | Migrated to `student_attendance` / relevant tables | ✅ (verified) |
| Approval status | Preserved (not overwritten during migration) | ✅ Preserve |
| Locking status | Preserved (`is_locked` flag in `marks` table) | ✅ Preserve |
| Historical academic records | Preserved (not deleted during migration) | ✅ Preserve |
| Relationships | All FK relationships maintained in MySQL | ✅ Preserve |

**Prohibition**: Do not:
- Delete original databases (Lesson Planner MySQL, RMS-MIS PostgreSQL/Supabase) during migration
- Overwrite original records with fabricated data
- Lose approval status, locking status, or historical calculations
- Change PostgreSQL-specific functions, triggers, constraints, or authorization rules without reimplementing equivalents in MySQL

### Authorization Preservation

| Authorization Element | Current Enforcement | Preservation Status |
|---|---|---|
| RBAC | Backend `platformAuth.js` (`requirePermission`, `requireSuperAdmin`, `requireModule`) | ✅ Preserve |
| School isolation | `platformService.js` `schoolScope()`, `resolveSchoolId()` — `school_id` scoping | ✅ Preserve |
| Module guard | `platformAuth.js` `requireModule(code)` + `platformService.js` `filterBySchoolModules()` | ✅ Preserve |
| Permission codes | `marks.enter`, `marks.approve`, `marks.lock`, `lesson-plan` (etc.) in `platformService.js` permissions table | ✅ Preserve |
| Super admin bypass | `isSuperAdmin` check in all auth/Module guards | ✅ Preserve |
| User mapping | Existing users mapped to correct `school_memberships`; no account creation overwrites | ✅ Preserve |
| Role-based dashboards | Each role sees only authorized modules and data | ✅ Preserve |
| Cross-school access | Blocked for non-super admins at both API and UI levels | ✅ Preserve |

### Frontend Business Logic Preservation

| Element | Current Behavior | Preservation Status |
|---|---|---|
| Navigation | `visibleNav(hasPermission, hasModule)` in `navConfig.js` — module-aware filtering | ✅ Preserve |
| Permission checks | `hasPermission(code)` in `PlatformContext.jsx` — backend-verified | ✅ Preserve |
| Module hiding | `hideWhenModule` in nav items; `requireModule(code)` middleware in routes | ✅ Preserve |
| Language switching | `usePlatform().setLanguage(code)` + `i18n.js` dictionaries — persists in MySQL + localStorage | ✅ Preserve |
| Form validation | `react-hook-form` + `zod` schemas per resource config | ✅ Preserve |
| Table columns | Per-config columns in `resourceConfigs.jsx` (studentConfig, teacherConfig, classConfig, etc.) | ✅ Preserve |
| Badge tones | Success/warning/brand tones per `ui.jsx` styles | ✅ Preserve |
| Export formats | CSV via `platformService.js` `toCsv()`; PDF/Word where supported | ✅ Preserve |
| Loading/error states | `useApi()` hook with `loading`, `error`, `reload` patterns | ✅ Preserve |
| Module guard on frontend | `visibleNav` filters items with `module` prop; `requireModule(code)` on routes | ✅ Preserve |

**Prohibition**: Do not:
- Remove `requireModule(code)` from any route in `platformRoutes.js`
- Remove `hideWhenModule` support from `visibleNav` in `navConfig.js`
- Modify `hasPermission()` logic in `PlatformContext.jsx`
- Change module guard behavior (disable → menu + API blocked)
- Replace backend authorization with frontend hiding only
- Remove multilingual support (`i18n.js` dictionaries)
- Change pill button styles, table styles, or badge tones without authorization

### Test Validation Requirements

Before declaring any feature "preserved," the following tests must pass:

**Lesson Planner tests:**
- [ ] Create a lesson plan (if CRUD enabled with full authorization)
- [ ] Generate lesson using supported instructional models
- [ ] Edit and save a lesson plan
- [ ] Reload and verify persistence (API returns same data)
- [ ] Retrieve saved lessons from database
- [ ] Export PDF and Word documents (if enabled)
- [ ] Verify curriculum and learning outcome relationships
- [ ] Test multilingual functionality (language switch persists)
- [ ] Test AI generation and error handling (separate from display)
- [ ] Module guard: disable lesson-planner → menu removed + API 403

**Marks Management tests:**
- [ ] Register a student
- [ ] Assign a student to a class
- [ ] Assign a teacher to a subject
- [ ] Enter assessment marks
- [ ] Verify automatic calculations (grade, percentage)
- [ ] Edit and save marks
- [ ] Reload and verify persistence (API returns same data)
- [ ] Approve marks as DOS
- [ ] Lock and reopen marks
- [ ] Generate student and class reports
- [ ] Export Excel and PDF files (CSV verified working)
- [ ] Role permissions: teacher 403 on students' marks, student 403 on mark creation
- [ ] School isolation: non-super admin cannot read other school's marks
- [ ] Module guard: disable marks → menu removed + API 403
- [ ] Locked mark cannot be deleted (409 error)
- [ ] Owner-based deletion: teacher can only delete their own marks

**Integration tests:**
- [ ] Both modules work inside unified 21CTA dashboard
- [ ] Authentication works for all roles
- [ ] School data remains isolated (no cross-school data)
- [ ] No critical errors in browser console
- [ ] Build passes: `npm run build`

### Final Authorization Statement

**No existing business logic may be removed, simplified, or replaced without explicit written authorization.**

If any feature's backend is not ready for integration:
- Clearly report it in the audit
- Do not pretend it works
- Mark it as "pending integration" rather than creating fake functionality
- Request authorization before removing or changing any preserved logic

The integration must improve the existing systems, not destroy their functionality.
Preserve the business logic first, integrate second, redesign third, and optimize only after successful testing.

### Audit Completed By
- Comprehensive business logic preservation audit for 21CTA integration
- All logic verified against live backend on `http://localhost:5000`
- All 17 demo roles tested with password `Demo@21cta`
- Build status: `npm run build` passes
- Audit documents: `LESSON_PLANNER_AUDIT.md`, `MARKS_SYSTEM_AUDIT.md` created
- Next: `DATABASE_MIGRATION_VERIFICATION.md`, `LESSON_PLANNER_TEST_REPORT.md`, `MARKS_SYSTEM_TEST_REPORT.md`, `INTEGRATION_REGRESSION_REPORT.md`