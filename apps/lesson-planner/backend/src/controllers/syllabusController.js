const { pool } = require('../config/database');
const pdf = require('pdf-parse');
const aiService = require('../services/aiService');
const syllabusImportService = require('../services/syllabusImportService');

/**
 * Normalizes and saves syllabus units and lessons into separate tables
 */
const saveNormalizedSyllabus = async (syllabusId, structuredData) => {
    if (!structuredData || !structuredData.units) return;
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        // Clear old ones first to avoid duplicates on update
        await connection.query('DELETE FROM syllabus_units WHERE syllabus_id = ?', [syllabusId]);

        for (const unit of structuredData.units) {
            const [unitRes] = await connection.query(
                'INSERT INTO syllabus_units (syllabus_id, grade_level, unit_number, unit_title, key_competence) VALUES (?, ?, ?, ?, ?)',
                [syllabusId, unit.grade_level, unit.unit_number, unit.unit_title, unit.key_competences]
            );
            const unitId = unitRes.insertId;

            if (unit.lessons && Array.isArray(unit.lessons)) {
                for (const lesson of unit.lessons) {
                    await connection.query(
                        'INSERT INTO syllabus_lessons (unit_id, lesson_number, lesson_title, knowledge_understanding, skills, attitudes_values, content_area, learning_activities) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            unitId, 
                            lesson.lesson_number, 
                            lesson.lesson_title, 
                            lesson.knowledge_understanding || null,
                            lesson.skills || null,
                            lesson.attitudes_values || null,
                            lesson.content_area || null,
                            lesson.learning_activities || null
                        ]
                    );
                }
            }
        }
        await connection.commit();
    } catch (err) {
        await connection.rollback();
        console.error('Error in saveNormalizedSyllabus:', err);
        throw err;
    } finally {
        connection.release();
    }
};

/**
 * Syllabus Management Controller (Admin)
 */

// Get all syllabuses
exports.getSyllabuses = async (req, res, next) => {
    try {
        const [syllabuses] = await pool.query('SELECT * FROM syllabuses ORDER BY subject_name ASC, grade_level ASC');
        res.json({ success: true, data: syllabuses });
    } catch (error) {
        next(error);
    }
};

// Get single syllabus
exports.getSyllabusById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [syllabuses] = await pool.query('SELECT * FROM syllabuses WHERE id = ?', [id]);
        
        if (syllabuses.length === 0) {
            return res.status(404).json({ success: false, message: 'Syllabus not found' });
        }

        const data = syllabuses[0];
        if (data.structured_data) {
            try {
                data.structured_data = JSON.parse(data.structured_data);
            } catch (e) {
                console.error('Failed to parse structured data for id:', id);
            }
        }

        res.json({ success: true, data: data });
    } catch (error) {
        next(error);
    }
};

// Find syllabus for a specific subject/level
exports.getSyllabusBySubject = async (req, res, next) => {
    try {
        const { subject, level } = req.query;
        if (!subject) return res.status(400).json({ success: false, message: 'Subject is required' });

        // TRY 1: Exact match with level
        let [rows] = await pool.query(
            'SELECT * FROM syllabuses WHERE subject_name = ? AND grade_level = ?',
            [subject, level]
        );

        // TRY 2: Just subject match (most common for REB overall syllabuses)
        if (rows.length === 0) {
            [rows] = await pool.query(
                'SELECT * FROM syllabuses WHERE subject_name = ? LIMIT 1',
                [subject]
            );
        }

        // TRY 3: Partial subject match (e.g. "Math" matches "Mathematics")
        if (rows.length === 0) {
            [rows] = await pool.query(
                'SELECT * FROM syllabuses WHERE subject_name LIKE ? LIMIT 1',
                [`%${subject}%`]
            );
        }

        if (rows.length === 0) {
            return res.json({ success: false, message: 'No syllabus found for this subject' });
        }

        res.json({
            success: true,
            data: {
                ...rows[0],
                structured_data: rows[0].structured_data ? JSON.parse(rows[0].structured_data) : null
            }
        });
    } catch (error) {
        next(error);
    }
};

