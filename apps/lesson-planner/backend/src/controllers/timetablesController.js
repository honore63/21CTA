const { pool } = require('../config/database');

/**
 * Timetables Controller
 * Handles class, teacher, and school-wide timetable schedules
 */

exports.getTimetable = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || req.query.school_id || 1;
        const { class_id, teacher_id, day_of_week } = req.query;

        let query = `
            SELECT ts.*, c.name AS class_name, s.name AS subject_name, s.code AS subject_code,
                   u.full_name AS teacher_name
            FROM timetable_slots ts
            JOIN classes c ON ts.class_id = c.id
            JOIN subjects s ON ts.subject_id = s.id
            LEFT JOIN users u ON ts.teacher_id = u.id
            WHERE ts.school_id = ?
        `;
        const params = [schoolId];

        if (class_id) {
            query += ' AND ts.class_id = ?';
            params.push(class_id);
        }
        if (teacher_id) {
            query += ' AND ts.teacher_id = ?';
            params.push(teacher_id);
        }
        if (day_of_week) {
            query += ' AND ts.day_of_week = ?';
            params.push(day_of_week);
        }

        query += ' ORDER BY FIELD(ts.day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"), ts.start_time ASC';

        const [slots] = await pool.query(query, params);

        res.json({
            success: true,
            data: slots
        });
    } catch (error) {
        next(error);
    }
};

exports.createSlot = async (req, res, next) => {
    try {
        const schoolId = req.user?.school_id || 1;
        const { class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, academic_year = '2025-2026' } = req.body;

        if (!class_id || !subject_id || !day_of_week || !start_time || !end_time) {
            return res.status(400).json({ success: false, message: 'Class, subject, day, start and end times are required' });
        }

        const [result] = await pool.query(`
            INSERT INTO timetable_slots (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, academic_year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [schoolId, class_id, subject_id, teacher_id || null, day_of_week, start_time, end_time, room || null, academic_year]);

        res.status(201).json({
            success: true,
            message: 'Timetable slot created successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteSlot = async (req, res, next) => {
    try {
        const slotId = req.params.slotId;
        await pool.query('DELETE FROM timetable_slots WHERE id = ?', [slotId]);
        res.json({ success: true, message: 'Timetable slot deleted' });
    } catch (error) {
        next(error);
    }
};
