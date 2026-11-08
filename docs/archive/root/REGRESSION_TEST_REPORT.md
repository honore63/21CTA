# Regression Test Report

## 1. Core Test Areas

- route access
- auth flow
- role permissions
- school isolation
- module enablement
- dashboard rendering
- form validation
- CRUD operations
- report generation
- export actions
- app startup and health checks

## 2. Recommended Regression Checklist

### Public site
- home page loads
- about page loads
- contact page loads
- login/register pages load
- forgot/reset flows render correctly

### Auth
- valid login succeeds
- invalid login fails cleanly
- session is preserved across route navigation
- logout clears token and session state

### Role-based access
- super admin sees platform-level pages
- school admin sees only own school data
- teacher cannot access other school data
- student cannot modify marks or users
- parent sees only linked child records

### Module tests
- lesson planner generates valid plan output
- marks workflow allows valid updates and blocks invalid ones
- library listing and upload flows work
- attendance and timetable pages render current records
- communication/notifications display relevant messages

### Data integrity
- no duplicate user records
- no duplicate class or subject records across modules
- school IDs remain consistent on all writes

## 3. Evidence to Collect

- browser screenshots
- API response statuses
- database row counts before and after action
- audit logs for writes
- permission failure cases (403/404) as expected

## 4. Release Gate

Do not declare the project complete until:
- all core routes pass smoke tests
- RBAC checks pass
- cross-school access is blocked
- module feature flows are confirmed
- no critical console errors remain