// Create or Update syllabus (Manual Raw Text)
exports.upsertSyllabus = async (req, res, next) => {
    try {
        const { subject_name, grade_level, content_text, structured_data } = req.body;

        if (!subject_name) {
            return res.status(400).json({ success: false, message: 'Subject name is required' });
        }

        // AI Structuring if only raw text is provided
        let finalStructuredData = structured_data;
        if (!finalStructuredData && content_text) {
            try {
                const aiResult = await aiService.generateCurriculumFromSyllabus(content_text);
                finalStructuredData = aiResult;
            } catch (err) {
                console.warn('AI structuring failed during manual upload, saving raw text only.');
            }
        }

        // Check if exists
        const [existing] = await pool.query(
            'SELECT id FROM syllabuses WHERE subject_name = ? AND grade_level = ?',
            [subject_name, grade_level || null]
        );

        // Resolve subject_id from registered subjects (optional FK linkage)
        const { subject_id } = req.body;
        let resolvedSubjectId = subject_id || null;
        if (!resolvedSubjectId && subject_name) {
            const [srows] = await pool.query('SELECT id FROM subjects WHERE name = ? LIMIT 1', [subject_name]);
            if (srows.length > 0) resolvedSubjectId = srows[0].id;
        }

        if (existing.length > 0) {
            const syllabusId = existing[0].id;
            await pool.query(
                'UPDATE syllabuses SET content_text = ?, structured_data = ?, subject_id = ? WHERE id = ?',
                [content_text || null, JSON.stringify(finalStructuredData) || null, resolvedSubjectId, syllabusId]
            );
            await saveNormalizedSyllabus(syllabusId, finalStructuredData);
            res.json({ success: true, message: 'Syllabus updated successfully', data: finalStructuredData });
        } else {
            const [result] = await pool.query(
                'INSERT INTO syllabuses (subject_name, grade_level, content_text, structured_data, subject_id) VALUES (?, ?, ?, ?, ?)',
                [subject_name, grade_level || null, content_text || null, JSON.stringify(finalStructuredData) || null, resolvedSubjectId]
            );
            await saveNormalizedSyllabus(result.insertId, finalStructuredData);
            res.status(201).json({ success: true, message: 'Syllabus created successfully', data: finalStructuredData });
        }
    } catch (error) {
        next(error);
    }
};

// Process PDF Syllabus
exports.processPDFSyllabus = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { subject_name, grade_level } = req.body;
        if (!subject_name) {
            return res.status(400).json({ success: false, message: 'Subject name is required' });
        }

        console.log(`[Syllabus] Extracting text from PDF: ${req.file.originalname}...`);

        // 1. Extract text from PDF
        const data = await pdf(req.file.buffer);
        const extractedText = data.text;

        console.log(`[Syllabus] PDF parsed. Pages: ${data.numpages}. Text length: ${extractedText?.length || 0} chars.`);

        if (!extractedText || extractedText.trim().length < 100) {
            return res.status(400).json({ success: false, message: 'Could not extract enough text from PDF. It might be a scanned image or protected file.' });
        }

        console.log(`[Syllabus] Starting AI Structuring for ${subject_name}...`);

        // 2. Use AI to structure the content
        let structuredData;
        try {
            structuredData = await aiService.generateCurriculumFromSyllabus(extractedText);
            console.log(`[Syllabus] AI Structuring complete. Captured ${structuredData?.units?.length || 0} units.`);
        } catch (aiErr) {
            console.error(`[Syllabus] AI Error for ${subject_name}:`, aiErr.message);
            return res.status(500).json({
                success: false,
                message: 'AI failed to structure the syllabus. This often happens with very large books. You can try pasting the specific units/lessons as text manually.',
                debug: aiErr.message
            });
        }

        // 3. Resolve subject_id FK
        const { subject_id } = req.body;
        let resolvedSubjectId = subject_id || null;
        if (!resolvedSubjectId && subject_name) {
            const [srows] = await pool.query('SELECT id FROM subjects WHERE name = ? LIMIT 1', [subject_name]);
            if (srows.length > 0) resolvedSubjectId = srows[0].id;
        }

        // 4. Save or Update in Database
        const [existing] = await pool.query(
            'SELECT id FROM syllabuses WHERE subject_name = ? AND grade_level = ?',
            [subject_name, grade_level || null]
        );

        if (existing.length > 0) {
            const syllabusId = existing[0].id;
            await pool.query(
                'UPDATE syllabuses SET content_text = ?, structured_data = ?, subject_id = ? WHERE id = ?',
                [extractedText.substring(0, 50000), JSON.stringify(structuredData), resolvedSubjectId, syllabusId]
            );
            await saveNormalizedSyllabus(syllabusId, structuredData);
        } else {
            const [result] = await pool.query(
                'INSERT INTO syllabuses (subject_name, grade_level, content_text, structured_data, subject_id) VALUES (?, ?, ?, ?, ?)',
                [subject_name, grade_level || null, extractedText.substring(0, 50000), JSON.stringify(structuredData), resolvedSubjectId]
            );
            await saveNormalizedSyllabus(result.insertId, structuredData);
        }

        res.json({
            success: true,
            message: 'Syllabus processed and structured successfully',
            data: structuredData
        });

    } catch (error) {
        console.error('[Syllabus Controller] Error:', error);
        next(error);
    }
};

