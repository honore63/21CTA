import {
  LayoutDashboard, School, Users, GraduationCap, UserCheck, BookOpen, NotebookPen,
  ClipboardList, FileCheck2, Library, CalendarDays, CalendarClock, Sparkles, Award,
  BarChart3, Bell, Settings, ShieldCheck, UserPlus, ScrollText
} from 'lucide-react';

/**
 * Single source of truth for the unified sidebar.
 * `module` links the item to the module registry so a module disabled by the
 * platform administrator disappears and is blocked by the backend as well.
 * `permissions` is an OR list: the user needs at least one of them.
 */
export const NAV_SECTIONS = [
  {
    id: 'overview',
    labelKey: 'nav.overview',
    items: [
      { to: '/app/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, module: 'dashboard', permissions: ['dashboard.view'], end: true }
    ]
  },
  {
    id: 'academics',
    labelKey: 'nav.academics',
    items: [
      { to: '/app/students', labelKey: 'nav.students', icon: GraduationCap, module: 'students', permissions: ['students.view'] },
      { to: '/app/teachers', labelKey: 'nav.teachers', icon: UserCheck, module: 'teachers', permissions: ['teachers.view'] },
      { to: '/app/classes', labelKey: 'nav.classes', icon: School, module: 'classes', permissions: ['classes.view'] },
      { to: '/app/subjects', labelKey: 'nav.subjects', icon: BookOpen, module: 'subjects', permissions: ['subjects.view'] },
      { to: '/app/lesson-planner', labelKey: 'nav.lessonPlanner', icon: NotebookPen, module: 'lesson-planner', permissions: ['lesson_plans.view'] },
      { to: '/app/marks', labelKey: 'nav.marks', icon: ClipboardList, module: 'marks', permissions: ['marks.view'] },
      { to: '/app/assessment', labelKey: 'nav.assessment', icon: FileCheck2, module: 'assessment', permissions: ['assessments.view'] },
      { to: '/app/timetable', labelKey: 'nav.timetable', icon: CalendarClock, module: 'timetable', permissions: ['timetable.view'] }
    ]
  },
  {
    id: 'operations',
    labelKey: 'nav.operations',
    items: [
      { to: '/app/attendance', labelKey: 'nav.attendance', icon: UserCheck, module: 'attendance', permissions: ['attendance.view'] },
      { to: '/app/diary', labelKey: 'nav.diary', icon: CalendarDays, module: 'diary', permissions: ['diary.view'] },
      { to: '/app/library', labelKey: 'nav.library', icon: Library, module: 'library', permissions: ['library.view'] },
      { to: '/app/cpd', labelKey: 'nav.cpd', icon: Award, module: 'cpd', permissions: ['cpd.view', 'portfolio.view'] },
      { to: '/app/ai-assistant', labelKey: 'nav.aiAssistant', icon: Sparkles, module: 'ai-assistant', permissions: ['ai_assistant.use'] },
      { to: '/app/notifications', labelKey: 'nav.notifications', icon: Bell, module: 'notifications', permissions: ['notifications.view'] }
    ]
  },
  {
    id: 'insights',
    labelKey: 'nav.administration',
    items: [
      { to: '/app/reports', labelKey: 'nav.reports', icon: BarChart3, module: 'reports', permissions: ['reports.view'] },
      { to: '/app/school', labelKey: 'nav.school', icon: School, module: 'school', permissions: ['school.view'] },
      { to: '/app/users', labelKey: 'nav.users', icon: Users, module: 'users', permissions: ['users.view'] },
      { to: '/app/registrations', labelKey: 'nav.registrations', icon: UserPlus, module: 'registrations', permissions: ['registrations.review'] },
      { to: '/app/platform', labelKey: 'nav.platform', icon: ShieldCheck, module: 'platform', permissions: ['platform.view'] },
      { to: '/app/modules', labelKey: 'nav.modules', icon: ShieldCheck, permissions: ['modules.manage'], hideWhenModule: 'platform' },
      { to: '/app/audit', labelKey: 'nav.audit', icon: ScrollText, module: 'audit', permissions: ['audit.view'] },
      { to: '/app/settings', labelKey: 'nav.settings', icon: Settings, module: 'settings', permissions: [] }
    ]
  }
];

export const visibleNav = (hasPermission, hasModule) =>
  NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.module && !hasModule(item.module)) return false;
        if (item.hideWhenModule) {
          // hide when a module IS enabled - used for platform admin which requires
          // modules to not be shown if the platform module is active
          const platformEnabled = hasModule('platform');
          if (item.hideWhenModule === 'platform' && platformEnabled) return false;
        }
        if (!item.permissions || item.permissions.length === 0) return true;
        return hasPermission(...item.permissions);
      })
    }))
    .filter((section) => section.items.length > 0);
