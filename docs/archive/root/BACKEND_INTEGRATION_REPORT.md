# Backend Integration Report

## 1. Current Backend State

The app backend is running as a unified Express API and already includes:

- auth routes
- school and platform routes
- dashboard and module APIs
- security middleware
- rate limiting
- socket initialization
- queue and file service hooks

Key file:
- apps/lesson-planner/backend/src/server.js

## 2. Present Capabilities

- user auth and JWT validation
- database connectivity checks
- health endpoints
- protected API path groups
- chat and AI route support
- upload and content serving setup
- platform route handlers for school-aware APIs

## 3. Required Integration Work

- align all module resources to a single RBAC service
- enforce module membership on school-level requests
- standardize response payloads and error codes
- add a consistent route registry for public and protected pages
- maintain school-scope filtering for every list response
- enforce server-side access control for writes and deletes

## 4. Recommended Backend Structure

```text
backend/src/
  config/
  controller/
  middleware/
  routes/
  services/
  utils/
  validators/
```

## 5. Integration Focus Areas

- Auth and session management
- School scope resolution
- Module enablement and RBAC
- Shared resource APIs
- Notification and announcement APIs
- Reporting and analytics APIs
- AI service integration with safe fallback handling

## 6. Security and Stability Rules

- Do not auto-apply destructive schema changes at startup
- Use server-side validations regardless of frontend form state
- Preserve the existing MySQL schema as the system of record
- Treat platform settings as server-managed, not client-managed
- Log important admin actions for audit review
