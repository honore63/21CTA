const { pool } = require('../config/database');

/**
 * Student Management Controller
 * Manages student profiles, enrollments, class assignment, and academic records
 */

exports.getStudents = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || req.query.school_id || 1;
        const { class_id, status, search } = req.query;

        let query = `
            SELECT sp.*, c.name AS class_name, c.stream, c.level,
                   s.name AS school_name
            FROM student_profiles sp
            LEFT JOIN classes c ON sp.class_id = c.id
            LEFT JOIN schools s ON sp.school_id = s.id
            WHERE sp.school_id = ?
        `;
        const params = [schoolId];

        if (class_id) {
            query += ' AND sp.class_id = ?';
            params.push(class_id);
        }
        if (status) {
            query += ' AND sp.status = ?';
            params.push(status);
        }
        if (search) {
            query += ' AND (sp.first_name LIKE ? OR sp.last_name LIKE ? OR sp.admission_number LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        query += ' ORDER BY sp.last_name ASC, sp.first_name ASC';

        const [students] = await pool.query(query, params);

        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        next(error);
    }
};

exports.createStudent = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const { admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, guardian_email, address } = req.body;

        if (!admission_number || !first_name || !last_name) {
            return res.status(400).json({ success: false, message: 'Admission number, first name, and last name are required' });
        }

        const [result] = await pool.query(`
            INSERT INTO student_profiles (school_id, admission_number, first_name, last_name, gender, date_of_birth, class_id, guardian_name, guardian_phone, guardian_email, address, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [schoolId, admission_number, first_name, last_name, gender || 'male', date_of_birth || null, class_id || null, guardian_name || null, guardian_phone || null, guardian_email || null, address || null]);

        res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
};

exports.getStudentDetails = async (req, res, next) => {
    try {
        const studentId = req.params.studentId;

        const [[student]] = await pool.query(`
            SELECT sp.*, c.name AS class_name, c.level, c.stream, s.name AS school_name
            FROM student_profiles sp
            LEFT JOIN classes c ON sp.class_id = c.id
            LEFT JOIN schools s ON sp.school_id = s.id
            WHERE sp.id = ?
        `, [studentId]);

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student profile not found' });
        }

        // Attendance stats
        const [attendance] = await pool.query(`
            SELECT attendance_date, status, notes
            FROM student_attendance
            WHERE student_id = ?
            ORDER BY attendance_date DESC
            LIMIT 15
        `, [studentId]);

        // Marks
        const [marks] = await pool.query(`
            SELECT m.score, m.max_score, m.grade, m.remarks, s.name AS subject_name, a.title AS assessment_title
            FROM marks m
            JOIN subjects s ON m.subject_id = s.id
            LEFT JOIN assessments a ON m.assessment_id = a.id
            WHERE m.student_id = ?
            ORDER BY m.created_at DESC
        `, [studentId]);

        res.json({
            success: true,
            data: {
                student,
                attendance,
                marks
            }
        });
    } catch (error) {
        next(error);
    }
};
