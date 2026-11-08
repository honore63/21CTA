const scheduleService = require('../services/scheduleService');

exports.getSchedule = async (req, res, next) => {
    try {
        const { classSubjectId } = req.params;
        const schedule = await scheduleService.getTeacherSchedule(req.user.id, classSubjectId);
        res.json({ success: true, data: schedule });
    } catch (error) {
        next(error);
    }
};

exports.updateSchedule = async (req, res, next) => {
    try {
        const { classSubjectId } = req.params;
        const { slots } = req.body; // Array of { day_of_week, start_time, end_time, location }
        await scheduleService.saveScheduleSlots(req.user.id, classSubjectId, slots);
        res.json({ success: true, message: 'Schedule updated successfully' });
    } catch (error) {
        next(error);
    }
};

exports.autoPopulateDates = async (req, res, next) => {
    try {
        const { classSubjectId } = req.params;
        const { startDate } = req.body;
        const result = await scheduleService.autoPopulateLessonDates(classSubjectId, startDate || new Date());
        res.json({
            success: true,
            message: `Successfully scheduled ${result.updatedCount} lessons.`,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
