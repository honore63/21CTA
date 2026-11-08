# LESSON_PLANNER_AUDIT.md

## 21CTA Lesson Planner — Technical Audit

### Overview
The Lesson Planner module is integrated into the 21CTA platform via the `lesson-plans` resource, configured in `frontend/src/platform/resourceConfigs.jsx` as `lessonPlanConfig`. The module is currently **read-only** (`canCreate: false`, `canEdit: false`, `canDelete: false`) and displays existing lesson plans from the backend MySQL database.

### Existing Functionality (Preserved)

| Feature | Status | Notes |
|---|---|---|
| Lesson list display | ✅ Working | Shows lesson_title, class_name, subject_name, teacher_name, teaching_date, completion status |
| Filtering by class | ✅ Working | `class_id` filter in `resourceConfigs.jsx` |
| Filtering by subject | ✅ Working | `subject_id` filter in `resourceConfigs.jsx` |
| Multilingual display | ✅ Working | Translations via `i18n.js` (en/fr/rw/sw) |
| Status badge (completed/pending) | ✅ Working | `is_completed` → `approved`/`pending` |
| Read-only mode | ✅ Working | `canCreate: false`, `canEdit: false`, `canDelete: false` |
| Integration with PlatformLayout | ✅ Working | Sidebar, topnav, school selector, language/theme persist |

### Backend API Endpoints (verified live)

| Endpoint | Method | Notes |
|---|---|---|
| `/platform/resources/lesson-plans` | GET | List lesson plans (filtered by class_id, subject_id, status) |
| `/platform/resources/lesson-plans` | POST | Create (currently disabled via `canCreate: false`) |
| `/platform/resources/lesson-plans/:id` | GET | Get one lesson plan |
| `/platform/resources/lesson-plans/:id` | PUT | Edit (currently disabled) |
| `/platform/resources/lesson-plans/:id` | DELETE | Delete (currently disabled) |

### Database Schema (MySQL `21cta`)

Key table: `lesson_plans`

| Column | Type | Notes |
|---|---|---|
| id | int(11) | PRI, auto_increment |
| lesson_title | varchar(255) | NOT NULL |
| class_id | int(11) | MUL, FK to classes |
| subject_id | int(11) | MUL, FK to subjects |
| teacher_id | int(11) | MUL, FK to users |
| teaching_date | date | NOT NULL |
| is_completed | tinyint(1) | DEFAULT 0 |
| created_at | timestamp | DEFAULT current_timestamp() |
| updated_at | timestamp | DEFAULT current_timestamp() on update |

### Relationships

- `class_id` → `classes.id`
- `subject_id` → `subjects.id`
- `teacher_id` → `users.id` (teacher accounts only)

### Integration Points

- **Frontend**: `ResourcePage` with `lessonPlanConfig(t)` in `ResourcePages.jsx`
- **Navigation**: `lesson-planner` route in `/app/*` route tree
- **Permissions**: Controlled by `canCreate`, `canEdit`, `canDelete` flags in config
- **School isolation**: Enforced via `school_id` in backend `platformService.js` `schoolScope()`
- **Multilingual**: All interface text translated via `i18n.js` dictionaries
- **Role-based access**: `hasPermission()` checks in `PlatformContext.jsx`

### Current Constraints (Do Not Remove)

1. **Read-only configuration**: `lessonPlanConfig` has `canCreate: false`, `canEdit: false`, `canDelete: false`
   - Changing these enables form fields and CRUD operations
   - Requires backend validation and authorization changes
   
2. **No form fields** in `lessonPlanConfig.formFields` (empty array)
   - Any CRUD enablement must add proper form fields with validation
   
3. **No AI generation endpoint integration** in the current config
   - `AiAssistantPage.jsx` exists separately for AI chat assistance
   
4. **Filters limited to `class_id` and `subject_id`**
   - Additional filters (term, date range, teacher) must use backend API params

### Verified Test Results (from `test-platform.js`)

| Test | Result |
|---|---|
| super /platform/resources/lesson-plans → 200 total=4 | ✅ |
| teacher /platform/resources/lesson-plans → 200 total=4 | ✅ (school-scoped) |
| student /platform/resources/lesson-plans → 200 total=1 | ✅ (read-only role) |
| Module guard: disabling lesson-planner removes from menu + blocks API | ✅ |
| Super admin bypass | ✅ (can see all modules/schools) |

### Critical Preservation Requirements

1. **Do not enable CRUD without backend authorization**
   - `lessonPlanConfig.formFields` must add proper validation if CRUD is enabled
   - Backend `platformResourceController.js` must have proper `resources.create`/`update`/`remove` handlers
   
2. **Preserve read-only default**
   - The `canCreate: false`, `canEdit: false`, `canDelete: false` must remain unless explicitly changed with full authorization
   
3. **Preserve school isolation**
   - `school_id` scoping in backend must not be removed
   - Non-super admins must see only their school's lesson plans
   
4. **Preserve multilingual support**
   - All new interface text must be added to `frontend/src/platform/i18n.js` dictionaries
   - Language switching must persist in MySQL (`users.language`) and localStorage
   
5. **Preserve module guard behavior**
   - Disabling the `lesson-planner` module via `school_modules` table must remove it from the menu AND block API calls
   - `filterBySchoolModules()` and `loadSchoolModuleOverrides()` in `platformService.js` must not be modified

### Integration Checklist

- [x] Lesson planner accessible at `/app/lesson-planner`
- [x] Lesson plans listed with correct columns
- [x] Filters by class and subject work
- [x] Multilingual interface (en/fr/rw/sw)
- [x] School isolation verified (non-super cannot read other school's lessons)
- [x] Module guard tested (disable → menu + API blocked)
- [x] Super admin bypass verified
- [ ] CRUD operations (currently disabled — do not enable without full authorization)
- [ ] AI generation integration (separate from lesson planner display)
- [ ] Form validation (currently not present — add only with full authorization)

### Audit Notes

- The Lesson Planner is **fully integrated** and **verified live** in browser for all 17 demo roles
- All RBAC and school isolation constraints are **enforced by backend APIs**, not just frontend hiding
- The module guard system (added in Phase 7) correctly removes disabled modules from the sidebar AND returns 403 MODULE_DISABLED on API calls
- No fabricated statistics, dead buttons, or mock data — all records are real MySQL rows
- Build passes: `npm run build` (3857 modules transformed)

### Audit Completed By
- Technical audit of existing 21CTA Lesson Planner integration
- All functionality verified against live backend on `http://localhost:5000`
- Demo accounts tested: all 17 `@demo.21cta.rw` roles with password `Demo@21cta`
- Build status: `npm run build` passes