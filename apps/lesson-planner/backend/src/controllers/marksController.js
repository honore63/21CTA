const { pool } = require('../config/database');

/**
 * Marks Information System Controller
 * Handles marks entry, grading calculation, DOS approval workflow, and report cards
 */

// Get marks with filtering
exports.getMarks = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || req.query.school_id || 1;
        const { class_id, subject_id, term_id, status } = req.query;

        let query = `
            SELECT m.id, m.score, m.max_score, m.grade, m.remarks, m.status, m.is_locked,
                   m.approved_at, u_app.full_name AS approved_by_name,
                   st.id AS student_id, st.first_name, st.last_name, st.admission_number,
                   s.id AS subject_id, s.name AS subject_name,
                   c.id AS class_id, c.name AS class_name,
                   a.id AS assessment_id, a.title AS assessment_title, a.type AS assessment_type
            FROM marks m
            JOIN student_profiles st ON m.student_id = st.id
            JOIN subjects s ON m.subject_id = s.id
            JOIN classes c ON m.class_id = c.id
            LEFT JOIN assessments a ON m.assessment_id = a.id
            LEFT JOIN users u_app ON m.approved_by = u_app.id
            WHERE m.school_id = ?
        `;
        const params = [schoolId];

        if (class_id) {
            query += ' AND m.class_id = ?';
            params.push(class_id);
        }
        if (subject_id) {
            query += ' AND m.subject_id = ?';
            params.push(subject_id);
        }
        if (term_id) {
            query += ' AND m.term_id = ?';
            params.push(term_id);
        }
        if (status) {
            query += ' AND m.status = ?';
            params.push(status);
        }

        query += ' ORDER BY st.last_name ASC, s.name ASC';

        const [marks] = await pool.query(query, params);

        res.json({
            success: true,
            data: marks
        });
    } catch (error) {
        next(error);
    }
};

// Enter / Update Marks (Batch or Single)
exports.saveMarks = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const teacherId = req.user?.id || 108;
        const { marks } = req.body; // Array of { student_id, subject_id, class_id, term_id, assessment_id, score, max_score, remarks }

        if (!Array.isArray(marks) || marks.length === 0) {
            return res.status(400).json({ success: false, message: 'Marks array is required' });
        }

        // Helper to determine grade based on Rwanda standard
        const calculateGrade = (score, max) => {
            const pct = (score / max) * 100;
            if (pct >= 80) return 'A';
            if (pct >= 70) return 'B';
            if (pct >= 60) return 'C';
            if (pct >= 50) return 'D';
            if (pct >= 40) return 'E';
            return 'F';
        };

        const results = [];
        for (const item of marks) {
            const max = item.max_score || 100;
            const score = parseFloat(item.score);
            const grade = calculateGrade(score, max);

            const [result] = await pool.query(`
                INSERT INTO marks (school_id, assessment_id, student_id, subject_id, class_id, term_id, teacher_id, score, max_score, grade, remarks, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
                ON DUPLICATE KEY UPDATE 
                    score = VALUES(score),
                    max_score = VALUES(max_score),
                    grade = VALUES(grade),
                    remarks = VALUES(remarks),
                    teacher_id = VALUES(teacher_id)
            `, [
                schoolId,
                item.assessment_id || null,
                item.student_id,
                item.subject_id,
                item.class_id,
                item.term_id || 2,
                teacherId,
                score,
                max,
                grade,
                item.remarks || null
            ]);
            results.push(result);
        }

        res.json({
            success: true,
            message: `Successfully saved ${marks.length} marks record(s) as draft`,
            data: { savedCount: marks.length }
        });
    } catch (error) {
        next(error);
    }
};

// Submit Marks for DOS Approval
exports.submitMarks = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const { class_id, subject_id, term_id } = req.body;

        const [result] = await pool.query(`
            UPDATE marks 
            SET status = 'submitted' 
            WHERE school_id = ? AND class_id = ? AND subject_id = ? AND (term_id = ? OR ? IS NULL) AND status = 'draft'
        `, [schoolId, class_id, subject_id, term_id, term_id]);

        // Send notification to DOS
        const [dosUsers] = await pool.query("SELECT id FROM users WHERE school_id = ? AND role = 'dos'", [schoolId]);
        if (dosUsers.length > 0) {
            await pool.query(`
                INSERT INTO platform_notifications (user_id, school_id, title, message, type, link)
                VALUES (?, ?, 'New Marks Submission Pending Approval', 'A teacher has submitted marks for review and approval.', 'info', '/marks')
            `, [dosUsers[0].id, schoolId]);
        }

        res.json({
            success: true,
            message: `Submitted ${result.affectedRows} marks for DOS approval`
        });
    } catch (error) {
        next(error);
    }
};

// Approve or Reject Marks (DOS / Headteacher only)
exports.approveMarks = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const approverId = req.user?.id || 106;
        const { mark_ids, status, remarks } = req.body; // status: 'approved' | 'rejected'

        if (!Array.isArray(mark_ids) || mark_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'mark_ids array is required' });
        }

        const isLocked = status === 'approved' ? 1 : 0;

        await pool.query(`
            UPDATE marks 
            SET status = ?, approved_by = ?, approved_at = NOW(), is_locked = ?
            WHERE id IN (?) AND school_id = ?
        `, [status, approverId, isLocked, mark_ids, schoolId]);

        res.json({
            success: true,
            message: `Marks ${status} successfully for ${mark_ids.length} records`
        });
    } catch (error) {
        next(error);
    }
};

// Student Comprehensive Report Card
exports.getStudentReportCard = async (req, res, next) => {
    try {
        const studentId = req.params.studentId;
        const termId = req.query.term_id || 2;

        const [[student]] = await pool.query(`
            SELECT sp.*, c.name AS class_name, c.level, s.name AS school_name, s.motto, s.district, s.phone AS school_phone
            FROM student_profiles sp
            LEFT JOIN classes c ON sp.class_id = c.id
            LEFT JOIN schools s ON sp.school_id = s.id
            WHERE sp.id = ?
        `, [studentId]);

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Marks for this student in this term
        const [marks] = await pool.query(`
            SELECT m.score, m.max_score, m.grade, m.remarks, s.name AS subject_name, s.code AS subject_code
            FROM marks m
            JOIN subjects s ON m.subject_id = s.id
            WHERE m.student_id = ? AND (m.term_id = ? OR ? IS NULL) AND m.status = 'approved'
            ORDER BY s.name ASC
        `, [studentId, termId, termId]);

        // Calculate Totals and Average
        let totalScore = 0;
        let totalMax = 0;
        marks.forEach(m => {
            totalScore += parseFloat(m.score);
            totalMax += parseFloat(m.max_score);
        });

        const overallPercentage = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : 0;

        res.json({
            success: true,
            data: {
                student,
                term: 'Term 2 (2025-2026)',
                marks,
                summary: {
                    totalScore,
                    totalMax,
                    overallPercentage: `${overallPercentage}%`,
                    generalGrade: overallPercentage >= 80 ? 'A' : overallPercentage >= 70 ? 'B' : overallPercentage >= 60 ? 'C' : 'D',
                    classRank: '3 / 42',
                    conduct: 'Very Good',
                    headteacherRemarks: 'Excellent academic determination. Keep up the high standard.'
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
