# All Pages and Routes

## 1. Public Website Routes

### Core pages
- /
- /about
- /features
- /modules
- /schools
- /contact
- /faq
- /help
- /privacy-policy
- /terms

### Auth pages
- /login
- /register
- /forgot-password
- /reset-password
- /logout

## 2. Dashboard Routes

### Super Administrator
- /dashboard/super-admin
- /dashboard/super-admin/schools
- /dashboard/super-admin/schools/registrations
- /dashboard/super-admin/schools/:id
- /dashboard/super-admin/users
- /dashboard/super-admin/users/:id
- /dashboard/super-admin/roles
- /dashboard/super-admin/permissions
- /dashboard/super-admin/modules
- /dashboard/super-admin/analytics
- /dashboard/super-admin/system
- /dashboard/super-admin/audit
- /dashboard/super-admin/settings
- /dashboard/super-admin/security

### School Administrator
- /dashboard/school-admin
- /dashboard/school-admin/profile
- /dashboard/school-admin/staff
- /dashboard/school-admin/teachers
- /dashboard/school-admin/students
- /dashboard/school-admin/parents
- /dashboard/school-admin/classes
- /dashboard/school-admin/subjects
- /dashboard/school-admin/academic-years
- /dashboard/school-admin/terms
- /dashboard/school-admin/timetable
- /dashboard/school-admin/attendance
- /dashboard/school-admin/marks
- /dashboard/school-admin/reports
- /dashboard/school-admin/settings

### Headteacher
- /dashboard/headteacher
- /dashboard/headteacher/performance
- /dashboard/headteacher/academic-progress
- /dashboard/headteacher/student-performance
- /dashboard/headteacher/teacher-performance
- /dashboard/headteacher/attendance
- /dashboard/headteacher/exams
- /dashboard/headteacher/syllabus
- /dashboard/headteacher/lesson-plans
- /dashboard/headteacher/reports

### Director of Studies
- /dashboard/dos
- /dashboard/dos/classes
- /dashboard/dos/subjects
- /dashboard/dos/assessments
- /dashboard/dos/marks
- /dashboard/dos/approval
- /dashboard/dos/locked-marks
- /dashboard/dos/exams
- /dashboard/dos/lesson-monitoring
- /dashboard/dos/diary-monitoring
- /dashboard/dos/syllabus
- /dashboard/dos/reports

### Teacher
- /dashboard/teacher
- /dashboard/teacher/profile
- /dashboard/teacher/classes
- /dashboard/teacher/subjects
- /dashboard/teacher/students
- /dashboard/teacher/timetable
- /dashboard/teacher/lesson-planner
- /dashboard/teacher/lessons
- /dashboard/teacher/curriculum
- /dashboard/teacher/marks
- /dashboard/teacher/assessments
- /dashboard/teacher/attendance
- /dashboard/teacher/library
- /dashboard/teacher/ai-assistant
- /dashboard/teacher/cpd
- /dashboard/teacher/portfolio

### Student
- /dashboard/student
- /dashboard/student/profile
- /dashboard/student/classes
- /dashboard/student/subjects
- /dashboard/student/timetable
- /dashboard/student/attendance
- /dashboard/student/results
- /dashboard/student/exams
- /dashboard/student/assignments
- /dashboard/student/library
- /dashboard/student/feedback
- /dashboard/student/notifications

### Parent
- /dashboard/parent
- /dashboard/parent/profile
- /dashboard/parent/children
- /dashboard/parent/child/:id
- /dashboard/parent/progress
- /dashboard/parent/results
- /dashboard/parent/attendance
- /dashboard/parent/assignments
- /dashboard/parent/timetable
- /dashboard/parent/communications

### Librarian
- /dashboard/librarian
- /dashboard/librarian/resources
- /dashboard/librarian/uploads
- /dashboard/librarian/borrowings
- /dashboard/librarian/returns
- /dashboard/librarian/reports

## 3. Module Routes

### Lesson Planner
- /modules/lesson-planner
- /modules/lesson-planner/curriculum
- /modules/lesson-planner/units
- /modules/lesson-planner/lessons
- /modules/lesson-planner/generate
- /modules/lesson-planner/editor
- /modules/lesson-planner/history
- /modules/lesson-planner/export

### Marks Management
- /modules/marks-management
- /modules/marks-management/assessments
- /modules/marks-management/marks-entry
- /modules/marks-management/results
- /modules/marks-management/verification
- /modules/marks-management/approval
- /modules/marks-management/reports

### Digital Library
- /modules/digital-library
- /modules/digital-library/resources
- /modules/digital-library/upload
- /modules/digital-library/borrowings
- /modules/digital-library/reports

### Assessment
- /modules/assessment
- /modules/assessment/question-bank
- /modules/assessment/schedule
- /modules/assessment/results

### Class Diary
- /modules/class-diary
- /modules/class-diary/daily-records
- /modules/class-diary/homework
- /modules/class-diary/reports

### Attendance
- /modules/attendance
- /modules/attendance/student
- /modules/attendance/teacher
- /modules/attendance/reports

### Timetable
- /modules/timetable
- /modules/timetable/school
- /modules/timetable/class
- /modules/timetable/teacher
- /modules/timetable/conflicts

### AI Assistant
- /modules/ai-assistant
- /modules/ai-assistant/chat
- /modules/ai-assistant/resources
- /modules/ai-assistant/history

### CPD
- /modules/cpd
- /modules/cpd/training-calendar
- /modules/cpd/records
- /modules/cpd/certificates

### Teacher Portfolio
- /modules/teacher-portfolio
- /modules/teacher-portfolio/profile
- /modules/teacher-portfolio/evidence
- /modules/teacher-portfolio/certificates

### Communication
- /modules/communication
- /modules/communication/messages
- /modules/communication/announcements
- /modules/communication/notifications

### Analytics
- /modules/analytics
- /modules/analytics/school
- /modules/analytics/performance
- /modules/analytics/custom-reports

## 4. Route Guards

Every protected route must enforce:
- auth
- role allowed for route
- school scope for school data
- module enabling for the working school
- permission checks on write actions

## 5. Route Design Rule

The frontend must never trust the UI alone. Security must be enforced in the backend and the API must be the source of truth.
