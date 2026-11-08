const { pool } = require('../config/database');
const aiService = require('../services/aiService');
const fileService = require('../services/fileService');
const agentService = require('../services/agentService');

/**
 * AI Agent Controller
 * Handles endpoints for the AI Agent that can work autonomously on behalf of teachers
 */

/**
 * Analyze a syllabus using the AI Agent
 */
exports.analyzeSyllabus = async (req, res, next) => {
    try {
        const { syllabusId } = req.params;
        const teacherId = req.user.id;

        const [syllabuses] = await pool.query(
            `SELECT s.* FROM syllabuses s
             JOIN subjects sub ON s.subject_name = sub.name
             JOIN class_subjects cs ON sub.id = cs.subject_id
             JOIN classes c ON cs.class_id = c.id
             WHERE s.id = ? AND c.teacher_id = ?`,
            [syllabusId, teacherId]
        );

        if (syllabuses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Syllabus not found or you do not have permission to access it'
            });
        }

        // Enqueue the task for background processing
        const jobId = await agentService.enqueueAgentTask({
            type: 'syllabusAnalysis',
            syllabusId: parseInt(syllabusId),
            teacherId: teacherId
        });

        res.json({
            success: true,
            message: 'Syllabus analysis enqueued for background processing.',
            data: { jobId, status: 'queued' }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Process reference materials for a lesson
 */
exports.processMaterials = async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        const teacherId = req.user.id;

        const [lessons] = await pool.query(
            `SELECT l.* FROM lessons l
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             WHERE l.id = ? AND c.teacher_id = ?`,
            [lessonId, teacherId]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found or you do not have permission to access it'
            });
        }

        // Enqueue the task for background processing
        const jobId = await agentService.enqueueAgentTask({
            type: 'materialProcessing',
            lessonId: parseInt(lessonId),
            teacherId: teacherId
        });

        res.json({
            success: true,
            message: 'Material processing enqueued for background processing.',
            data: { jobId, status: 'queued' }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Generate a lesson plan using the AI Agent
 */
exports.generateLessonPlanAgent = async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        const teacherId = req.user.id;

        const [lessons] = await pool.query(
            `SELECT l.* FROM lessons l
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             WHERE l.id = ? AND c.teacher_id = ?`,
            [lessonId, teacherId]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found or you do not have permission to access it'
            });
        }

        // Enqueue the task for background processing
        const jobId = await agentService.enqueueAgentTask({
            type: 'lessonPlanGeneration',
            lessonId: parseInt(lessonId),
            teacherId: teacherId
        });

        res.json({
            success: true,
            message: 'Lesson plan generation enqueued for background processing.',
            data: { jobId, status: 'queued' }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Batch generate all lesson plans for a unit using the AI Agent
 */
exports.batchGenerateUnitPlansAgent = async (req, res, next) => {
    try {
        const { unitId } = req.params;
        const teacherId = req.user.id;

        const [units] = await pool.query(
            `SELECT u.* FROM units u
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             WHERE u.id = ? AND c.teacher_id = ?`,
            [unitId, teacherId]
        );

        if (units.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Unit not found or you do not have permission to access it'
            });
        }

        // Enqueue the task for background processing
        const jobId = await agentService.enqueueAgentTask({
            type: 'batchUnitGeneration',
            unitId: parseInt(unitId),
            teacherId: teacherId
        });

        res.json({
            success: true,
            message: `Batch generation enqueued for background processing for unit ${unitId}.`,
            data: { jobId, status: 'queued' }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get agent job status
 */
exports.getJobStatus = async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: { mode: 'queued', status: 'operational' }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get specific job status by ID
 */
exports.getJobStatusById = async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const status = await agentService.getJobStatus(jobId);

        if (!status) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get job result by ID
 */
exports.getJobResult = async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const result = await agentService.getTaskResult(jobId);

        if (!result) {
            return res.status(404).json({
                success: false,
                message: 'Job result not found'
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get agent capabilities
 */
exports.getAgentCapabilities = (req, res, next) => {
    try {
        const capabilities = {
            backgroundProcessing: true,
            voiceSupport: {
                speechToText: process.env.ENABLE_VOICE_INPUT === 'true',
                textToSpeech: process.env.ENABLE_VOICE_OUTPUT === 'true'
            },
            autonomousFeatures: [
                'syllabusAnalysis',
                'materialProcessing',
                'lessonPlanGeneration',
                'batchGeneration',
                'proactiveNotification'
            ],
            notificationChannels: [
                'inApp',
                process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true' ? 'email' : null
            ].filter(Boolean),
            queueStatus: 'redis_queue'
        };

        res.json({
            success: true,
            data: capabilities
        });
    } catch (error) {
        next(error);
    }
};

// ─── AI Agent Task Management ──────────────────────────────────────────

/** GET /api/agent/tasks — get current teacher's AI-assigned tasks */
exports.getTasks = async (req, res, next) => {
    try {
        const tasks = await agentService.getTeacherTasks(req.user.id, 20);
        res.json({ success: true, data: tasks });
    } catch (error) {
        next(error);
    }
};

/** GET /api/agent/summary — Gemini-powered summary of teacher task activity */
exports.getTaskSummary = async (req, res, next) => {
    try {
        const result = await agentService.generateTaskSummary(req.user.id);
        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

/** PUT /api/agent/tasks/:id/complete */
exports.completeTask = async (req, res, next) => {
    try {
        await agentService.markTaskComplete(req.params.id, req.user.id);
        res.json({ success: true, message: 'Task marked as complete' });
    } catch (error) {
        next(error);
    }
};

/** DELETE /api/agent/tasks/:id */
exports.deleteTask = async (req, res, next) => {
    try {
        await agentService.dismissTask(req.params.id, req.user.id);
        res.json({ success: true, message: 'Task dismissed' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    analyzeSyllabus: exports.analyzeSyllabus,
    processMaterials: exports.processMaterials,
    generateLessonPlanAgent: exports.generateLessonPlanAgent,
    batchGenerateUnitPlansAgent: exports.batchGenerateUnitPlansAgent,
    getJobStatus: exports.getJobStatus,
    getJobStatusById: exports.getJobStatusById,
    getJobResult: exports.getJobResult,
    getAgentCapabilities: exports.getAgentCapabilities,
    getTasks: exports.getTasks,
    getTaskSummary: exports.getTaskSummary,
    completeTask: exports.completeTask,
    deleteTask: exports.deleteTask,
};