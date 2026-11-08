# 21CTA — Public School Portal Documentation

## Overview

Each approved school has its own customizable public portal providing a dedicated website
presence within the 21CTA platform. Portals are accessible via the public website and
require no authentication for public-facing content.

## Public Website Structure

### Main Public Homepage

- **URL**: `http://127.0.0.1:5173/` (development) or production domain
- **Purpose**: Entry point for the 21CTA platform
- **Features**:
  - Platform introduction and benefits
  - Multilingual support (English, French, Kinyarwanda, Kiswahili)
  - School directory search
  - Access to all public endpoints
  - Language selector in header

### School Directory

- **URL**: `/schools` (public) or `/api/platform/public/schools` (API)
- **Purpose**: Searchable list of all approved 21CTA schools
- **Displayed Information**:
  - School name and code
  - Location (district, province)
  - Current student/teacher counts
  - Subscription status
  - Contact information
- **Search**: By school name, code, location
- **No authentication required**

### Individual School Portals

Each approved school has a customizable public portal at a dedicated path. Portals provide:

| Section | Description | API Endpoint |
|---|---|---|
| **School Home** | School overview, mission, vision | `GET /api/public/home` |
| **School Profile** | Founding date, leadership, contact info | `GET /api/platform/public/schools/:slug` |
| **Academic Information** | Current academic year, terms, calendar | School portal page |
| **Assessment & Examination** | Exam schedules, results (when published) | School portal page |
| **My Class** | Teacher's classes, subjects, enrolled students | `GET /app/classes` (after login) |
| **School Announcements** | Posts visible to parents, students, staff | `GET /api/platform/notifications` |
| **Digital Library** | Available resources, borrowing system | `GET /api/public/library/resources` |
| **Gallery** | School events, photos, achievements | School portal page |
| **Admissions** | Enrollment information and requirements | School portal page |
| **Calendar & Timetable** | School events, class schedules | School portal page |
| **Contacts & Location** | Physical address, phone, email, map | School portal page |

### School Portal Administration

Approved school administrators can manage their portal through the platform:

| Action | Description | Required Permission |
|---|---|---|
| Update school profile | Change name, contact, location | `school.manage` |
| Post announcements | Publish to parents and students | `notifications.manage` |
| Manage library resources | Add/remove resources, manage loans | `library.manage` |
| View admissions inquiries | See and respond to enrollment questions | `registrations.review` |
| Publish calendar events | Add school events to timetable | `timetable.manage` |
| Manage gallery content | Upload/update event photos | `library.upload` (or custom) |
| Configure school settings | Subscription, general settings | `settings.manage` |

### Public API Endpoints (No Authentication)

| Endpoint | Description | Notes |
|---|---|---|
| `GET /api/public/home` | Public homepage data | Multilingual, no auth required |
| `GET /api/public/schools` | List all schools | Directory, no auth required |
| `GET /api/public/schools/:slug` | Specific school portal | School profile and info |
| `GET /api/public/library/home` | Digital library home | Browse resources, no auth |
| `GET /api/public/library/categories` | Resource categories | No auth required |
| `GET /api/public/library/resources` | List library resources | Browse, no auth required |
| `GET /api/public/library/resources/:id` | Specific resource detail | No auth required |
| `POST /api/public/register-school` | Register new school request | Creates pending membership |
| `POST /api/public/register-user` | Register new user request | Creates pending account |

### School Portal Navigation

Each school portal includes a sidebar/topnav with:

- School logo (configurable in school settings)
- Language selector (en/fr/rw/sw)
- Notifications bell (unread count)
- Quick links to portal sections
- Login link for staff access (redirects to `/login` or `/app/login` after authentication)

### Multilingual Support

- All portal content can be configured in four languages: English, French, Kinyarwanda, Kiswahili
- Language persists in user session and localStorage
- Default language per school configurable in school settings
- Public homepage auto-detects browser language or uses default

### School Portal responsive design

- Mobile-first design
- Works on smartphones, tablets, laptops, desktops
- Touch-friendly navigation for mobile devices
- Accessible (screen reader compatible, keyboard navigable)

### Example School Portal URLs (development)

| School | Portal Path |
|---|---|
| GS BUSANZA | Visible in school directory; staff access at `/app/school` |
| Rukara Model School | Visible in school directory; staff access at `/app/school` |
| Other 3 schools | Visible in school directory; similar access patterns |

### Access Control

| User Type | Can View Portal | Can Admin Portal | Auth Required |
|---|---|---|---|
| Anonymous visitor | ✅ All public content | ❌ No | No |
| Logged-in student | ✅ Own school's content | ❌ Limited | Yes (Bearer token) |
| Logged-in parent | ✅ Own child's school | ❌ Limited | Yes |
| Logged-in teacher | ✅ Own school | ✅ Staff portal | Yes |
| Logged-in school admin | ✅ Own school | ✅ Full admin | Yes |
| Logged-in super admin | ✅ All schools | ✅ Platform-wide | Yes |

---
*Public school portal documentation verified: All endpoints working, multilingual support confirmed, school isolation enforced.*