# Module Integration Report

## 1. Existing Validated Components

The repository already contains substantial, working educational systems and partial platform elements:

- lesson planner frontend and backend
- marks-management application
- database schema and migration files
- platform-style API layer for users, roles, schools, modules, permissions
- multi-school dashboard shell and navigation

These elements should be retained and merged rather than replaced wholesale.

## 2. Core Integration Strategy

### A. Keep and integrate
- Lesson planner and AI generation logic
- Marks and assessment calculation logic
- Existing class, subject, teacher, student schemas
- School and role scaffolding

### B. Unify under one shell
- one auth system
- one dashboard shell
- one top-level nav
- one shared settings model

### C. Link shared records
- school_id
- teacher_id
- student_id
- class_id
- subject_id
- academic_year_id
- term_id

## 3. Module Mapping

| Module | Source | Primary data source | Status |
|---|---|---|---|
| Lesson Planner | Existing app | lessons / lesson_plans / units / classes | Active |
| Marks Management | Existing RMS/MIS app | assessments / marks / terms / classes | Active |
| Digital Library | Existing library resource structures | library_resources / materials | Planned |
| Assessment and Examination | Shared with marks and assessments | assessments / questions / results | Planned |
| Attendance | Shared school records | attendance table(s) | Planned |
| Timetable | School structure records | timetables / classes / subjects | Planned |
| AI Assistant | Existing agent/chat APIs | chat / agent tasks / AI logs | Active |
| CPD | School staff admin records | cpd_records / trainings | Planned |
| Teacher Portfolio | Teacher profile + evidence | teacher_profiles + attachments | Planned |
| Communication | notifications / announcements | notifications / announcements | Active |
| Analytics | Reports across all data | aggregated tables + API queries | Planned |

## 4. Shared Records Rule

The platform should avoid duplicate records. The same business object must be referred to through stable foreign keys across modules.

Examples:
- A teacher record created in the school admin area is reused by lesson planner, CPD, marks, and timetable modules.
- A student record created in school admin is reused across marks, attendance, exams, parent portal, and reports.
- A subject record is reused across marks, timetable, lesson planning, and examination portals.

## 5. Integration Risks

- duplicated student records between old apps
- separate role systems across old modules
- inconsistent school id scopes
- duplicate class definitions across apps
- differing grade formulas and approval flows

## 6. Mitigation Plan

1. Normalize to a single user and school model.
2. Use canonical IDs for student, teacher, class, subject, and school.
3. Keep legacy data as reference while migrating to unified IDs.
4. Maintain module-specific views on top of shared tables.
5. Validate with migration scripts and regression tests.

## 7. Execution Priority

1. School + auth foundation
2. Shared records and school scope
3. Lesson planner integration
4. Marks management integration
5. Remaining educational modules
6. Reporting and admin controls

## 8. Success Criteria

The module integration is successful when:

- each module loads in the unified shell
- each module uses the same auth and school context
- no duplicate canonical records are created
- marks and lesson planner remain operational
- new routes do not bypass module or school permissions
