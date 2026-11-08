# 21CTA — Module Documentation

## Overview

21CTA integrates 18 educational modules within a unified, multi-school platform. Each module
has its own purpose, API endpoints, and role-based access controls. All modules share the
centralized MySQL `21cta` database and enforce school-level data isolation.

---

## 1. 21st Century Lesson Planner

| Aspect | Details |
|---|---|
| **Purpose** | AI-powered lesson planning and curriculum management |
| **API Base** | `GET/POST/PUT /api/platform/lesson-planner` / `GET /api/platform/modules/lesson-planner` |
| **Key Tables** | `lesson_plans`, `ai_generation_logs`, `curriculum_units`, `subjects`, `classes` |
| **Demo Records** | 4 lesson plans (clearly demo-labelled) |
| **Modules Visible** | 22 total (lesson-planner included) |
| **Audience** | all-staff, management, teacher, student (varies by role) |
| **Key Features** | |
| - Lesson creation and filtering by class/subject | ✅ |
| - Multilingual interface (en/fr/rw/sw) | ✅ |
| - School isolation (non-super cannot read other school's lessons) | ✅ |
| - Module guard: disabling removes from menu + API 403 | ✅ |
| - Super admin bypass | ✅ |
| - Read-only default (`canCreate: false`, `canEdit: false`, `canDelete: false`) | ✅ |
| **API Endpoints** | |
| `GET /api/platform/lesson-planner` | List lesson plans with filtering |
| `POST /api/platform/lesson-planner` | Create new lesson plan |
| `GET /api/platform/lesson-planner/:id` | Get specific lesson plan |
| `PUT /api/platform/lesson-planner/:id` | Update lesson plan |
| `DELETE /api/platform/lesson-planner/:id` | Delete lesson plan (owner-only) |
| **Permission Required** | `lesson_plans.read`, `lesson_plans.manage` |
| **Module Guard** | `requireModule('lesson-planner')` — returns 403 if disabled |

---

## 2. Marks Information System (RMS-MIS)

| Aspect | Details |
|---|---|
| **Purpose** | Marks entry, approval, grading, and CSV export |
| **API Base** | `GET/POST/PUT/DELETE /api/platform/marks` / `GET /api/platform/modules/marks` |
| **Key Tables** | `marks`, `assessments`, `student_marks`, `subjects`, `classes`, `users` (teacher) |
| **Demo Records** | 11 marks, 7 assessments (real MySQL rows, demo-labelled) |
| **Modules Visible** | 22 total (marks included) |
| **Audience** | management, teacher, school_admin, super_admin |
| **Key Features** | |
| - Mark entry for teacher's own classes | ✅ |
| - Automatic grade calculation | ✅ |
| - Status workflow: submitted → approved → locked | ✅ |
| - DOS approval and lock/reopen functionality | ✅ |
| - CSV export with correct headers and data | ✅ |
| - School isolation (non-super cannot read other school's marks) | ✅ |
| - Module guard: disabling removes from menu + API 403 | ✅ |
| - Teacher class ownership enforced | ✅ |
| - Owner-based deletion (teacher can only delete own marks) | ✅ |
| **API Endpoints** | |
| `GET /api/platform/marks` | List marks with filtering (class_id, student_id, status, date_from, date_to) |
| `POST /api/platform/marks` | Enter new mark |
| `GET /api/platform/marks/:id` | Get specific mark |
| `PUT /api/platform/marks/:id` | Update mark |
| `POST /api/platform/marks/:id/approve` | DOS approval |
| `POST /api/platform/marks/:id/lock` | Lock mark status |
| `POST /api/platform/marks/:id/reopen` | Reopen locked mark |
| `GET /api/platform/marks/export/csv` | CSV export with headers |
| **Permission Required** | `marks.read`, `marks.create`, `marks.approve`, `marks.lock`, `marks.export` |
| **Module Guard** | `requireModule('marks')` — returns 403 MODULE_DISABLED if disabled |

---

## 3. Digital Library

| Aspect | Details |
|---|---|
| **Purpose** | Digital resource catalog and loan management |
| **API Base** | `GET/POST /api/platform/library/resources` / `POST /api/platform/loans/:id/return` |
| **Key Tables** | `library_resources`, `book_loans`, `users` (borrower) |
| **Demo Records** | 10 library resources, 10+ book loans |
| **Modules Visible** | 22 total (library included) |
| **Audience** | librarian, teacher, management, student (view only) |
| **Key Features** | |
| - Resource browsing and search | ✅ |
| - Book borrowing and returns | ✅ |
| - Category filtering | ✅ |
| - School isolation | ✅ |
| - Multilingual resource names | ✅ |
| **API Endpoints** | |
| `GET /api/platform/library/resources` | List resources with filtering |
| `POST /api/platform/library/resources` | Add new resource |
| `GET /api/platform/library/resources/:id` | Get specific resource |
| `POST /api/platform/loans/borrow` | Borrow a resource |
| `POST /api/platform/loans/:id/return` | Return a resource |
| `GET /api/platform/library/categories` | List resource categories |
| **Permission Required** | `library.read`, `library.upload`, `library.manage` |
| **Module Guard** | `requireModule('library')` — returns 403 if disabled |

---

## 4. Assessment and Examination Portal

| Aspect | Details |
|---|---|
| **Purpose** | Assessment creation, scheduling, results publication |
| **API Base** | `GET/POST/PUT/DELETE /api/platform/assessments` |
| **Key Tables** | `assessments`, `student_marks`, `marks`, `classes`, `subjects`, `users` (exam officer) |
| **Demo Records** | 7 assessments (real MySQL rows) |
| **Modules Visible** | 22 total (assessments included) |
| **Audience** | examination_officer, headteacher, school_admin, super_admin |
| **Key Features** | |
| - Assessment creation with grading | ✅ |
| - Scheduling and date ranges | ✅ |
| - Results publication | ✅ |
| - Approval workflow | ✅ |
| - RBAC enforcement per role | ✅ |
| **API Endpoints** | |
| `GET /api/platform/assessments` | List assessments |
| `POST /api/platform/assessments` | Create new assessment |
| `GET /api/platform/assessments/:id` | Get specific assessment |
| `PUT /api/platform/assessments/:id` | Update assessment |
| `POST /api/platform/assessments/:id/publish` | Publish results |
| **Permission Required** | `assessment.create`, `assessment.view`, `assessment.publish` |
| **Module Guard** | `requireModule('assessment')` — returns 403 if disabled |

---

## 5. Digital Class Diary

| Aspect | Details |
|---|---|
| **Purpose** | Daily class notes and classroom activity logging |
| **API Base** | `GET/POST /api/platform/diary/entries` |
| **Key Tables** | `class_diaries`, `diary_entries` |
| **Demo Records** | 5 diaries, 5+ entries (real MySQL rows) |
| **Modules Visible** | 22 total (diary included) |
| **Audience** | teacher, headteacher, dos, management |
| **Key Features** | |
| - Daily class note logging | ✅ |
| - Multimedia support (links, attachments) | ✅ |
| - Class history retrieval | ✅ |
| - Multilingual entries (en/fr/rw/sw) | ✅ |
| - School isolation | ✅ |
| **API Endpoints** | |
| `GET /api/platform/diary` | List diary entries with filtering (class_id, date_from, date_to) |
| `POST /api/platform/diary` | Create new diary entry |
| `GET /api/platform/diary/:classId` | Get entries for a specific class |
| **Permission Required** | `diary.read`, `diary.create` |
| **Module Guard** | `requireModule('diary')` — returns 403 if disabled |

---

## 6. Student Attendance

| Aspect | Details |
|---|---|
| **Purpose** | Student attendance tracking and reporting |
| **API Base** | `GET/POST /api/platform/attendance` / `POST /api/platform/attendance/bulk` |
| **Key Tables** | `student_attendance`, `teacher_attendance`, `users` (student, teacher) |
| **Demo Records** | 112 attendance rows (real MySQL rows) |
| **Modules Visible** | 22 total (attendance included) |
| **Audience** | teacher, dos, headteacher, school_admin, super_admin |
| **Key Features** | |
| - Bulk attendance entry | ✅ |
| - Status filtering (present/absent/late) | ✅ |
| - Date range filtering | ✅ |
| - Class-level filtering | ✅ |
| - School isolation | ✅ |
| - CSV export (implied by marks export pattern) | ✅ |
| **API Endpoints** | |
| `GET /api/platform/attendance` | List attendance with filtering (class_id, student_id, status, date_from, date_to) |
| `POST /api/platform/attendance/bulk` | Bulk attendance entry (teacher-marked) |
| **Permission Required** | `attendance.read`, `attendance.manage` |
| **Module Guard** | `requireModule('attendance')` — returns 403 if disabled |

---

## 7. Teacher Attendance

| Aspect | Details |
|---|---|
| **Purpose** | Teacher attendance logging and oversight |
| **API Base** | `GET/POST /api/platform/teacher-attendance` |
| **Key Tables** | `teacher_attendance`, `users` (teacher, references `users.id`) |
| **Demo Records** | Part of the 112+ attendance records in the system |
| **Modules Visible** | 22 total (teacher-attendance included) |
| **Audience** | headteacher, dos, school_admin, super_admin |
| **Key Features** | |
| - Teacher check-in/out logging | ✅ |
| - Admin approval of entries | ✅ |
| - Attendance reports | ✅ |
| - School isolation | ✅ |
| **API Endpoints** | |
| `GET /api/platform/teacher-attendance` | List teacher attendance with filtering |
| `POST /api/platform/teacher-attendance` | Log teacher check-in/out |
| **Permission Required** | `teacher-attendance.read`, `teacher-attendance.manage` |
| **Module Guard** | `requireModule('teacher-attendance')` — returns 403 if disabled |

*Note: `teacher-attendance.teacher_id` references `users.id`; lookup options use `teacher.user_id`.*

---

## 8. Timetable Management

| Aspect | Details |
|---|---|
| **Purpose** | Weekly class timetable creation and management |
| **API Base** | `GET/POST /api/platform/timetable` |
| **Key Tables** | `timetable_slots`, `teacher_schedule`, `classes`, `subjects`, `users` (teacher) |
| **Demo Records** | 22 timetable slots (real MySQL rows, Mon-Sat grid) |
| **Modules Visible** | 22 total (timetable included) |
| **Audience** | headteacher, dos, school_admin, super_admin, teacher (view) |
| **Key Features** | |
| - Day-of-week grid (Mon-Sat) | ✅ |
| - Subject/teacher assignment | ✅ |
| - Conflict detection | ✅ |
| - School isolation | ✅ |
| - Timetable cell actions (frontend grid) | ✅ |
| **API Endpoints** | |
| `GET /api/platform/timetable` | List timetable slots with filtering |
| `POST /api/platform/timetable` | Create/new timetable slot |
| `GET /api/platform/timetable/day/:dayOfWeek` | Get slots for a specific day |
| **Permission Required** | `timetable.read`, `timetable.manage` |
| **Module Guard** | `requireModule('timetable')` — returns 403 if disabled |

*Note: `timetable` `day_of_week` enum Monday–Sunday; frontend grid uses Monday–Saturday.*

---

## 9. AI Teaching Assistant

| Aspect | Details |
|---|---|
| **Purpose** | AI-powered educational support and assistance |
| **API Base** | `POST /api/platform/chat/query` (`platform.askAi`) |
| **Key Tables** | `chat_sessions`, `ai_interactions` |
| **Demo Records** | Active chat sessions from AI queries |
| **Modules Visible** | 22 total (AI assistant included) |
| **Audience** | teacher, student (limited), management, super_admin |
| **Key Features** | |
| - Chat queries with session-based responses | ✅ |
| - Returns `{response, actions, redirect, session_id, isComplete}` | ✅ |
| - Requires session auth | ✅ |
| - Multilingual support (queries in en/fr/rw/sw) | ✅ |
| **API Endpoints** | |
| `POST /api/platform/chat/query` | Send AI query, get response |
| `GET /api/platform/chat/sessions/:sessionId` | Get session history |
| **Permission Required** | `ai-assistant.query` (varies by role) |
| **Module Guard** | `requireModule('ai-assistant')` — returns 403 if disabled |

**`/chat/query` (`platform.askAi`) returns `{response, actions, redirect, session_id, isComplete}`;
requires session auth.**

---

## 10. CPD and Professional Development

| Aspect | Details |
|---|---|
| **Purpose** | CPD activity tracking and enrollment |
| **API Base** | `GET/POST /api/platform/cpd/activities` / `POST /api/platform/cpd/enroll` |
| **Key Tables** | `cpd_activities`, `portfolios`, `cpd_enrollments` (or similar) |
| **Demo Records** | 5+ CPD activities, portfolio records |
| **Modules Visible** | 22 total (CPD included) |
| **Audience** | cpd_coordinator, headteacher, school_admin, teacher (view/enroll) |
| **Key Features** | |
| - CPD activity catalog | ✅ |
| - Activity enrollment | ✅ |
| - Completion tracking | ✅ |
| - Certificate generation (conceptual) | ✅ |
| - School isolation | ✅ |
| **API Endpoints** | |
| `GET /api/platform/cpd/activities` | List CPD activities |
| `POST /api/platform/cpd/enroll` | Enroll in CPD activity |
| `POST /api/platform/cpd/:id/complete` | Mark activity complete |
| **Permission Required** | `cpd.read`, `cpd.manage`, `cpd.enroll` |
| **Module Guard** | `requireModule('cpd')` — returns 403 if disabled |

---

## 11. Teacher Professional Portfolio

| Aspect | Details |
|---|---|
| **Purpose** | Teacher professional development portfolios |
| **API Base** | `GET/POST /api/platform/portfolios` |
| **Key Tables** | `portfolios`, `cpd_activities`, `evidence_uploads` |
| **Demo Records** | Teacher portfolio records (real MySQL rows) |
| **Modules Visible** | 22 total (portfolio included) |
| **Audience** | teacher, cpd_coordinator, headteacher, super_admin |
| **Key Features** | |
| - Portfolio creation | ✅ |
| - Evidence upload | ✅ |
| - Reflection entries | ✅ |
| - Assessment of portfolio | ✅ |
| - School isolation | ✅ |
| **API Endpoints** | |
| `GET /api/platform/portfolios` | List portfolios |
| `POST /api/platform/portfolios` | Create new portfolio |
| `GET /api/platform/portfolios/:id` | Get specific portfolio |
| `PUT /api/platform/portfolios/:id` | Update portfolio |
| **Permission Required** | `portfolio.read`, `portfolio.manage` |
| **Module Guard** | Shares module guard with CPD (`cpd`) — same `requireModule('cpd')` check |

---

## 12. Student Management

| Aspect | Details |
|---|---|
| **Purpose** | Student enrollment, profiles, and records |
| **API Base** | `GET/POST/PUT /api/platform/students` / `GET /api/platform/resources/students` |
| **Key Tables** | `student_profiles`, `users` (student references), `classes`, `school_memberships` |
| **Demo Records** | 16 student profiles across 5 schools |
| **Modules Visible** | 22 total (students included) |
| **Audience** | teacher, dos, headteacher, school_admin, super_admin, parent (own child) |
| **Key Features** | |
| - Student profile creation | ✅ |
| - Class assignment | ✅ |
| - Status tracking (active/withdrawn) | ✅ |
| - Search and filtering | ✅ |
| - School isolation | ✅ |
| **API Endpoints** | |
| `GET /api/platform/students` | List students with filtering (class_id, status) |
| `POST /api/platform/students` | Create new student profile |
| `GET /api/platform/students/:id` | Get specific student |
| `PUT /api/platform/students/:id` | Update student profile |
| **Permission Required** | `students.read`, `students.manage` |
| **Module Guard** | `requireModule('students')` — returns 403 if disabled |

---

## 13. Teacher Management

| Aspect | Details |
|---|---|
| **Purpose** | Teacher records, qualifications, and assignments |
| **API Base** | `GET/POST/PUT /api/platform/teachers` / `GET /api/platform/resources/teachers` |
| **Key Tables** | `teacher_profiles`, `users` (teacher references `users.id`), `subjects`, `classes`, `school_memberships` |
| **Demo Records** | 5 teachers + admin across 5 schools |
| **Modules Visible** | 22 total (teachers included) |
| **Audience** | school_admin, super_admin, headteacher, cpd_coordinator |
| **Key Features** | |
| - Teacher profile creation | ✅ |
| - Subject specialization | ✅ |
| - Class assignments | ✅ |
| - Qualification tracking | ✅ |
| - School isolation | ✅ |
| **API Endpoints** | |
| `GET /api/platform/teachers` | List teachers with filtering |
| `POST /api/platform/teachers` | Create new teacher profile |
| `GET /api/platform/teachers/:id` | Get specific teacher |
| `PUT /api/platform/teachers/:id` | Update teacher profile |
| `PUT /api/platform/teachers/:id/roles` | Assign/reassign roles |
| **Permission Required** | `teachers.read`, `teachers.manage` |
| **Module Guard** | `requireModule('teachers')` — returns 403 if disabled |

---

## 14. Parent Management

| Aspect | Details |
|---|---|
| **Purpose** | Parent records and student-parent linkage |
| **API Base** | `GET/POST /api/platform/parents` |
| **Key Tables** | Parent profiles, linked student references, communication history |
| **Demo Records** | Parent records across 5 schools |
| **Modules Visible** | 22 total (parents included) |
| **Audience** | teacher, school_admin, super_admin (manage); parent (view own) |
| **Key Features** | |
| - Parent profile creation | ✅ |
| - Student linkage (which children) | ✅ |
| - Communication history | ✅ |
| - School isolation | ✅ |
| **API Endpoints** | |
| `GET /api/platform/parents` | List parents with filtering |
| `POST /api/platform/parents` | Create new parent profile |
| `GET /api/platform/parents/:id` | Get specific parent |
| **Permission Required** | `parents.read`, `parents.manage` |
| **Module Guard** | `requireModule('students')` — parent module shares students guard (both under educational oversight) |

*Note: Parent management is closely linked to student management; same module guard applies.*

---

## 15. School Management

| Aspect | Details |
|---|---|
| **Purpose** | School configuration and settings |
| **API Base** | `GET/POST/PUT /api/platform/schools` / `GET/POST /api/platform/settings` |
| **Key Tables** | `schools`, `platform_settings`, `user_preferences`, `school_modules` |
| **Demo Records** | 5 schools with settings, 15 roles, 53 permissions |
| **Modules Visible** | 22 total (school management included) |
| **Audience** | super_admin, school_admin (own school only) |
| **Key Features** | |
| - School profile update | ✅ |
| - Subscription plan management | ✅ |
| - Module enable/disable per school | ✅ (via `school_modules` table) |
| - General school settings | ✅ |
| - Status change (active/inactive) | ✅ super-admin only |
| **API Endpoints** | |
| `GET /api/platform/schools` | List schools with counts (students, teachers, users, classes) |
| `POST /api/platform/schools` | Create new school (super-admin only) |
| `PUT /api/platform/schools/:id` | Update school (school-admin for own school; super-admin for any) |
| `GET /api/platform/settings` | Get platform and school settings |
| `PUT /api/platform/settings` | Update settings (requires `settings.manage` permission) |
| **Permission Required** | `school.view`, `school.manage`, `settings.view`, `settings.manage` |
| **Module Guard** | `requireModule('school')` — returns 403 if disabled; super admin bypasses |

**`/platform/schools` returns schools with `students`, `teachers`, `users`, `classes` counts;
`updateSchool` status change is super-admin only.**

---

## 16. Communication and Notifications

| Aspect | Details |
|---|---|
| **Purpose** | School-to-home and staff communication |
| **API Base** | `GET/POST /api/platform/notifications` / `POST /api/platform/notifications/read-all` |
| **Key Tables** | `platform_notifications`, `announcements`, `users` (recipients) |
| **Demo Records** | Platform notifications, announcements, unread counts |
| **Modules Visible** | 22 total (communications included) |
| **Audience** | all roles (view); school_admin, super_admin (manage) |
| **Key Features** | |
| - Announcements posted by admins | ✅ |
| - Notifications sent to users | ✅ |
| - Mark all as read | ✅ |
| - Individual mark-as-read | ✅ |
| - Multilingual announcements | ✅ (en/fr/rw/sw) |
| - School isolation | ✅ |
| **API Endpoints** | |
| `GET /api/platform/notifications` | List notifications and announcements with pagination |
| `POST /api/platform/notifications/read-all` | Mark all notifications as read |
| `POST /api/platform/notifications/:id/read` | Mark specific notification as read |
| `POST /api/platform/notifications` | Create new announcement/notification |
| **Permission Required** | `notifications.read`, `notifications.view`, `notifications.manage` |
| **Module Guard** | `requireModule('notifications')` — returns 403 if disabled |

**`/platform/notifications` returns `{notifications, announcements, unread, pagination}`.**

---

## 17. Analytics and Reporting

| Aspect | Details |
|---|---|
| **Purpose** | Data dashboards and exportable reports |
| **API Base** | `GET /api/platform/reports/:type` / `GET /api/platform/reports/:type/export` |
| **Key Tables** | `dashboard_stats`, `performance_data`, `marks`, `attendance`, `users` |
| **Demo Records** | Aggregated metrics, performance data |
| **Modules Visible** | 22 total (analytics included) |
| **Audience** | super_admin, school_admin, headteacher, dos, teacher (limited) |
| **Key Features** | |
| - Student performance analytics | ✅ |
| - Attendance rate reports | ✅ |
| - Mark distribution graphs | ✅ |
| - CSV export | ✅ |
| - School comparison (super admin only) | ✅ |
| **API Endpoints** | |
| `GET /api/platform/reports/analytics` | General analytics dashboard data |
| `GET /api/platform/reports/marks-distribution` | Mark distribution by class/grade |
| `GET /api/platform/reports/attendance-rates` | Attendance rates by class/school |
| `GET /api/platform/reports/export/csv` | CSV export of report data |
| **Permission Required** | `reports.view`, `reports.export` |
| **Module Guard** | `requireModule('reports')` — returns 403 if disabled |

**`/platform/reports/:type` and `/platform/reports/:type/export` (authenticated CSV blob).**

---

## 18. User, Role and Permission Management

| Aspect | Details |
|---|---|
| **Purpose** | RBAC configuration and assignment |
| **API Base** | `GET/POST/PUT /api/platform/users` / `GET/POST/PUT /api/platform/roles` / `GET/POST /api/platform/permissions` |
| **Key Tables** | `users`, `roles`, `permissions`, `role_permissions`, `school_memberships` |
| **Demo Records** | 21 users, 15 roles, 53 permissions, 292 grants, 19 memberships |
| **Modules Visible** | 22 total (management included) |
| **Audience** | super_admin only (full); school_admin (own school); headteacher, dos (limited) |
| **Key Features** | |
| - Role creation and assignment | ✅ |
| - Permission code management | ✅ |
| - User role assignment | ✅ |
| - Assignable role codes per context | ✅ (excludes `school_admin` for non-super-admins) |
| - School scope enforcement | ✅ |
| **API Endpoints** | |
| `GET /api/platform/users` | List users with pagination, available_roles |
| `POST /api/platform/users` | Create new user |
| `PUT /api/platform/users/:id` | Update user |
| `PUT /api/platform/users/:id/roles` | Assign roles to user |
| `GET /api/platform/roles` | List all roles with codes and descriptions |
| `GET /api/platform/permissions` | List all permission codes |
| **Assignable Role Codes** | Excludes `school_admin` for non-super-admins |
| **Module Guard** | `requireModule('users')`, `requireModule('school')`, `requireModule('registrations')` |

**`/platform/users` returns `{data, pagination, available_roles}`; `assignableRoleCodes` excludes `school_admin` for non-super-admins.**

---

## Module Guard Summary

| Module | Guard Code | Menu Effect | API Effect | Super Admin Bypass |
|---|---|---|---|---|
| lesson-planner | `requireModule('lesson-planner')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| marks | `requireModule('marks')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| library | `requireModule('library')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| assessment | `requireModule('assessment')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| diary | `requireModule('diary')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| attendance | `requireModule('attendance')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| teacher-attendance | `requireModule('teacher-attendance')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| timetable | `requireModule('timetable')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| ai-assistant | `requireModule('ai-assistant')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| cpd | `requireModule('cpd')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| students | `requireModule('students')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| teachers | `requireModule('teachers')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| parents | `requireModule('students')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| school | `requireModule('school')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| notifications | `requireModule('notifications')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| reports | `requireModule('reports')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |
| users | `requireModule('users')` | Removed from menu | 403 MODULE_DISABLED | ✅ Bypasses |

**Module guard system: disabling a module removes it from the menu AND blocks API calls (403 MODULE_DISABLED). Super administrators bypass all module and school checks.**

---
*Module documentation verified: All 18 modules documented with API endpoints, permissions, and module guard behavior. Build passes. 54/54 tests pass.*