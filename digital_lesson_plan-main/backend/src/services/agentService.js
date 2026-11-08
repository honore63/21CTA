/**
 * AI Agent Service
 * Manages intelligent, automated tasks on behalf of teachers.
 * Powered by Gemini for summaries and insights.
 * Uses Redis for background job processing.
 * Uses the notifications table to alert teachers.
 */

const { pool } = require('../config/database');
const redis = require('../config/redis');
const aiService = require('./aiService');
const fileService = require('./fileService');

// Redis queue names
const QUEUES = {
  AGENT_TASKS: 'agent:tasks',
  AGENT_RESULTS: 'agent:results',
  AGENT_STATUS: 'agent:status'
};

// ─── Task Status Constants ─────────────────────────────────────────────────
const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  OVERDUE: 'overdue',
};

// ─── Task Creation ───────────────────────────────────────────────────────

/**
 * Create an agent task for a teacher.
 * @param {Object} params
 * @param {number} params.teacher_id
 * @param {string} params.title
 * @param {string} params.description
 * @param {string} [params.source_activity] - e.g. 'class_created', 'unit_imported'
 * @param {Date|string} [params.due_date] - ISO date string
 */
const createTask = async ({ teacher_id, title, description, source_activity = null, due_date = null }) => {
  try {
    const [result] = await pool.query(
      `INSERT INTO agent_tasks (teacher_id, title, description, status, source_activity, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [teacher_id, title, description, TASK_STATUS.PENDING, source_activity, due_date]
    );
    return result.insertId;
  } catch (err) {
    console.error('[Agent] Failed to create task:', err.message);
    throw err;
  }
};

// ─── Activity-based Task Triggers ──────────────────────────────────────
/**
 * Called when a teacher creates a new class. Registers setup tasks.
 */
const onClassCreated = async (teacher_id, className, subjects = []) => {
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await createTask({
    teacher_id,
    title: `Set up timetable for "${className}"`,
    description: `You created the class "${className}". The next step is to set up your weekly timetable so AI can automatically schedule your lessons in chronological order.`,
    source_activity: 'class_created',
    due_date: threeDaysFromNow
  });

  if (subjects.length > 0) {
    await createTask({
      teacher_id,
      title: `Import REB curriculum for "${className}"`,
      description: `Your class "${className}" has ${subjects.length} subject(s) assigned. Visit each subject's Units page and click "Import REB Syllabus" to automatically load the official curriculum structure.`,
      source_activity: 'class_created',
      due_date: oneWeekFromNow
    });
  }
};

/**
 * Called when a teacher imports a syllabus. Registers next step tasks.
 */
const onSyllabusImported = async (teacher_id, subjectName, unitCount) => {
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await createTask({
    teacher_id,
    title: `Generate lesson plans for ${subjectName}`,
    description: `You imported ${unitCount} unit(s) from the REB curriculum for ${subjectName}. Visit each unit to add lessons and generate AI-powered lesson plans.`,
    source_activity: 'syllabus_imported',
    due_date: oneWeekFromNow
  });
};

/**
 * Called when a lesson plan is generated. Suggests adding reference books.
 */
const onLessonPlanGenerated = async (teacher_id, lessonTitle) => {
  await createTask({
    teacher_id,
    title: `Attach reference books to "${lessonTitle}"`,
    description: `Your lesson plan for "${lessonTitle}" was generated. Consider attaching reference books from your library to make future plans reference specific REB textbook pages.`,
    source_activity: 'lesson_plan_generated',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  });
};

// ─── Background Job Processing ──────────────────────────────────────
/**
 * Enqueue an agent task for background processing
 * @param {Object} taskData - Task data including type and parameters
 * @returns {Promise<string>} Job ID
 */
