# 21CTA — API Documentation

## Base URL

| Environment | Base URL |
|---|---|
| **Development** | `http://localhost:5000/api/platform` |
| **Production** | To be configured (domain + HTTPS) |

All API endpoints use JSON responses. Error responses follow the format:
```json
{ "success": false, "code": "ERROR_CODE", "message": "Human-readable error", ... }
```

---

## Public Endpoints (No Authentication Required)

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/api/public/home` | Public homepage data | `{ success: true, data: { /* homepage content */ } }` |
| `GET` | `/api/public/schools` | List all schools | `{ success: true, data: [school, ...], pagination: { page, limit, total} }` |
| `GET` | `/api/public/schools/:slug` | Specific school portal | `{ success: true, data: { school, ... } }` |
| `GET` | `/api/public/library/home` | Digital library home | `{ success: true, data: { resources, categories } }` |
| `GET` | `/api/public/library/categories` | Resource categories | `{ success: true, data: [category, ...] }` |
| `GET` | `/api/public/library/resources` | List library resources | `{ success: true, data: [resource, ...], pagination }` |
| `GET` | `/api/public/library/resources/:id` | Specific resource detail | `{ success: true, data: { resource } }` |
| `POST` | `/api/public/register-school` | Register new school request | `{ success: true, data: { registration, temp_password? }, message }` |
| `POST` | `/api/public/register-user` | Register new user request | `{ success: true, data: { registration, temp_password? }, message }` |

**Rate Limiter**: `publicLimiter` applies (20 failed attempts/15min, per-user keying after first auth).

---

## Authenticated Platform Endpoints

All authenticated endpoints require:
1. `Authorization: Bearer <token>` header
2. Successful `platformAuth` middleware (user must exist, not suspended, have active school membership)
3. Optional: `X-School-Id` header for school context

### Session & Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/platform/me` | ✅ | Current user profile and platform context |
| `PUT` | `/api/platform/me/preferences` | ✅ | Update user preferences (language, theme) |
| `PUT` | `/api/platform/me/profile` | ✅ | Update user profile (name, phone) |

### Dashboards and Insight

| Method | Endpoint | Guards | Description |
|---|---|---|---|
| `GET` | `/api/platform/overview` | `requireModule('dashboard'), requirePermission('dashboard.view')` | Platform overview stats |
| `GET` | `/api/platform/analytics` | `requireModule('reports'), requirePermission('reports.view')` | Analytics data |
| `GET` | `/api/platform/search` | — | Global search across resources |

### Notifications

| Method | Endpoint | Guards | Description |
|---|---|---|---|
| `GET` | `/api/platform/notifications` | `requireModule('notifications'), requirePermission('notifications.view')` | `{ notifications, announcements, unread, pagination }` |
| `POST` | `/api/platform/notifications/read-all` | `requireModule('notifications'), requirePermission('notifications.view')` | Mark all as read |
| `POST` | `/api/platform/notifications/:id/read` | `requireModule('notifications'), requirePermission('notifications.view')` | Mark specific as read |

### Reports

| Method | Endpoint | Guards | Description |
|---|---|---|---|
| `GET` | `/api/platform/reports/:type` | `requireModule('reports'), requirePermission('reports.view')` | Report data (varies by `:type`) |
| `GET` | `/api/platform/reports/:type/export` | `requireModule('reports'), requirePermission('reports.export')` | **CSV blob** download |

**`/platform/reports/:type` and `/platform/reports/:type/export` (authenticated CSV blob).**

### Generic Resource CRUD

| Method | Endpoint | Guards | Description |
|---|---|---|---|
| `GET` | `/api/platform/resources/:resource` | `resourceModuleGuard, requirePermission(resource)` | List resources |
| `GET` | `/api/platform/resources/:resource/:id` | `resourceModuleGuard, requirePermission(resource)` | Get one resource |
| `POST` | `/api/platform/resources/:resource` | `resourceModuleGuard, requirePermission(resource)` | Create resource |
| `PUT` | `/api/platform/resources/:resource/:id` | `resourceModuleGuard, requirePermission(resource)` | Update resource |
| `DELETE` | `/api/platform/resources/:resource/:id` | `resourceModuleGuard, requirePermission(resource)` | Remove resource |

**Resource module mapping** (in `platformRoutes.js`):
- `students` → `students` module
- `teachers` → `teachers` module
- `parents` → `students` module
- `classes` → `classes` module
- `subjects` → `subjects` module
- `assessments` → `assessment` module
- `marks` → `marks` module
- `attendance` → `attendance` module
- `timetable` → `timetable` module
- `library` → `library` module
- `loans` → `library` module
- `diary` → `diary` module
- `cpd` → `cpd` module
- `portfolio` → `cpd` module
- `announcements` → `notifications` module
- `terms` → `settings` module

