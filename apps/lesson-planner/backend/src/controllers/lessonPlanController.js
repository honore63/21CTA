const { pool } = require('../config/database');
const aiService = require('../services/aiService');
const { ensureExtractedText } = require('./referenceMaterialController');


/**
 * Lesson Plan Controller
 */


// Get lesson plan for a lesson
exports.getLessonPlan = async (req, res, next) => {
    try {
        const { lessonId } = req.params;

        const [lessonPlans] = await pool.query(
            `SELECT l.id as lesson_id, l.lesson_number, l.lesson_title, l.duration, l.teaching_date, l.term, l.location, l.unit_id,
                lp.id as id, lp.content, lp.version, lp.generated_by_ai, lp.ai_provider, lp.created_at, lp.updated_at,
                COALESCE(l.school_name, usr.school_name) as school_name, 
                COALESCE(l.teacher_name, usr.full_name) as teacher_name, 
                COALESCE(l.class_size, c.class_size) as class_size,
                u.unit_number, u.unit_title,
                s.name as subject_name,
                c.name as class_name,
                (SELECT MAX(lesson_number) FROM lessons WHERE unit_id = l.unit_id) as total_lessons
             FROM lessons l
             LEFT JOIN lesson_plans lp ON l.id = lp.lesson_id
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             JOIN users usr ON c.teacher_id = usr.id
             WHERE l.id = ? 
             ORDER BY lp.created_at DESC LIMIT 1`,
            [lessonId]
        );

        if (lessonPlans.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found'
            });
        }

        const data = lessonPlans[0];

        // Check if there is NO plan content yet (newly created lesson)
        if (!data.id) {
            // Get special needs for the lesson metadata even if no plan
            const [specialNeeds] = await pool.query(
                'SELECT * FROM special_needs_learners WHERE lesson_id = ?',
                [lessonId]
            );
            data.special_needs = specialNeeds;
            
            return res.json({
                success: true,
                message: 'Lesson metadata loaded, but no plan generated yet.',
                noPlan: true,
                data: data
            });
        }

        // Get special needs for the lesson
        const [specialNeeds] = await pool.query(
            'SELECT * FROM special_needs_learners WHERE lesson_id = ?',
            [lessonId]
        );

        data.special_needs = specialNeeds;

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        next(error);
    }
};

// Get all lesson plans for a lesson (history)
exports.getLessonPlanHistory = async (req, res, next) => {
    try {
        const { lessonId } = req.params;

        const [lessonPlans] = await pool.query(
            'SELECT * FROM lesson_plans WHERE lesson_id = ? ORDER BY created_at DESC',
            [lessonId]
        );

        res.json({
            success: true,
            data: lessonPlans
        });
    } catch (error) {
        next(error);
    }
};

// Plan limits map (single source of truth on backend)
const PLAN_LIMITS = {
    free:     { plansPerDay: 2,        totalPlans: null,  resetDaily: true  },
    basic:    { plansPerDay: null,      totalPlans: 5,     resetDaily: false }, // one-time top-up
    standard: { plansPerDay: 10,       totalPlans: null,  resetDaily: true  },
    vip:      { plansPerDay: Infinity,  totalPlans: null,  resetDaily: true  },
};

// Helper: get or create subscription row for a user
async function getUserSubscription(userId) {
    return { plan: 'vip', status: 'active', plans_used_today: 0, total_plans_used: 0, last_reset_date: null };
}

// Helper: check if user can generate a plan
async function checkAndIncrementUsage(userId, count = 1) {
    return { allowed: true };
}