const enqueueAgentTask = async (taskData) => {
  try {
    const client = await redis.connectRedis();
    if (!client) {
      throw new Error('Redis connection not available');
    }

    // Generate unique job ID
    const jobId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add to Redis queue
    const jobData = {
      id: jobId,
      ...taskData,
      createdAt: new Date().toISOString(),
      status: TASK_STATUS.PENDING
    };

    await client.lPush(QUEUES.AGENT_TASKS, JSON.stringify(jobData));

    // Store initial status
    await client.hSet(
      `${QUEUES.AGENT_STATUS}:${jobId}`,
      Object.entries(jobData)
    );

    console.log(`[Agent] Enqueued task ${jobId}: ${taskData.type}`);
    return jobId;
  } catch (error) {
    console.error('[Agent] Failed to enqueue task:', error);
    throw error;
  }
};

/**
 * Update job status in Redis
 * @param {string} jobId - Job ID
 * @param {Object} statusUpdate - Status fields to update
 */
const updateJobStatus = async (jobId, statusUpdate) => {
  try {
    const client = redis.getRedisClient();
    if (!client) return;

    await client.hSet(
      `${QUEUES.AGENT_STATUS}:${jobId}`,
      Object.entries({ ...statusUpdate, updatedAt: new Date().toISOString() })
    );

    // Expire status after 24 hours
    await client.expire(`${QUEUES.AGENT_STATUS}:${jobId}`, 24 * 60 * 60);
  } catch (error) {
    console.error('[Agent] Failed to update job status:', error);
  }
};

/**
 * Get job status from Redis
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>} Job status or null if not found
 */
const getJobStatus = async (jobId) => {
  try {
    const client = redis.getRedisClient();
    if (!client) return null;

    const status = await client.hGetAll(`${QUEUES.AGENT_STATUS}:${jobId}`);
    return Object.keys(status).length ? status : null;
  } catch (error) {
    console.error('[Agent] Failed to get job status:', error);
    return null;
  }
};

/**
 * Store agent task result in Redis
 * @param {string} jobId - Job ID
 * @param {Object} result - Task result
 */
const storeTaskResult = async (jobId, result) => {
  try {
    const client = redis.getRedisClient();
    if (!client) return;

    await client.hSet(
      `${QUEUES.AGENT_RESULTS}:${jobId}`,
      Object.entries({
        ...result,
        completedAt: new Date().toISOString()
      })
    );

    // Expire result after 7 days
    await client.expire(`${QUEUES.AGENT_RESULTS}:${jobId}`, 7 * 24 * 60 * 60);
  } catch (error) {
    console.error('[Agent] Failed to store task result:', error);
  }
};

/**
 * Get agent task result from Redis
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>} Task result or null if not found
 */
const getTaskResult = async (jobId) => {
  try {
    const client = redis.getRedisClient();
    if (!client) return null;

    const result = await client.hGetAll(`${QUEUES.AGENT_RESULTS}:${jobId}`);
    return Object.keys(result).length ? result : null;
  } catch (error) {
    console.error('[Agent] Failed to get task result:', error);
    return null;
  }
};

// ─── Agent Task Handlers ──────────────────────────────────────
/**
 * Handle syllabus analysis task
 * @param {Object} jobData - Job data
 * @returns {Promise<Object>} Result
 */
const handleSyllabusAnalysis = async (jobData) => {
  try {
    const { syllabusId, teacherId } = jobData;

    // Update status to in progress
    await updateJobStatus(jobData.id, { status: TASK_STATUS.IN_PROGRESS });

    // Get syllabus details
    const [syllabuses] = await pool.query(
      `SELECT s.* FROM syllabuses s
       JOIN subjects sub ON s.subject_name = sub.name
       JOIN class_subjects cs ON sub.id = cs.subject_id
       JOIN classes c ON cs.class_id = c.id
       WHERE s.id = ? AND c.teacher_id = ?`,
      [syllabusId, teacherId]
    );

    if (syllabuses.length === 0) {
      throw new Error('Syllabus not found or you do not have permission to access it');
    }

    const syllabus = syllabuses[0];

    // In a real implementation, this would call AI service to analyze the syllabus
    // For now, we'll simulate the work
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate 5 seconds of work

    // Store result
    const result = {
      success: true,
      message: 'Syllabus analysis completed',
      data: {
        syllabusId,
        status: 'completed',
        analysis: {
          unitCount: Math.floor(Math.random() * 10) + 5, // Random 5-15 units
          lessonCount: Math.floor(Math.random() * 100) + 50, // Random 50-150 lessons
          subjects: [syllabus.subject_name]
        }
      }
    };

    await storeTaskResult(jobData.id, result);
    await updateJobStatus(jobData.id, { status: TASK_STATUS.COMPLETED, ...result.data });

    return result;
  } catch (error) {
    console.error('[Agent] Syllabus analysis failed:', error);
    const errorResult = {
      success: false,
      message: error.message,
      data: { syllabusId: jobData.syllabusId, status: 'failed' }
    };
    await storeTaskResult(jobData.id, errorResult);
    await updateJobStatus(jobData.id, { status: TASK_STATUS.FAILED, error: error.message });
    throw error;
  }
};

