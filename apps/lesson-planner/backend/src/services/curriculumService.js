const { pool } = require('../config/database');
const aiService = require('./aiService');

/**
 * Service for automated curriculum (Units/Lessons) generation
 */
class CurriculumService {

    async autoGenerateForClassSubject(classSubjectId, subject, classData) {
        try {
            console.log(`[Curriculum] Starting automation for ${subject.name} in ${classData.name}`);

            // 1. Try to find an REB syllabus
            // We search by subject name (case insensitive) and optionally grade level if class name contains it (e.g., S4, P5)
            const gradeMatch = classData.name.match(/[SPsp][1-6]/i);
            const gradeLevel = gradeMatch ? gradeMatch[0].toUpperCase() : null;

            let query = 'SELECT * FROM syllabuses WHERE LOWER(subject_name) = LOWER(?)';
            let params = [subject.name];

            if (gradeLevel) {
                query += ' AND (grade_level = ? OR grade_level IS NULL)';
                params.push(gradeLevel);
            }
            query += ' ORDER BY grade_level DESC LIMIT 1'; // Prefer specific grade match

            const [syllabuses] = await pool.query(query, params);

            if (syllabuses.length === 0) {
                console.log(`[Curriculum] No syllabus found for ${subject.name}. Teacher will create manually.`);
                return false;
            }

            const syllabus = syllabuses[0];
            let structuredData;

            // 2. Extract structured data
            if (syllabus.structured_data) {
                structuredData = typeof syllabus.structured_data === 'string'
                    ? JSON.parse(syllabus.structured_data)
                    : syllabus.structured_data;
            } else if (syllabus.content_text) {
                console.log(`[Curriculum] Parsing raw text syllabus with AI...`);
                structuredData = await aiService.generateCurriculumFromSyllabus(syllabus.content_text);

                // Cache it for next time
                await pool.query(
                    'UPDATE syllabuses SET structured_data = ? WHERE id = ?',
                    [JSON.stringify(structuredData), syllabus.id]
                );
            }

            if (!structuredData || !structuredData.units) {
                return false;
            }

            // 3. Create Units and Lessons in DB
            for (const unit of structuredData.units) {
                const [unitResult] = await pool.query(
                    'INSERT INTO units (class_subject_id, unit_number, unit_title, key_competences) VALUES (?, ?, ?, ?)',
                    [classSubjectId, unit.unit_number, unit.unit_title, unit.key_competences || null]
                );

                const unitId = unitResult.insertId;

                if (unit.lessons && Array.isArray(unit.lessons)) {
                    for (const lesson of unit.lessons) {
                        await pool.query(
                            'INSERT INTO lessons (unit_id, lesson_number, lesson_name) VALUES (?, ?, ?)',
                            [unitId, lesson.lesson_number, lesson.lesson_title]
                        );
                    }
                }
            }

            console.log(`[Curriculum] Successfully generated ${structuredData.units.length} units for ${subject.name}`);
            return true;

        } catch (error) {
            console.error('[Curriculum Automation Error]:', error);
            return false;
        }
    }
}

module.exports = new CurriculumService();
