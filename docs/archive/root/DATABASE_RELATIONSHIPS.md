# Database Relationships

## 1. Core Relationship Model

The unified platform keeps a single operational relational database and enforces canonical keys across modules.

```text
schools
  1 ──< school_memberships
  1 ──< academic_years
  1 ──< terms
  1 ──< classrooms / classes
  1 ──< users (through memberships)

users
  1 ──< school_memberships
  1 ──< teacher_profiles
  1 ──< student_profiles
  1 ──< parent_profiles

classes
  1 ──< student_profiles
  1 ──< class_subjects
  1 ──< timetables
  1 ──< assessments

subjects
  1 ──< class_subjects
  1 ──< lessons
  1 ──< assessments
  1 ──< marks

academic_years
  1 ──< terms
  1 ──< assessments

teacher_profiles
  1 ──< lessons
  1 ──< assessments
  1 ──< teacher_assignments

student_profiles
  1 ──< marks
  1 ──< attendance
  1 ──< parent_student_links

parent_profiles
  1 ──< parent_student_links
```

## 2. Shared Lookup Tables

- schools
- roles
- permissions
- school_modules
- academic_years
- terms
- classes
- subjects
- class_subjects

## 3. Lesson Planner Relationships

- unit to class relationship
- lesson to unit relationship
- lesson to lesson_materials
- lesson to lesson_plans
- lesson_plans to AI logs

## 4. Marks Relationships

- assessments belong to school, class, subject, teacher
- marks belong to assessment and student
- marks may be approved or locked based on workflow rules
- results are derived from marks and assessment weights

## 5. Attendance / Timetable / Diary Relationships

- attendance records belong to class, term, and student
- timetable slots belong to class, subject, teacher, and time block
- diary entries belong to teacher and class; optionally linked to lesson plan

## 6. Library Relationships

- resources belong to category and school
- borrow records link user to resource and due dates
- return records update resource status

## 7. Data Integrity Rules

- school scoping remains mandatory on all school-specific records
- student and teacher records must not be orphaned
- marks should not be created for a student outside the assessment class
- no timetable conflict should be silently allowed
- module access must be checked at the API layer before writes

## 8. Migration Rule

All new tables should maintain foreign keys and never create a parallel source of truth that duplicates existing school, teacher, student, or class data.