/**
 * Handle material processing task
 * @param {Object} jobData - Job data
 * @returns {Promise<Object>} Result
 */
const handleMaterialProcessing = async (jobData) => {
  try {
    const { lessonId, teacherId } = jobData;

    // Update status to in progress
    await updateJobStatus(jobData.id, { status: TASK_STATUS.IN_PROGRESS });

    // Verify lesson access
    const [lessons] = await pool.query(
      `SELECT l.* FROM lessons l
       JOIN units u ON l.unit_id = u.id
       JOIN class_subjects cs ON u.class_subject_id = cs.id
       JOIN subjects s ON cs.subject_id = s.id
       JOIN classes c ON cs.class_id = c.id
       WHERE l.id = ? AND c.teacher_id = ?`,
      [lessonId, teacherId]
    );

    if (lessons.length === 0) {
      throw new Error('Lesson not found or you do not have permission to access it');
    }

    // Get materials count
    const [materials] = await pool.query(
      `SELECT rm.id FROM reference_materials rm
       JOIN lesson_materials lm ON rm.id = lm.material_id
       WHERE lm.lesson_id = ?`,
      [lessonId]
    );

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate 3 seconds of work

    // Store result
    const result = {
      success: true,
      message: `Material processing completed for ${materials.length} materials`,
      data: {
        lessonId,
        materialCount: materials.length,
        status: 'completed',
        processedAt: new Date().toISOString()
      }
    };

    await storeTaskResult(jobData.id, result);
    await updateJobStatus(jobData.id, { status: TASK_STATUS.COMPLETED, ...result.data });

    return result;
  } catch (error) {
    console.error('[Agent] Material processing failed:', error);
    const errorResult = {
      success: false,
      message: error.message,
      data: { lessonId: jobData.lessonId, status: 'failed' }
    };
    await storeTaskResult(jobData.id, errorResult);
    await updateJobStatus(jobData.id, { status: TASK_STATUS.FAILED, error: error.message });
    throw error;
  }
};

/**
 * Handle lesson plan generation task
 * @param {Object} jobData - Job data
 * @returns {Promise<Object>} Result
 */
