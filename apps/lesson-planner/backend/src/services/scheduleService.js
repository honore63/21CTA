const { pool } = require('../config/database');

/**
 * Service to manage teacher timetables and automated lesson scheduling
 */
class ScheduleService {

    /**
     * Get teacher's weekly schedule for a specific class subject
     */
    async getTeacherSchedule(teacherId, classSubjectId) {
        const [rows] = await pool.query(
            'SELECT * FROM teacher_schedules WHERE teacher_id = ? AND class_subject_id = ? ORDER BY day_of_week, start_time',
            [teacherId, classSubjectId]
        );
        return rows;
    }

    /**
     * Save teacher's schedule slots
     */
    async saveScheduleSlots(teacherId, classSubjectId, slots) {
        // slots: [{ day_of_week, start_time, end_time, location }]
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Clear existing for this specific class_subject
            await connection.query(
                'DELETE FROM teacher_schedules WHERE teacher_id = ? AND class_subject_id = ?',
                [teacherId, classSubjectId]
            );

            for (const slot of slots) {
                await connection.query(
                    'INSERT INTO teacher_schedules (teacher_id, class_subject_id, day_of_week, start_time, end_time, location) VALUES (?, ?, ?, ?, ?, ?)',
                    [teacherId, classSubjectId, slot.day_of_week, slot.start_time, slot.end_time, slot.location || null]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Automatically populate lesson dates based on schedule and term start
     */
    async autoPopulateLessonDates(classSubjectId, startDate) {
        // 1. Get Teacher ID and Subject Details
        const [csData] = await pool.query(
            'SELECT cs.*, c.teacher_id FROM class_subjects cs JOIN classes c ON cs.class_id = c.id WHERE cs.id = ?',
            [classSubjectId]
        );
        if (csData.length === 0) throw new Error('Class subject not found');
        const teacherId = csData[0].teacher_id;

        // 2. Get Schedule
        const schedule = await this.getTeacherSchedule(teacherId, classSubjectId);
        if (schedule.length === 0) throw new Error('No schedule defined for this subject. Please set your timetable first.');

        // 3. Get Holidays
        const [holidays] = await pool.query('SELECT holiday_date FROM holidays');

        // 4. Get all lessons that don't have a date yet (or all in order)
        const [lessons] = await pool.query(
            `SELECT l.* FROM lessons l 
             JOIN units u ON l.unit_id = u.id 
             WHERE u.class_subject_id = ? 
             ORDER BY u.unit_number ASC, l.lesson_number ASC`,
            [classSubjectId]
        );

        if (lessons.length === 0) return { success: true, message: 'No lessons to schedule' };

        let currentDate = new Date(startDate);
        // Start from day before so getNext returns startDate if it matches
        currentDate.setDate(currentDate.getDate() - 1);

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        let updatedCount = 0;

        for (const lesson of lessons) {
            let foundDate = false;
            let safetyCounter = 0;

            while (!foundDate && safetyCounter < 365) {
                currentDate.setDate(currentDate.getDate() + 1);
                safetyCounter++;

                const dayName = dayNames[currentDate.getDay()];
                const slot = schedule.find(s => s.day_of_week === dayName);

                if (slot) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const isHoliday = holidays.some(h => {
                        const hDate = new Date(h.holiday_date);
                        return hDate.toISOString().split('T')[0] === dateStr;
                    });

                    if (!isHoliday) {
                        // Update lesson with this date
                        await pool.query(
                            'UPDATE lessons SET teaching_date = ? WHERE id = ?',
                            [dateStr, lesson.id]
                        );
                        foundDate = true;
                        updatedCount++;
                    }
                }
            }
        }

        return { success: true, updatedCount };
    }
}

module.exports = new ScheduleService();
