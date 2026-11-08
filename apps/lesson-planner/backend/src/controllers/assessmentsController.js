const { pool } = require('../config/database');

/**
 * Assessment & Examination Controller
 * Manages quizzes, tests, exams, question banks, and student submissions
 */

exports.getAssessments = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || req.query.school_id || 1;
        const { class_id, subject_id, status } = req.query;

        let query = `
            SELECT a.*, c.name AS class_name, s.name AS subject_name, u.full_name AS teacher_name,
                   (SELECT count(*) FROM assessment_questions aq WHERE aq.assessment_id = a.id) AS questions_count,
                   (SELECT count(*) FROM assessment_submissions asub WHERE asub.assessment_id = a.id) AS submissions_count
            FROM assessments a
            JOIN classes c ON a.class_id = c.id
            JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN users u ON a.teacher_id = u.id
            WHERE a.school_id = ?
        `;
        const params = [schoolId];

        if (class_id) {
            query += ' AND a.class_id = ?';
            params.push(class_id);
        }
        if (subject_id) {
            query += ' AND a.subject_id = ?';
            params.push(subject_id);
        }
        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }

        query += ' ORDER BY a.assessment_date DESC, a.created_at DESC';

        const [assessments] = await pool.query(query, params);

        res.json({
            success: true,
            data: assessments
        });
    } catch (error) {
        next(error);
    }
};

exports.createAssessment = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const teacherId = req.user?.id || 108;
        const { class_id, subject_id, term_id = 2, title, description, type = 'test', total_marks = 100, weight = 100, assessment_date, due_date, duration_minutes, status = 'published' } = req.body;

        if (!class_id || !subject_id || !title) {
            return res.status(400).json({ success: false, message: 'Class, subject, and title are required' });
        }

        const [result] = await pool.query(`
            INSERT INTO assessments (school_id, class_id, subject_id, term_id, teacher_id, title, description, type, total_marks, weight, assessment_date, due_date, duration_minutes, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [schoolId, class_id, subject_id, term_id, teacherId, title, description || null, type, total_marks, weight, assessment_date || new Date(), due_date || null, duration_minutes || 60, status, teacherId]);

        res.status(201).json({
            success: true,
            message: 'Assessment created successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
};

exports.getAssessmentQuestions = async (req, res, next) => {
    try {
        const assessmentId = req.params.assessmentId;
        const [questions] = await pool.query(`
            SELECT id, assessment_id, question_text, question_type, options, marks, sort_order
            FROM assessment_questions
            WHERE assessment_id = ?
            ORDER BY sort_order ASC
        `, [assessmentId]);

        res.json({
            success: true,
            data: questions
        });
    } catch (error) {
        next(error);
    }
};

exports.addQuestion = async (req, res, next) => {
    try {
        const assessmentId = req.params.assessmentId;
        const { question_text, question_type = 'multiple_choice', options, correct_answer, marks = 1.0, sort_order = 0 } = req.body;

        const [result] = await pool.query(`
            INSERT INTO assessment_questions (assessment_id, question_text, question_type, options, correct_answer, marks, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [assessmentId, question_text, question_type, options ? JSON.stringify(options) : null, correct_answer || null, marks, sort_order]);

        res.status(201).json({
            success: true,
            message: 'Question added to assessment',
            data: { id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
};
