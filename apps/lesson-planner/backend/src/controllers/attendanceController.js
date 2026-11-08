const { pool } = require('../config/database');

/**
 * Attendance Controller
 * Manages daily student attendance by class and teacher faculty attendance check-in/out
 */

// Get student attendance by class & date
exports.getStudentAttendance = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const { class_id, date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Fetch all students in the class
        const [students] = await pool.query(`
            SELECT sp.id AS student_id, sp.admission_number, sp.first_name, sp.last_name, sp.gender,
                   COALESCE(sa.status, 'present') AS status,
                   sa.notes, sa.id AS attendance_id
            FROM student_profiles sp
            LEFT JOIN student_attendance sa ON sp.id = sa.student_id AND sa.attendance_date = ?
            WHERE sp.school_id = ? AND (sp.class_id = ? OR ? IS NULL)
            ORDER BY sp.last_name ASC, sp.first_name ASC
        `, [targetDate, schoolId, class_id, class_id]);

        res.json({
            success: true,
            data: {
                date: targetDate,
                class_id,
                students
            }
        });
    } catch (error) {
        next(error);
    }
};

// Record student attendance batch
exports.recordStudentAttendance = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const recordedBy = req.user?.id || 108;
        const { class_id, date, records } = req.body; // records: [{ student_id, status, notes }]

        const attendanceDate = date || new Date().toISOString().split('T')[0];

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: 'records array is required' });
        }

        for (const item of records) {
            await pool.query(`
                INSERT INTO student_attendance (school_id, student_id, class_id, attendance_date, status, notes, recorded_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    status = VALUES(status),
                    notes = VALUES(notes),
                    recorded_by = VALUES(recorded_by)
            `, [schoolId, item.student_id, class_id, attendanceDate, item.status || 'present', item.notes || null, recordedBy]);
        }

        res.json({
            success: true,
            message: `Recorded attendance for ${records.length} students`
        });
    } catch (error) {
        next(error);
    }
};

// Get teacher faculty attendance
exports.getTeacherAttendance = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const [teachers] = await pool.query(`
            SELECT u.id AS teacher_id, u.full_name, u.email, tp.staff_number,
                   COALESCE(ta.status, 'present') AS status,
                   ta.check_in, ta.check_out, ta.notes, ta.id AS attendance_id
            FROM users u
            JOIN teacher_profiles tp ON u.id = tp.user_id
            LEFT JOIN teacher_attendance ta ON u.id = ta.teacher_id AND ta.attendance_date = ?
            WHERE u.school_id = ? AND u.role = 'teacher'
            ORDER BY u.full_name ASC
        `, [targetDate, schoolId]);

        res.json({
            success: true,
            data: {
                date: targetDate,
                teachers
            }
        });
    } catch (error) {
        next(error);
    }
};

// Record teacher attendance check-in/out
exports.recordTeacherAttendance = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const recordedBy = req.user?.id || 104;
        const { teacher_id, date, status, check_in, check_out, notes } = req.body;

        const targetDate = date || new Date().toISOString().split('T')[0];

        await pool.query(`
            INSERT INTO teacher_attendance (school_id, teacher_id, attendance_date, status, check_in, check_out, notes, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                check_in = VALUES(check_in),
                check_out = VALUES(check_out),
                notes = VALUES(notes)
        `, [schoolId, teacher_id, targetDate, status || 'present', check_in || '08:00:00', check_out || null, notes || null, recordedBy]);

        res.json({
            success: true,
            message: 'Teacher attendance logged successfully'
        });
    } catch (error) {
        next(error);
    }
};
