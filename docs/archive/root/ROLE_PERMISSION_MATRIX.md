# Role and Permission Matrix

## 1. Role Overview

The unified system should support the following role groups:

- Super Administrator
- School Administrator
- Headteacher
- Director of Studies
- Teacher
- Student
- Parent
- Librarian
- ICT Administrator
- Examination Officer
- Department Head
- CPD Coordinator
- School Secretary
- Accountant
- Support Staff

## 2. Permission Model

Permissions should be modular and action-based, for example:

- users.read
- users.create
- users.update
- users.delete
- schools.read
- schools.create
- schools.update
- subjects.read
- subjects.manage
- marks.read
- marks.create
- marks.verify
- marks.approve
- lesson_plans.read
- lesson_plans.create
- lesson_plans.export
- library.read
- library.upload
- attendance.read
- attendance.manage
- timetable.read
- timetable.manage
- analytics.read

## 3. Matrix

| Role | School Admin | Users | Marks | Lesson Plans | Library | Attendance | Timetable | Reports | Settings |
|---|---|---|---|---|---|---|---|---|---|
| Super Administrator | Full | Full | Full | Full | Full | Full | Full | Full | Full |
| School Administrator | Full for own school | Full for own school | Full for own school | Full for own school | Full for own school | Full for own school | Full for own school | Full for own school | Full for own school |
| Headteacher | Limited | Limited | Read + summary | Read + monitor | Read | Read + monitor | Read | Full school | Limited |
| Director of Studies | Limited | Limited | Full marks lifecycle | Monitor + approve | Read | Full | Full schedule | Full academic | Limited |
| Teacher | No | Limited self | Add/edit own class marks | Full own lessons | Read | Full own class | Read own schedule | Limited class | Limited |
| Student | No | Read self | Read own marks | Read own lesson plans | Read resources | Read own attendance | Read own timetable | Read own reports | Limited |
| Parent | No | Read self | Read linked child marks | Read linked records | Read | Read linked child attendance | Read linked child timetable | Read linked child reports | Limited |
| Librarian | No | No | No | No | Full resource management | No | No | Read library analytics | Limited |
| ICT Admin | Limited | Limited | No | Limited | Limited | Limited | Limited | Limited | System config |
| Examination Officer | Limited | No | Full exam workflow | No | No | No | Limited | Full exam reports | Limited |
| Department Head | Limited | No | Monitor department marks | Monitor department lesson plans | Read | Monitor attendance | Read schedule | Department reports | Limited |
| CPD Coordinator | Limited | Read staff | No | Read teacher planning | No | No | No | CPD analytics | Limited |
| School Secretary | Limited | Limited user records | No | No | No | Read | Read | Basic admin reports | Limited |

## 4. Enforcement Rules

- Super admin bypasses school scope only for platform-level actions.
- Other roles are restricted by school_id and module membership.
- A user cannot read or write records from another school.
- Module access is controlled both in the UI and API.
- Writes must also validate the user’s permission and module assignment.

## 5. Recommended Implementation

Use a centralized RBAC service with:

- roles
- permissions
- role_permissions
- school_memberships
- school_modules

This allows module enablement and role-based access to be managed without hard-coding route rules into the frontend.