// Get syllabus directly by subject_id (FK-based — used in UnitsPage)
exports.getSyllabusBySubjectId = async (req, res, next) => {
    try {
        const { subjectId } = req.params;
        const [rows] = await pool.query(
            `SELECT s.*, su.id as has_units FROM syllabuses s
             LEFT JOIN syllabus_units su ON su.syllabus_id = s.id
             WHERE s.subject_id = ? LIMIT 1`,
            [subjectId]
        );
        if (rows.length === 0) {
            return res.json({ success: false, message: 'No syllabus linked to this subject' });
        }
        const syllabus = rows[0];
        // Get all units for this syllabus
        const [units] = await pool.query(
            `SELECT su.*, JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', sl.id,
                    'lesson_number', sl.lesson_number,
                    'lesson_title', sl.lesson_title,
                    'content_area', sl.content_area
                )
            ) as lessons
             FROM syllabus_units su
             LEFT JOIN syllabus_lessons sl ON sl.unit_id = su.id
             WHERE su.syllabus_id = ?
             GROUP BY su.id
             ORDER BY su.unit_number ASC`,
            [syllabus.id]
        );

        res.json({
            success: true,
            data: {
                syllabus: { id: syllabus.id, subject_name: syllabus.subject_name, grade_level: syllabus.grade_level },
                units: units.map(u => ({
                    ...u,
                    lessons: typeof u.lessons === 'string' ? JSON.parse(u.lessons) : (u.lessons || [])
                }))
            }
        });
    } catch (error) {
        next(error);
    }
};

// Delete syllabus
exports.deleteSyllabus = async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM syllabuses WHERE id = ?', [id]);
        res.json({ success: true, message: 'Syllabus deleted successfully' });
    } catch (error) {
        next(error);
    }
};
// Update structured data (Units and Lessons)
exports.updateSyllabusStructuredData = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { structured_data } = req.body;

        if (!structured_data || !structured_data.units) {
            return res.status(400).json({ success: false, message: 'Invalid structured data provided' });
        }

        await pool.query(
            'UPDATE syllabuses SET structured_data = ? WHERE id = ?',
            [JSON.stringify(structured_data), id]
        );

        // SYNC NORMALIZED TABLES
        await saveNormalizedSyllabus(id, structured_data);

        res.json({ success: true, message: 'Syllabus structure updated successfully', data: structured_data });
    } catch (error) {
        next(error);
    }
};