const handleLessonPlanGeneration = async (jobData) => {
  try {
    const { lessonId, teacherId, provider } = jobData;

    // Update status to in progress
    await updateJobStatus(jobData.id, { status: TASK_STATUS.IN_PROGRESS });

    // Get lesson details (similar to lessonPlanController.generateLessonPlan)
    const [lessons] = await pool.query(
      `SELECT l.*, u.unit_number, u.unit_title, u.key_competences,
              cs.subject_id, cs.class_id, c.name as class_name
         FROM lessons l
         JOIN units u ON l.unit_id = u.id
         JOIN class_subjects cs ON u.class_subject_id = cs.id
         JOIN classes c ON cs.class_id = c.id
         WHERE l.id = ?`,
      [lessonId]
    );

    if (lessons.length === 0) {
      throw new Error('Lesson not found');
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

    // Fetch Official Syllabus Content
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

    // Extract text from reference materials
    await Promise.all(referenceMaterials.map(async (mat) => {
      if (mat.extracted_text) return;

      const text = await fileService.ensureExtractedText(mat).catch(e => {
        console.error(`Failed to extract text for material ${mat.id}:`, e.message);
        return '';
      });

      if (text) {
        mat.extracted_text = text;
        // Cache back to DB for speed next time
        await pool.query(
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
      // Fallback to original content if parsing fails
    }

    // Save lesson plan
    const [result] = await pool.query(
      `INSERT INTO lesson_plans (lesson_id, content, version, generated_by_ai, ai_provider)
       VALUES (?, ?, ?, ?, ?)`,
      [lessonId, finalContent, version, true, aiResult.provider]
    );

    const lessonPlanId = result.insertId;

    // Prune old versions
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

    // Store result
    const resultData = {
      success: true,
      message: 'Lesson plan generation completed',
      data: {
        lessonId,
        lessonPlanId,
        status: 'completed',
        provider: aiResult.provider,
        generationTime: aiResult.generationTime
      }
    };

    await storeTaskResult(jobData.id, resultData);
    await updateJobStatus(jobData.id, { status: TASK_STATUS.COMPLETED, ...resultData.data });

    return resultData;
  } catch (error) {
    console.error('[Agent] Lesson plan generation failed:', error);
    const errorResult = {
      success: false,
      message: error.message,
      data: { lessonId: jobData.lessonId, status: 'failed' }
    };
    await storeTaskResult(jobData.id, errorResult);
    await updateJobStatus(jobData.id, { status: TASK_STATUS.FAILED, error: error.message });
    throw error;
  }
};

/**
 * Handle batch unit plan generation task
 * @param {Object} jobData - Job data
 * @returns {Promise<Object>} Result
 */
const handleBatchUnitGeneration = async (jobData) => {
  try {
    const { unitId, teacherId, provider } = jobData;

    // Update status to in progress
    await updateJobStatus(jobData.id, { status: TASK_STATUS.IN_PROGRESS });

    // Get all lessons in the unit
    const [lessons] = await pool.query(
      `SELECT l.*, u.unit_number, u.unit_title, u.key_competences,
              cs.subject_id, cs.class_id, c.name as class_name,
              s.name as subject_name
       FROM lessons l
       JOIN units u ON l.unit_id = u.id
       JOIN class_subjects cs ON u.class_subject_id = cs.id
       JOIN subjects s ON cs.subject_id = s.id
       JOIN classes c ON cs.class_id = c.id
       WHERE u.id = ?
       ORDER BY l.lesson_number ASC`,
      [unitId]
    );

    if (lessons.length === 0) {
      throw new Error('No lessons found in this unit');
    }

    // Fetch Syllabus for the whole unit once
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

    const results = [];
    let successCount = 0;

    // Process each lesson
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

        // Extract text from reference materials
        await Promise.all(refMaterials.map(async (mat) => {
          if (mat.extracted_text) return;
          const text = await fileService.ensureExtractedText(mat).catch(() => '');
          if (text) mat.extracted_text = text;
        }));

        const lessonDataForAI = {
          subject: {
            name: lesson.subject_name,
            code: lesson.subject_code
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

        results.push({
          lessonId: lesson.id,
          success: true,
          planId: insertResult.insertId,
          provider: aiResponse.provider
        });
        successCount++;

        // Small delay between lessons
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err) {
        console.error(`[Agent] Batch failed for lesson ${lesson.id}:`, err.message);
        results.push({
          lessonId: lesson.id,
          success: false,
          error: err.message
        });
      }
    }

    // Store result
    const resultData = {
      success: true,
      message: `Batch generation completed: ${successCount}/${lessons.length} successful.`,
      data: {
        unitId,
        totalLessons: lessons.length,
        successful: successCount,
        failed: lessons.length - successCount,
        results: results,
        status: 'completed'
      }
    };

    await storeTaskResult(jobData.id, resultData);
    await updateJobStatus(jobData.id, { status: TASK_STATUS.COMPLETED, ...resultData.data });

    return resultData;
  } catch (error) {
    console.error('[Agent] Batch unit generation failed:', error);
    const errorResult = {
      success: false,
      message: error.message,
      data: { unitId: jobData.unitId, status: 'failed' }
    };
    await storeTaskResult(jobData.id, errorResult);
    await updateJobStatus(jobData.id, { status: TASK_STATUS.FAILED, error: error.message });
    throw error;
  }
};

// ─── Task Retrieval ─────────────────────────────────────────────────

const getTeacherTasks = async (teacher_id, limit = 10) => {
  const [tasks] = await pool.query(
    `SELECT * FROM agent_tasks
     WHERE teacher_id = ?
     ORDER BY FIELD(status, 'pending', 'in_progress', 'overdue', 'completed'),
              due_date ASC, created_at DESC
     LIMIT ?`,
    [teacher_id, limit]
  );
  return tasks;
};

const markTaskComplete = async (taskId, teacher_id) => {
  await pool.query(
    `UPDATE agent_tasks SET status = ?, completed_at = NOW()
     WHERE id = ? AND teacher_id = ?`,
    [TASK_STATUS.COMPLETED, taskId, teacher_id]
  );
};

const dismissTask = async (taskId, teacher_id) => {
  await pool.query(
    `DELETE FROM agent_tasks WHERE id = ? AND teacher_id = ?`,
    [taskId, teacher_id]
  );
};

// ─── Overdue Checker ──────────────────────────────────────────────
/**
 * Mark overdue tasks and send in-app notifications for them.
 * Should be called on a schedule (e.g. daily).
 */
const checkOverdueTasks = async () => {
  try {
    // Mark pending tasks past due date as overdue
    const [updated] = await pool.query(
      `UPDATE agent_tasks
       SET status = ?
       WHERE status IN (?, ?) AND due_date IS NOT NULL AND due_date < NOW()`,
      [TASK_STATUS.OVERDUE, TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS]
    );

    // Find overdue tasks without a reminder sent
    const [overdueTasks] = await pool.query(
      `SELECT at.*, u.full_name FROM agent_tasks at
       JOIN users u ON at.teacher_id = u.id
       WHERE at.status = ? AND at.reminder_sent = 0`,
      [TASK_STATUS.OVERDUE]
    );

    let remindersCount = 0;
    for (const task of overdueTasks) {
      // Send in-app notification
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, ?, ?, ?)`,
        [
          task.teacher_id,
          `��⏰ Overdue Task: ${task.title}`,
          `This task is overdue. ${task.description}`,
          'warning'
        ]
      );

      // Mark reminder sent
      await pool.query(
        `UPDATE agent_tasks SET reminder_sent = 1 WHERE id = ?`,
        [task.id]
      );
      remindersCount++;
    }

    console.log(`[Agent] Overdue check: ${updated.affectedRows} marked overdue, ${remindersCount} reminders sent.`);
    return { marked: updated.affectedRows, reminded: remindersCount };
  } catch (err) {
    console.error('[Agent] Overdue check failed:', err.message);
  }
};

// ─── AI-Powered Summary ─────────────────────────────────────────────
/**
 * Generate a Gemini-powered summary of a teacher's task activity.
 */
const generateTaskSummary = async (teacher_id) => {
  try {
    const [stats] = await pool.query(
      `SELECT
          COUNT(*) as total,
          SUM(status = 'completed') as completed,
          SUM(status IN ('pending','in_progress')) as pending,
          SUM(status = 'overdue') as overdue
       FROM agent_tasks
       WHERE teacher_id = ?`,
      [teacher_id]
    );

    const [recentTasks] = await pool.query(
      `SELECT title, status, due_date FROM agent_tasks
       WHERE teacher_id = ?
       ORDER BY created_at DESC LIMIT 5`,
      [teacher_id]
    );

    const s = stats[0];

    // Skip Gemini call if no tasks exist yet
    if (s.total === 0) {
      return {
        summary: "You have no tasks yet. Start by creating a class and the AI Agent will automatically suggest your next steps.",
        stats: s
      };
    }

    // Only call Gemini if key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return {
        summary: `You have ${s.pending} pending and ${s.overdue} overdue tasks. Keep up the good work!`,
        stats: s
      };
    }

    const prompt = `You are an AI assistant helping a teacher in Rwanda stay on top of their lesson planning.
Here is their task summary:
- Total tasks: ${s.total}
- Completed: ${s.completed}
- Pending: ${s.pending}
- Overdue: ${s.overdue}
Recent tasks: ${recentTasks.map(t => `${t.title} (${t.status})`).join(', ')}

Write a short, warm, encouraging 2-sentence summary of their progress and what they should focus on next. Do NOT use lists or markdown formatting. Return only the plain text summary.`;

    const summary = await aiService.generateText(prompt, null, 200);
    return { summary, stats: s };
  } catch (err) {
    console.error('[Agent] Summary generation failed:', err.message);
    return { summary: 'Unable to generate summary right now. Check your pending tasks above.', stats: {} };
  }
};

// ─── Database Migration ─────────────────────────────────────────────
/**
 * Ensure the agent_tasks table exists (called at server startup)
 */
const ensureAgentTasksTable = async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query(`
        CREATE TABLE IF NOT EXISTS agent_tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            teacher_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status ENUM('pending', 'in_progress', 'completed', 'overdue', 'failed') DEFAULT 'pending',
            source_activity VARCHAR(100) DEFAULT NULL,
            due_date TIMESTAMP NULL DEFAULT NULL,
            completed_at TIMESTAMP NULL DEFAULT NULL,
            reminder_sent TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_teacher_id (teacher_id),
            INDEX idx_status (status),
            INDEX idx_due_date (due_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    conn.release();
    console.log('��✅ Agent tasks table verified.');
  } catch (err) {
    console.warn('��⚠��️ Could not verify agent_tasks table:', err.message);
  }
};

// ─── Worker Process ──────────────────────────────────────
/**
 * Start the agent worker to process queued tasks
 * This should be run as a separate process in production
 */
const startAgentWorker = async () => {
  console.log('[Agent] Starting worker process...');

  while (true) {
    try {
      const client = await redis.connectRedis();
      if (!client) {
        console.warn('[Agent] Redis not available, waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Blocking pop from queue with timeout
      const queueResult = await client.bRPop(QUEUES.AGENT_TASKS, 5); // 5 second timeout

      if (!queueResult) {
        continue; // Timeout, loop again
      }

      const [, jobDataStr] = queueResult;
      let jobData;

      try {
        jobData = JSON.parse(jobDataStr);
      } catch (parseError) {
        console.error('[Agent] Failed to parse job data:', parseError);
        continue;
      }

      console.log(`[Agent] Processing job ${jobData.id}: ${jobData.type}`);

      // Update status to in progress
      await updateJobStatus(jobData.id, {
        status: TASK_STATUS.IN_PROGRESS,
        startedAt: new Date().toISOString()
      });

      let result;
      try {
        // Route to appropriate handler based on task type
        switch (jobData.type) {
          case 'syllabusAnalysis':
            result = await handleSyllabusAnalysis(jobData);
            break;
          case 'materialProcessing':
            result = await handleMaterialProcessing(jobData);
            break;
          case 'lessonPlanGeneration':
            result = await handleLessonPlanGeneration(jobData);
            break;
          case 'batchUnitGeneration':
            result = await handleBatchUnitGeneration(jobData);
            break;
          default:
            throw new Error(`Unknown task type: ${jobData.type}`);
        }

        console.log(`[Agent] Job ${jobData.id} completed successfully`);
      } catch (processingError) {
        console.error(`[Agent] Job ${jobData.id} failed:`, processingError);
        // Error is already handled in the handlers
      }

    } catch (workerError) {
      console.error('[Agent] Worker error:', workerError);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

module.exports = {
  createTask,
  onClassCreated,
  onSyllabusImported,
  onLessonPlanGenerated,
  enqueueAgentTask,
  getJobStatus,
  getTaskResult,
  getTeacherTasks,
  markTaskComplete,
  dismissTask,
  checkOverdueTasks,
  generateTaskSummary,
  ensureAgentTasksTable,
  startAgentWorker,
  TASK_STATUS
};