// Generate AI lesson plan
exports.generateLessonPlan = async (req, res, next) => {
    try {
        const { lessonId } = req.params;
        const { provider } = req.body;
        const userId = req.user.id;

        // ─── SUBSCRIPTION GATE ───────────────────────────────────────
        const access = await checkAndIncrementUsage(userId);
        if (!access.allowed) {
            return res.status(403).json({
                success: false,
                subscriptionError: true,
                message: access.message
            });
        }
        // ─────────────────────────────────────────────────────────────

        // Get lesson details
        const [lessons] = await pool.query(
            `SELECT l.*, u.unit_number, u.unit_title, u.key_competences,
        cs.subject_id, cs.class_id, c.name as class_name,
        COALESCE(l.school_name, usr.school_name) as school_name, 
        COALESCE(l.teacher_name, usr.full_name) as teacher_name, 
        COALESCE(l.class_size, c.class_size) as class_size
       FROM lessons l
       JOIN units u ON l.unit_id = u.id
       JOIN class_subjects cs ON u.class_subject_id = cs.id
       JOIN classes c ON cs.class_id = c.id
       JOIN users usr ON c.teacher_id = usr.id
       WHERE l.id = ?`,
            [lessonId]
        );

        if (lessons.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found'
            });
        }

        const lesson = lessons[0];

        // Get subject details
        const [subjects] = await pool.query(
            'SELECT * FROM subjects WHERE id = ?',
            [lesson.subject_id]
        );

        const subject = subjects[0];

        // Get special needs
        const [specialNeeds] = await pool.query(
            'SELECT * FROM special_needs_learners WHERE lesson_id = ?',
            [lessonId]
        );

        // Get relevant teaching materials (general)
        const [materials] = await pool.query(
            `SELECT * FROM teaching_materials 
             WHERE subject_id = ? OR subject_id IS NULL
             ORDER BY created_at DESC
             LIMIT 10`,
            [lesson.subject_id]
        );

        // Get specific reference materials (books) attached to this lesson
        const [referenceMaterials] = await pool.query(
            `SELECT rm.* FROM reference_materials rm
             JOIN lesson_materials lm ON rm.id = lm.material_id
             WHERE lm.lesson_id = ?`,
            [lessonId]
        );

        // Fetch Official Syllabus Content — try FK (subject_id) first, then legacy name match
        let syllabusContent = null;
        const [syllabusesById] = await pool.query(
            'SELECT content_text FROM syllabuses WHERE subject_id = ? LIMIT 1',
            [lesson.subject_id]
        );
        if (syllabusesById.length > 0) {
            syllabusContent = syllabusesById[0].content_text;
        } else {
            // Legacy fallback: match by subject name string
            const [syllabuses] = await pool.query(
                'SELECT content_text FROM syllabuses WHERE subject_name = ? LIMIT 1',
                [subject.name]
            );
            syllabusContent = syllabuses.length > 0 ? syllabuses[0].content_text : null;
        }

        // Extract text from reference materials (supports both local files and Cloudinary URLs)
        await Promise.all(referenceMaterials.map(async (mat) => {
            if (mat.extracted_text) return; // Already cached

            const text = await ensureExtractedText(mat).catch(e => {
                console.error(`Failed to extract text for material ${mat.id}:`, e.message);
                return '';
            });

            if (text) {
                mat.extracted_text = text;
                // Cache back to DB for speed next time
                pool.query(
                    'UPDATE reference_materials SET extracted_text = ? WHERE id = ?',
                    [text.substring(0, 50000), mat.id]
                ).catch(err => console.error('Failed to cache extracted text:', err.message));
            }

            if (!mat.extracted_text) {
                mat.extracted_text = '[Content Unavailable: File could not be read. Use general knowledge.]';
            }
        }));

        // Prepare data for AI
        const lessonData = {
            subject: {
                name: subject.name,
                code: subject.code
            },
            unit: {
                unit_number: lesson.unit_number,
                unit_title: lesson.unit_title,
                key_competences: lesson.key_competences
            },
            lesson: {
                lesson_number: lesson.lesson_number,
                lesson_title: lesson.lesson_title,
                teaching_date: lesson.teaching_date,
                term: lesson.term,
                location: lesson.location,
                school_name: lesson.school_name,
                teacher_name: lesson.teacher_name,
                class_size: lesson.class_size,
                class_name: lesson.class_name,
                learning_materials: lesson.learning_materials
            },
            duration: lesson.duration,
            specialNeeds: specialNeeds,
            materials: materials,
            referenceMaterials: referenceMaterials,
            syllabusContent: syllabusContent
        };

        // Generate lesson plan using AI
        const aiResult = await aiService.generateLessonPlan(lessonData, provider);

        // Calculate version number
        const [existingPlans] = await pool.query(
            'SELECT MAX(version) as max_version FROM lesson_plans WHERE lesson_id = ?',
            [lessonId]
        );

        const version = (existingPlans[0].max_version || 0) + 1;

        // Parse AI result and inject database values for data fidelity
        let finalContent = aiResult.content;
        try {
            const planData = JSON.parse(aiResult.content);
            if (!planData.header_details) planData.header_details = {};

            // Force data from database into the header details
            planData.header_details.school_name = lesson.school_name;
            planData.header_details.teacher_name = lesson.teacher_name;
            planData.header_details.class_size = lesson.class_size;
            planData.header_details.location = lesson.location;

            finalContent = JSON.stringify(planData);
        } catch (e) {
            console.error("Error parsing AI result for injection! SyntaxError at:", e.message);
            console.error("Truncated AI content:", aiResult.content.substring(0, 200) + "...");
            // Fallback to original content if parsing fails
        }

        // Save lesson plan
        const [result] = await pool.query(
            `INSERT INTO lesson_plans (lesson_id, content, version, generated_by_ai, ai_provider)
       VALUES (?, ?, ?, ?, ?)`,
            [lessonId, finalContent, version, true, aiResult.provider]
        );

        const lessonPlanId = result.insertId;

        // Prune old versions (Keep only this new one and don't delete newer ones from concurrent requests)
        try {
            await pool.query(
                'DELETE FROM lesson_plans WHERE lesson_id = ? AND id < ?',
                [lessonId, lessonPlanId]
            );
        } catch (pruneErr) {
            console.warn('Silent failure pruning old plans for lesson:', lessonId);
        }

        // Log AI generation
        await pool.query(
            `INSERT INTO ai_generation_logs (lesson_plan_id, prompt_used, materials_referenced, ai_provider, generation_time)
       VALUES (?, ?, ?, ?, ?)`,
            [
                lessonPlanId,
                aiResult.prompt,
                JSON.stringify(materials.map(m => m.id)),
                aiResult.provider,
                aiResult.generationTime
            ]
        );

        // Get created lesson plan with full metadata
        const [newLessonPlan] = await pool.query(
            `SELECT lp.*, 
                l.lesson_number, l.lesson_title, l.duration, l.teaching_date, l.term, l.location, l.unit_id,
                COALESCE(l.school_name, usr.school_name) as school_name, 
                COALESCE(l.teacher_name, usr.full_name) as teacher_name, 
                COALESCE(l.class_size, c.class_size) as class_size,
                u.unit_number, u.unit_title,
                s.name as subject_name,
                c.name as class_name,
                (SELECT MAX(lesson_number) FROM lessons WHERE unit_id = l.unit_id) as total_lessons
             FROM lesson_plans lp
             JOIN lessons l ON lp.lesson_id = l.id
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             JOIN users usr ON c.teacher_id = usr.id
             WHERE lp.id = ?`,
            [lessonPlanId]
        );

        const data = newLessonPlan[0];
        const [specialNeedsData] = await pool.query(
            'SELECT * FROM special_needs_learners WHERE lesson_id = ?',
            [lessonId]
        );
        data.special_needs = specialNeedsData;

        res.status(201).json({
            success: true,
            message: 'Lesson plan generated successfully',
            data: data
        });
    } catch (error) {
        next(error);
    }
};