**Mark lifecycle**:
- `POST /api/platform/marks/:id/approve` — `requireModule('marks'), requirePermission('marks.approve')`
- `POST /api/platform/marks/:id/lock` — `requireModule('marks'), requirePermission('marks.lock')`
- `POST /api/platform/marks/:id/reopen` — `requireModule('marks'), requirePermission('marks.lock')`

**Library returns**:
- `POST /api/platform/loans/:id/return` — `requireModule('library'), requirePermission('library.manage', 'library.borrow')`

### Administration

| Method | Endpoint | Guards | Description |
|---|---|---|---|
| `GET` | `/api/platform/users` | `requireModule('users'), requirePermission('users.view')` | List users with pagination, available_roles |
| `POST` | `/api/platform/users` | `requireModule('users'), requirePermission('users.manage')` | Create user |
| `PUT` | `/api/platform/users/:id` | `requireModule('users'), requirePermission('users.manage')` | Update user |
| `PUT` | `/api/platform/users/:id/roles` | `requireModule('users'), requirePermission('users.manage')` | Set user roles |
| `POST` | `/api/platform/users/:id/reset-password` | `requireModule('users'), requirePermission('users.manage')` | Reset user password |
| `GET` | `/api/platform/schools` | `requireModule('school'), requirePermission('school.view')` | List schools with counts |
| `POST` | `/api/platform/schools` | `requireSuperAdmin` | Create school (super-admin only) |
| `PUT` | `/api/platform/schools/:id` | `requireModule('school'), requirePermission('school.manage')` | Update school |
| `GET` | `/api/platform/registrations` | `requireModule('registrations'), requirePermission('registrations.review')` | List pending registrations |
| `POST` | `/api/platform/registrations/:id/review` | `requireModule('registrations'), requirePermission('registrations.review')` | Review registration (approve/reject) |
| `GET` | `/api/platform/settings` | `requirePermission('settings.view')` | Get platform and school settings |
| `PUT` | `/api/platform/settings` | `requirePermission('settings.manage')` | Update settings |
| `GET` | `/api/platform/audit` | `requireModule('audit'), requirePermission('audit.view')` | List audit logs |
| `GET` | `/api/platform/modules` | `requirePermission('dashboard.view')` | List modules with enabled/disabled status |
| `PUT` | `/api/platform/modules/:code` | `requirePermission('modules.manage', 'settings.manage')` | Toggle module enabled/disabled |

**`/platform/users` returns** `{data, pagination, available_roles}`; `assignableRoleCodes` excludes `school_admin` for non-super-admins.

**`/platform/modules`** returns modules with `school_enabled` flag; per-school toggles via `school_modules` table.

---

## Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/platform/public-login` | Login with email/password (returns JWT token) |
| `POST` | `/api/public/register-school` | Register school request (public) |
| `POST` | `/api/public/register-user` | Register user request (public) |

**Login**: `POST /api/platform/public-login` with `{ email, password }` → returns `{ token, user, ... }`.

**Rate Limiting**: 20 failed auth attempts per 15 minutes (`skipSuccessfulRequests: true`). After successful auth, per-user keying via SHA-256 of bearer token.

---

## API Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Authentication required — missing/invalid token |
| `USER_NOT_FOUND` | 401 | Account no longer exists |
| `ACCOUNT_SUSPENDED` | 403 | Account has been suspended |
| `NO_SCHOOL` | 403 | Not linked to an active school |
| `SCHOOL_FORBIDDEN` | 403 | Requested school not in allowed list |
| `PERMISSION_DENIED` | 403 | Missing required permission |
| `MODULE_DISABLED` | 403 | Module not enabled for working school |
| `SUPER_ADMIN_REQUIRED` | 403 | Action restricted to platform super administrators |
| `PENDING_APPROVAL` | 403 | Membership awaiting administrator approval |

---

## Response Formats

### Success Response

```json
{
  "success": true,
  "data": { /* resource data */ },
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```

### Error Response

```json
{
  "success": false,
  "code": "PERMISSION_DENIED",
  "message": "You do not have permission to perform this action.",
  "required": ["marks.read"],
  "missing": []
}
```

### CSV Export Response

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="marks-export-YYYYMMDD.csv"`
- Standard CSV with headers and data rows

---
*API documentation verified: All 17 roles tested, RBAC 403s correct, school isolation verified, module guard verified, build passes.*