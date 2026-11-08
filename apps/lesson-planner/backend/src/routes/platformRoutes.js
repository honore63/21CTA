const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { platformAuth, requirePermission, requireSuperAdmin, requireModule } = require('../middleware/platformAuth');
const platform = require('../controllers/platformController');
const resources = require('../controllers/platformResourceController');
const admin = require('../controllers/platformAdminController');

const { createAuthLimiter } = require('../config/rateLimit');
const publicLimiter = createAuthLimiter();

/* ==========================================================================
 * Public endpoints (no authentication)
 * ========================================================================== */

router.get('/public/home', platform.publicHome);
router.get('/public/schools', platform.publicSchools);
router.get('/public/schools/:slug', platform.publicSchoolPortal);
router.get('/public/library/home', platform.publicLibraryHome);
router.get('/public/library/categories', platform.publicLibraryCategories);
router.get('/public/library/resources', platform.publicLibraryResources);
router.get('/public/library/resources/:id', platform.publicLibraryResource);
router.post('/public/register-school', publicLimiter, platform.registerSchool);
router.post('/public/register-user', publicLimiter, platform.registerUser);

/* ==========================================================================
 * Authenticated platform endpoints
 * ========================================================================== */

router.use(authMiddleware, platformAuth);

// Session / profile
router.get('/me', platform.me);
router.put('/me/preferences', platform.updatePreferences);
router.put('/me/profile', platform.updateProfile);

// Dashboards and insight
router.get('/overview', requireModule('dashboard'), requirePermission('dashboard.view'), platform.overview);
router.get('/analytics', requireModule('reports'), requirePermission('reports.view'), platform.analytics);
router.get('/search', platform.search);

// Notifications
router.get('/notifications', requireModule('notifications'), requirePermission('notifications.view'), platform.listNotifications);
router.post('/notifications/read-all', requireModule('notifications'), requirePermission('notifications.view'), platform.markAllNotificationsRead);
router.post('/notifications/:id/read', requireModule('notifications'), requirePermission('notifications.view'), platform.markNotificationRead);

// Reports
router.get('/reports/:type', requireModule('reports'), requirePermission('reports.view'), platform.report);
router.get('/reports/:type/export', requireModule('reports'), requirePermission('reports.export'), platform.exportReport);

/* ==========================================================================
 * Generic resource CRUD
 * Permission checks are enforced per-resource inside the controller.
 * ========================================================================== */

// Map generic resources to the module that owns them. A module disabled for
// the working school rejects the request even if the user has the permission.
const RESOURCE_MODULE = {
    students: 'students',
    teachers: 'teachers',
    parents: 'students',
    classes: 'classes',
    subjects: 'subjects',
    assessments: 'assessment',
    marks: 'marks',
    attendance: 'attendance',
    timetable: 'timetable',
    library: 'library',
    loans: 'library',
    diary: 'diary',
    cpd: 'cpd',
    portfolio: 'cpd',
    announcements: 'notifications',
    terms: 'settings'
};

const resourceModuleGuard = (req, res, next) => {
    const code = RESOURCE_MODULE[req.params.resource];
    if (!code) return next();
    return requireModule(code)(req, res, next);
};

router.post('/resources/attendance/bulk', requireModule('attendance'), requirePermission('attendance.record'), resources.bulkAttendance);

router.get('/resources/:resource', resourceModuleGuard, resources.list);
router.get('/resources/:resource/:id', resourceModuleGuard, resources.getOne);
router.post('/resources/:resource', resourceModuleGuard, resources.create);
router.put('/resources/:resource/:id', resourceModuleGuard, resources.update);
router.delete('/resources/:resource/:id', resourceModuleGuard, resources.remove);

// Mark lifecycle
router.post('/marks/:id/approve', requireModule('marks'), requirePermission('marks.approve'), resources.approveMark);
router.post('/marks/:id/lock', requireModule('marks'), requirePermission('marks.lock'), resources.lockMark);
router.post('/marks/:id/reopen', requireModule('marks'), requirePermission('marks.lock'), resources.reopenMark);

// Library returns
router.post('/loans/:id/return', requireModule('library'), requirePermission('library.manage', 'library.borrow'), resources.returnLoan);

/* ==========================================================================
 * Administration
 * ========================================================================== */

router.get('/users', requireModule('users'), requirePermission('users.view'), admin.listUsers);
router.post('/users', requireModule('users'), requirePermission('users.manage'), admin.createUser);
router.put('/users/:id', requireModule('users'), requirePermission('users.manage'), admin.updateUser);
router.put('/users/:id/roles', requireModule('users'), requirePermission('users.manage'), admin.setUserRoles);
router.post('/users/:id/reset-password', requireModule('users'), requirePermission('users.manage'), admin.resetUserPassword);

router.get('/schools', requireModule('school'), requirePermission('school.view'), admin.listSchools);
router.post('/schools', requireSuperAdmin, admin.createSchool);
router.put('/schools/:id', requireModule('school'), requirePermission('school.manage'), admin.updateSchool);

router.get('/registrations', requireModule('registrations'), requirePermission('registrations.review'), admin.listRegistrations);
router.post('/registrations/:id/review', requireModule('registrations'), requirePermission('registrations.review'), admin.reviewRegistration);

router.get('/settings', requirePermission('settings.view'), admin.getSettings);
router.put('/settings', requirePermission('settings.manage'), admin.updateSettings);

router.get('/audit', requireModule('audit'), requirePermission('audit.view'), admin.listAudit);

router.get('/modules', requirePermission('dashboard.view'), admin.listModules);
router.put('/modules/:code', requirePermission('modules.manage', 'settings.manage'), admin.toggleModule);

module.exports = router;