// Update lesson plan (manual edit)
exports.updateLessonPlan = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Please provide lesson plan content'
            });
        }

        await pool.query(
            'UPDATE lesson_plans SET content = ?, generated_by_ai = ? WHERE id = ?',
            [content, false, id]
        );

        const [updatedPlan] = await pool.query(
            'SELECT * FROM lesson_plans WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Lesson plan updated successfully',
            data: updatedPlan[0]
        });
    } catch (error) {
        next(error);
    }
};

// Delete lesson plan
exports.deleteLessonPlan = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [lessonPlans] = await pool.query(
            'SELECT * FROM lesson_plans WHERE id = ?',
            [id]
        );

        if (lessonPlans.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lesson plan not found'
            });
        }

        await pool.query('DELETE FROM lesson_plans WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Lesson plan deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

// Get all lesson plans for a unit (for bulk download)
exports.getUnitLessonPlans = async (req, res, next) => {
    try {
        const { unitId } = req.params;

        // Optimized query to get all latest lesson plans for a unit in one go
        // We use a subquery to ensure we only get the latest version for each lesson
        const [plans] = await pool.query(
            `SELECT lp.*, 
                l.lesson_number, l.lesson_title, l.duration, l.teaching_date, l.term, l.location, 
                COALESCE(l.school_name, usr.school_name) as school_name, 
                COALESCE(l.teacher_name, usr.full_name) as teacher_name, 
                COALESCE(l.class_size, c.class_size) as class_size,
                u.unit_number, u.unit_title,
                s.name as subject_name,
                c.name as class_name,
                (SELECT MAX(ln.lesson_number) FROM lessons ln WHERE ln.unit_id = u.id) as total_lessons
             FROM lesson_plans lp
             JOIN lessons l ON lp.lesson_id = l.id
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             JOIN users usr ON c.teacher_id = usr.id
             WHERE u.id = ? 
             AND lp.id = (
                SELECT id FROM lesson_plans lp2 
                WHERE lp2.lesson_id = l.id 
                ORDER BY lp2.created_at DESC LIMIT 1
             )
             ORDER BY l.lesson_number ASC`,
            [unitId]
        );

        if (plans.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Get all special needs for these lessons in one query
        const lessonIds = plans.map(p => p.lesson_id);
        const [allSpecialNeeds] = await pool.query(
            'SELECT * FROM special_needs_learners WHERE lesson_id IN (?)',
            [lessonIds]
        );

        // Map special needs to plans
        const plansWithNeeds = plans.map(plan => ({
            ...plan,
            special_needs: allSpecialNeeds.filter(sn => sn.lesson_id === plan.lesson_id)
        }));

        res.json({
            success: true,
            data: plansWithNeeds
        });
    } catch (error) {
        console.error('Error in getUnitLessonPlans:', error);
        next(error);
    }
};

// Batch generate all lesson plans for a unit
const activeBatches = new Set();

exports.batchGenerateUnitPlans = async (req, res, next) => {
    const { unitId } = req.params;
    const userId = req.user.id;

    if (activeBatches.has(userId)) {
        return res.status(429).json({
            success: false,
            message: 'A batch generation process is already running for your account. Please wait for it to complete.'
        });
    }

    try {
        activeBatches.add(userId);
        const { provider } = req.body;

        // 1. Get all lessons in the unit
        const [lessons] = await pool.query(
            `SELECT l.*, u.unit_number, u.unit_title, u.key_competences,
                cs.subject_id, cs.class_id, c.name as class_name,
                s.name as subject_name,
                COALESCE(l.school_name, usr.school_name) as school_name, 
                COALESCE(l.teacher_name, usr.full_name) as teacher_name, 
                COALESCE(l.class_size, c.class_size) as class_size
             FROM lessons l
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             JOIN users usr ON c.teacher_id = usr.id
             WHERE u.id = ?
             ORDER BY l.lesson_number ASC`,
            [unitId]
        );

        if (lessons.length === 0) {
            return res.status(404).json({ success: false, message: 'No lessons found in this unit' });
        }

        console.log(`[Batch] Starting generation for unit ${unitId}, ${lessons.length} lessons...`);

        // ─── SUBSCRIPTION GATE ───────────────────────────────────────
        // Only Standard and VIP can batch generate (to avoid spam and manage costs)
        const sub = await getUserSubscription(userId);
        if (sub.plan !== 'vip' && sub.plan !== 'standard') {
            return res.status(403).json({
                success: false,
                subscriptionError: true,
                message: 'Batch generation is a premium feature. Please upgrade to Standard or VIP plan to use it.'
            });
        }

        const access = await checkAndIncrementUsage(userId, lessons.length);
        if (!access.allowed) {
            return res.status(403).json({
                success: false,
                subscriptionError: true,
                message: access.message
            });
        }
        // ─────────────────────────────────────────────────────────────

        const results = [];
        let successCount = 0;

        // Fetch Syllabus for the whole unit once to avoid repeated DB calls
        // Try FK-based match first (subject_id), then fall back to name match
        let syllabusContent = null;
        if (lessons.length > 0) {
            const subjectId = lessons[0].subject_id;
            const subjectName = lessons[0].subject_name;

            const [syllabusesById] = await pool.query(
                'SELECT content_text FROM syllabuses WHERE subject_id = ? LIMIT 1',
                [subjectId]
            );
            if (syllabusesById.length > 0) {
                syllabusContent = syllabusesById[0].content_text;
            } else {
                const [syllabuses] = await pool.query(
                    'SELECT content_text FROM syllabuses WHERE subject_name = ? LIMIT 1',
                    [subjectName]
                );
                syllabusContent = syllabuses.length > 0 ? syllabuses[0].content_text : null;
            }
        }

        // Process sequentially to be nice to API limits
        for (const lesson of lessons) {
            try {
                // Get special needs
                const [specialNeeds] = await pool.query(
                    'SELECT * FROM special_needs_learners WHERE lesson_id = ?',
                    [lesson.id]
                );

                // Get reference materials
                const [refMaterials] = await pool.query(
                    `SELECT rm.* FROM reference_materials rm
                     JOIN lesson_materials lm ON rm.id = lm.material_id
                     WHERE lm.lesson_id = ?`,
                    [lesson.id]
                );

                // Extract text from reference materials (supports Cloudinary URLs)
                await Promise.all(refMaterials.map(async (mat) => {
                    if (mat.extracted_text) return;
                    const text = await ensureExtractedText(mat).catch(() => '');
                    if (text) mat.extracted_text = text;
                }));

                const lessonDataForAI = {
                    subject: { 
                        name: lesson.subject_name,
                        code: lesson.subject_code // Added code if available
                    },
                    unit: { 
                        unit_number: lesson.unit_number, 
                        unit_title: lesson.unit_title, 
                        key_competences: lesson.key_competences 
                    },
                    lesson: { 
                        lesson_number: lesson.lesson_number, 
                        lesson_title: lesson.lesson_title,
                        class_name: lesson.class_name,
                        learning_materials: lesson.learning_materials,
                        school_name: lesson.school_name,
                        teacher_name: lesson.teacher_name,
                        class_size: lesson.class_size
                    },
                    duration: lesson.duration || 40,
                    specialNeeds: specialNeeds,
                    referenceMaterials: refMaterials,
                    syllabusContent: syllabusContent
                };


                const aiResponse = await aiService.generateLessonPlan(lessonDataForAI, provider);

                // Save to DB
                let finalContent = aiResponse.content;
                try {
                    // Try to parse and re-stringify to ensure it's valid JSON and inject data
                    const planData = JSON.parse(aiResponse.content);
                    if (!planData.header_details) planData.header_details = {};
                    
                    // Force data from database
                    planData.header_details.school_name = lesson.school_name;
                    planData.header_details.teacher_name = lesson.teacher_name;
                    planData.header_details.class_size = lesson.class_size;
                    
                    finalContent = JSON.stringify(planData);
                } catch (e) {
                    console.error("Batch AI result parse error:", e.message);
                }

                const [insertResult] = await pool.query(
                    'INSERT INTO lesson_plans (lesson_id, content, generated_by_ai, ai_provider) VALUES (?, ?, ?, ?)',
                    [lesson.id, finalContent, 1, aiResponse.provider]
                );

                // Prune old versions for this lesson (Keep ONLY the new one)
                await pool.query(
                    'DELETE FROM ai_generation_logs WHERE lesson_plan_id IN (SELECT id FROM lesson_plans WHERE lesson_id = ? AND id != ?)',
                    [lesson.id, insertResult.insertId]
                );
                await pool.query(
                    'DELETE FROM lesson_plans WHERE lesson_id = ? AND id != ?',
                    [lesson.id, insertResult.insertId]
                );

                results.push({ lessonId: lesson.id, success: true, planId: insertResult.insertId });
                successCount++;

                // Small delay
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (err) {
                console.error(`[Batch] Failed for lesson ${lesson.id}:`, err.message);
                results.push({ lessonId: lesson.id, success: false, error: err.message });
            }
        }

        res.json({
            success: true,
            message: `Batch generation completed: ${successCount}/${lessons.length} successful.`,
            data: results
        });

    } catch (error) {
        next(error);
    } finally {
        activeBatches.delete(userId);
    }
};

// Get recent lesson plans for the teacher
exports.getRecentLessonPlans = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 5;

        const [plans] = await pool.query(
            `SELECT lp.id, lp.created_at, l.lesson_title, l.teaching_date, 
                    s.name as subject_name, c.name as class_name
             FROM lesson_plans lp
             JOIN lessons l ON lp.lesson_id = l.id
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             WHERE c.teacher_id = ?
             ORDER BY lp.created_at DESC
             LIMIT ?`,
            [userId, limit]
        );

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        next(error);
    }
};

// Get all lesson plans for the teacher
exports.getAllLessonPlans = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [plans] = await pool.query(
            `SELECT lp.id, lp.created_at, lp.lesson_id, l.lesson_title, l.teaching_date, l.duration, l.lesson_number,
                    s.name as subject_name, c.name as class_name, u.unit_number
             FROM lesson_plans lp
             JOIN lessons l ON lp.lesson_id = l.id
             JOIN units u ON l.unit_id = u.id
             JOIN class_subjects cs ON u.class_subject_id = cs.id
             JOIN subjects s ON cs.subject_id = s.id
             JOIN classes c ON cs.class_id = c.id
             WHERE c.teacher_id = ?
             ORDER BY lp.created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        next(error);
    }
};