// Deterministic Match and Import
exports.matchSyllabus = async (req, res, next) => {
    try {
        const { class_name, subject_name } = req.query;
        if (!class_name || !subject_name) {
            return res.status(400).json({ success: false, message: 'Missing parameters' });
        }

        console.log(`[Syllabus Match] Smart Searching Class: "${class_name}", Subject: "${subject_name}"`);

        // 1. Identify Grade Level and Abbreviation (Smart regex)
        let gradeLevel = '';
        let gradeAbbr = '';
        const normalizedClassName = (class_name || '').toUpperCase().trim();
        
        // Match Senior/Primary patterns
        const sMatch = normalizedClassName.match(/(?:S|SENIOR)\s*([1-6])/);
        const pMatch = normalizedClassName.match(/(?:P|PRIMARY)\s*([1-6])/);

        if (sMatch) {
            gradeAbbr = `S${sMatch[1]}`;
            gradeLevel = `Senior ${sMatch[1]}`;
        } else if (pMatch) {
            gradeAbbr = `P${pMatch[1]}`;
            gradeLevel = `Primary ${pMatch[1]}`;
        }

        // 2. Normalize Subject Name and Keywords
        const s = (subject_name || '').toLowerCase();
        let formalSubject = subject_name;
        let kw = subject_name.split(' ')[0];

        if (s.includes('math')) { formalSubject = 'Mathematics'; kw = 'Math'; }
        else if (s.includes('bio')) { formalSubject = 'Biology'; kw = 'Bio'; }
        else if (s.includes('chem')) { formalSubject = 'Chemistry'; kw = 'Chem'; }
        else if (s.includes('phy')) { formalSubject = 'Physics'; kw = 'Phy'; }
        else if (s.includes('ict') || s.includes('computer') || s.includes('technology')) { formalSubject = 'Information and Communication Technology'; kw = 'SET'; }
        else if (s.includes('eng')) { formalSubject = 'English'; kw = 'Eng'; }
        else if (s.includes('kiny')) { formalSubject = 'Kinyarwanda'; kw = 'Kiny'; }
        else if (s.includes('ent')) { formalSubject = 'Entrepreneurship'; kw = 'Ent'; }
        else if (s.includes('geo')) { formalSubject = 'Geography'; kw = 'Geo'; }
        else if (s.includes('hist')) { formalSubject = 'History'; kw = 'Hist'; }

        console.log(`[Syllabus Match] Querying for Grade: ${gradeAbbr}, Subject: ${kw}`);

        // 3. Find Syllabus (Simplified robust query)
        let query = `
            SELECT id, subject_name, grade_level FROM syllabuses 
            WHERE (subject_name LIKE ? OR ? LIKE CONCAT('%', subject_name, '%'))
        `;
        let params = [`%${kw}%`, kw];

        if (gradeAbbr) {
            query += ` AND (
                grade_level LIKE ? 
                OR subject_name LIKE ? 
                OR subject_name LIKE ?
                OR subject_name LIKE ?
            )`;
            params.push(`%${gradeLevel}%`, `%${gradeAbbr}%`, `% ${gradeAbbr}%`, `%${gradeAbbr} %`);
        }
        
        query += ' LIMIT 1';

        const [rows] = await pool.query(query, params);

        if (!rows || rows.length === 0) {
            return res.json({ success: false, message: 'No matching syllabus found.' });
        }

        const syllabusFound = rows[0];

        // 4. Get Units
        const [units] = await pool.query(
            'SELECT * FROM syllabus_units WHERE syllabus_id = ? ORDER BY unit_number ASC',
            [syllabusFound.id]
        );

        res.json({
            success: true,
            syllabus: syllabusFound,
            units: units,
            meta: { gradeLevel, formalSubject, gradeAbbr }
        });

    } catch (error) {
        console.error('[Syllabus Match Error]:', error);
        res.status(500).json({ success: false, message: 'Server error during match', error: error.message });
    }
};

exports.performImport = async (req, res, next) => {
    try {
        const { unitIds, classId, subjectId } = req.body;

        if (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0 || !classId || !subjectId) {
            return res.status(400).json({ success: false, message: 'Missing import data' });
        }

        const result = await syllabusImportService.importSyllabusUnitsToClassSubject({
            unitIds,
            classId: Number(classId),
            subjectId: Number(subjectId)
        });

        return res.json({
            success: true,
            message: `Successfully imported ${result.importedUnits.length} units and their lessons.`,
            data: { importedUnits: result.importedUnits },
            meta: {
                classId: result.classId,
                subjectId: result.subjectId,
                classSubjectId: result.classSubjectId,
                teacherId: result.teacherId
            }
        });
    } catch (error) {
        console.error('[Syllabus Import Error]:', error);
        if (error.message && error.message.includes('not found')) {
            return res.status(404).json({ success: false, message: error.message });
        }
        return res.status(500).json({ success: false, message: error.message, error: error.stack });
    }
};
