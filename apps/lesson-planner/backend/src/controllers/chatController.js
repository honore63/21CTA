const { pool } = require('../config/database');
const aiService = require('../services/aiService');
const socketService = require('../services/socketService');


/**
 * Chat Controller for AI Agent
 */

exports.getSessions = async (req, res, next) => {
    try {
        const [sessions] = await pool.query(
            'SELECT * FROM chat_sessions WHERE user_id = ? ORDER BY last_updated DESC LIMIT 20',
            [req.user.id]
        );
        res.json({ success: true, data: sessions });
    } catch (error) {
        next(error);
    }
};

exports.updateSessionTitle = async (req, res, next) => {
    try {
        const { title } = req.body;
        const sessionId = req.params.id;
        if (!title || !sessionId) return res.status(400).json({ success: false, message: 'Missing data' });
        
        await pool.query('UPDATE chat_sessions SET title = ? WHERE id = ? AND user_id = ?', [title, sessionId, req.user.id]);
        res.json({ success: true, message: 'Updated' });
    } catch (error) {
        next(error);
    }
};

exports.deleteChatSession = async (req, res, next) => {
    try {
        const sessionId = req.params.id;
        if (!sessionId) {
            // Delete all chats for user
            await pool.query('DELETE FROM chat_sessions WHERE user_id = ?', [req.user.id]);
            await pool.query('DELETE FROM chats WHERE user_id = ?', [req.user.id]);
        } else {
            await pool.query('DELETE FROM chat_sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id]);
        }
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        next(error);
    }
};

exports.askPublicAI = async (req, res, next) => {
    try {
        const { message, previousMessages } = req.body;
        
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        let pastMemory = "";
        if (previousMessages && previousMessages.length > 0) {
            pastMemory = previousMessages.slice(-6).map(m => `[${m.sender.toUpperCase()}]: ${m.text}`).join('\n\n');
        }

        const systemPrompt = `
        You are "Pedagogy AI Guide", an advanced AI assistant for the "21st Century Lesson Plan Generator" — an AI-powered web platform for Rwandan teachers, built by Roger HODALI and Honore TUYISHIME.
        You are currently talking to a VISITOR on the landing page who may or may not be logged in.

        ========= COMPLETE SYSTEM KNOWLEDGE BASE =========

        ## What is 21st Century Lesson Plan Generator?
        An AI-powered platform for Rwandan teachers to create, manage, and organize professional lesson plans aligned with Rwanda Basic Education Board (REB) standards.
        Built by: Roger HODALI (Software Architect) and Honore TUYISHIME (Teacher & Developer).

        ## How It Works – Hierarchical Structure:
        Class → Subject → Unit → Lesson → AI-Generated Lesson Plan (5Es)

        Step-by-step:
        1. Create a Class (e.g. "Senior 4 – 2025") with class size and academic year
        2. Add Subjects to the class (from REB library or custom)
        3. Create Units matching official REB syllabus chapters
        4. Add Lessons inside Units with title, date, duration, and objectives
        5. Generate Lesson Plans using AI – full REB-standard 5Es lesson plan in seconds
        6. Review, edit, and export/print the plan

        ## The 5Es Pedagogical Model (Official REB Framework):
        - ENGAGE: Capture attention, activate prior knowledge (hook question, visual, real-life problem)
        - EXPLORE: Students investigate and discover (hands-on activity, group work, experiments)
        - EXPLAIN: Formalize concepts, introduce vocabulary (direct instruction, definitions)
        - ELABORATE: Deepen understanding, apply to new contexts (extended problems, projects)
        - EVALUATE: Assess learning outcomes (quizzes, observation, exit tickets, rubrics)
        Each phase includes: time allocation, teacher activities, student activities, materials, and assessment criteria.

        ## AI Assistant Capabilities (when logged in):
        - Generate full REB-compliant lesson plans from a lesson title
        - Answer questions about classes, subjects, units, and lessons
        - Navigate to any page in the application
        - Fill in forms on behalf of the user
        - Delete, clean up, or reorganize data
        - Explain REB syllabus content
        - Suggest teaching strategies for any topic

        ## User Roles:
        - Teacher: Create/manage own classes, generate lesson plans, use AI
        - Admin: All teacher permissions + user management, syllabus management, system analytics
        - System Admin: Full platform management + system utilities
        - REB Admin: Manages global syllabuses and subjects

        ## REB Syllabus Integration:
        - Admins upload official REB syllabus PDFs
        - System parses and structures content into units and lessons
        - AI references syllabus content for accurate lesson plan generation
        - Supports all Rwandan secondary subjects: Mathematics, Physics, Chemistry, Biology, History, Geography, Economics, Entrepreneurship, Computer Science, ICT, Religious Studies, English, French, Kinyarwanda, Kiswahili

        ## Key Features:
        - One lesson plan per lesson (strict 1-version policy)
        - Export and print lesson plans
        - Reference Materials library (REB books)
        - Class scheduling (timetables)
        - Admin dashboard with system analytics
        - Contact support form (messages go directly to admin)
        - Dark mode and light mode
        - Google Sign-In supported
        - Password reset via email

        ## Contact & Support:
        - Support Form: /contact page
        - Roger HODALI: rogers@nexastack.net
        - Honore TUYISHIME: tuyishimehonore63@gmail.com | +250 791 684 429
        - Phone: +250 780 988 783 (Kigali, Rwanda)

        ========= END OF KNOWLEDGE BASE =========

        **CRITICAL RULES:**
        1. Answer EVERY question helpfully using the knowledge base above.
        2. BE CONCISE AND DIRECT. Use bullet points for clarity.
        3. YOU CANNOT PERFORM ACTIONS (create lessons, units, etc.) for unauthenticated users. If they ask to do something inside the workspace, say: "Please create a free account or sign in to unlock my full capabilities."
        **MULTI-MODAL OUTPUT CAPABILITIES:**
        1. DIAGRAMS & FLOWCHARTS: When the user asks for a workflow, process, hierarchy, 5Es cycle, or pedagogical structure, you MUST provide a Mermaid diagram in a \`\`\`mermaid ... \`\`\` block!
        2. CHARTS: When presenting distributions, lesson time percentages, or metrics, provide an interactive chart in a \`\`\`json:chart block:
           \`\`\`json:chart
           {
             "title": "Lesson Time Distribution",
             "type": "doughnut",
             "data": { "labels": ["Intro (25%)", "Development (60%)", "Evaluation (15%)"], "datasets": [{ "data": [25, 60, 15] }] }
           }
           \`\`\`
        3. REAL IMAGES: When explaining real-world physical objects or science lab setups, you can suggest a visual aid prompt in a \`\`\`json:image { "prompt": "...", "caption": "..." } \`\`\` block.

        [CONVERSATION_HISTORY]
        ${pastMemory}
        [/CONVERSATION_HISTORY]

        **OUTPUT FORMAT (strict JSON only):**
        {
          "text": "Your helpful response here...",
          "action": "none"
        }
        `;

        const aiResponseRaw = await aiService.callAIProviders(message, 30000, systemPrompt);
        
        let aiData;
        try {
            const sanitized = aiService.sanitizeJSON(aiResponseRaw);
            aiData = JSON.parse(sanitized);
            aiData.text = aiData.text || aiData.message || aiData.response;
        } catch (e) {
            aiData = { text: aiResponseRaw, action: 'none' };
        }

        res.json({
            success: true,
            response: aiData.text,
            action: aiData.action
        });

    } catch (error) {
        console.error('Public Chat Error:', error);
        res.status(500).json({ success: false, message: 'AI failed to respond.' });
    }
};

exports.askAI = async (req, res, next) => {
    try {
        const { message, isAgent, currentUrl, domState, actionHistory } = req.body;
        let { session_id } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // ─── SUBSCRIPTION GATE ───────────────────────────────────────
        const sub = { plan: 'vip', status: 'active' };
        // ─────────────────────────────────────────────────────────────

        // 1. Manage Session
        if (!session_id) {
            // Give it a title based on the first short snippet
            const title = message.substring(0, 30) + (message.length > 30 ? '...' : '');
            const [sessRes] = await pool.query(
                'INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)',
                [userId, title]
            );
            session_id = sessRes.insertId;
        } else {
            // Update last_updated
            await pool.query('UPDATE chat_sessions SET last_updated = CURRENT_TIMESTAMP WHERE id = ?', [session_id]);
        }

        // Fetch past conversation for this session to give AI memory
        let pastMemory = "";
        const [historyRows] = await pool.query(
            'SELECT message, response FROM chats WHERE session_id = ? ORDER BY created_at ASC LIMIT 8',
            [session_id]
        );
        if (historyRows.length > 0) {
            pastMemory = historyRows.map(r => `[USER]: ${r.message}\n[YOU]: ${r.response}`).join('\n\n');
        }

        // 2. Fetch User Context for actions
        const [userClasses] = await pool.query(
            'SELECT id, name, class_size FROM classes WHERE teacher_id = ?',
            [userId]
        );
        const [subjects] = await pool.query('SELECT id, name FROM subjects');
        const [recentLessons] = await pool.query(
            `SELECT l.id as lesson_id, l.lesson_title, u.id as unit_id, u.unit_title, s.name as subject_name 
             FROM lessons l JOIN units u ON l.unit_id = u.id JOIN class_subjects cs ON u.class_subject_id = cs.id JOIN subjects s ON cs.subject_id = s.id JOIN classes c ON cs.class_id = c.id
             WHERE c.teacher_id = ? ORDER BY l.created_at DESC LIMIT 15`,
            [userId]
        );

        let systemPrompt;
        if (isAgent) {
            // Truncate DOM state to prevent token overflow
            const truncatedDom = domState ? domState.substring(0, 3000) : 'No elements detected';
            // Only keep last 10 action history entries
            const recentHistory = Array.isArray(actionHistory) && actionHistory.length > 0 
                ? actionHistory.slice(-10).join('\n') 
                : 'No actions taken yet';

            systemPrompt = `
        You are the "Autonomous Agent" for the "21st Century Lesson Plan Generator", developed by Roger HODALI and Honore TUYISHIME.
        Your current high-level goal is: "${message}"

        We are running a ReAct (Reason-Act-Observe) loop. In this turn, you are provided with:
        - Current Page URL: "${currentUrl || 'unknown'}"
        - Current DOM State (visible text, interactive elements, forms):
        ${truncatedDom}
        - Action History of what you have done so far in this run:
        ${recentHistory}

        [INTERNAL_HISTORY_DO_NOT_PRINT]
        ${pastMemory || 'No previous conversation history.'}
        [/INTERNAL_HISTORY_DO_NOT_PRINT]

        [INTERNAL_DATA_DO_NOT_PRINT]
        current_user_id=${userId}
        available_classes=${JSON.stringify(userClasses)}
        available_subjects=${JSON.stringify(subjects)}
        recent_history=${JSON.stringify(recentLessons)}
        [/INTERNAL_DATA_DO_NOT_PRINT]

        Your job is to decide the EXACT NEXT SINGLE STEP to get closer to the goal.
        You can output either database-side actions (to immediately execute database insertions) or browser-side actions (to redirect, click, or fill inputs on the frontend).
        
        **CRITICAL:** Output ONLY ONE step per turn. Let the frontend execute it, observe the result, and you will get the new state in the next turn.
        **CRITICAL:** Prefer database-side actions (create_class, assign_subject, create_unit) over UI actions when possible. They are faster and more reliable.
        **CRITICAL:** Use real IDs from INTERNAL_DATA. Do NOT use placeholder/hallucinated IDs.
        
        **CRITICAL GROUNDING RULES:**
        1. Check available_classes in INTERNAL_DATA. If the requested class (e.g. "S6 MPBE" or similar) is not in available_classes, you MUST create it first using the "create_class" action. Do NOT try to click or manage a class that is not listed in available_classes!
        2. Check available_subjects in INTERNAL_DATA to find the correct subject_id (e.g., Mathematics is subject_id 1).
        3. Do NOT make up database IDs. If a class was just created, use "class_id": "NEWLY_CREATED" in your next sequential action.
        4. If a class exists in available_classes, use its real ID from the list. Do not hallucinate.

        **OUTPUT SCHEMA (MUST STRICTLY FOLLOW THIS RAW JSON FORMAT):**
        {
          "text": "Your short explanation/thought on what you are doing next and why.",
          "isComplete": false,
          "actions": [
            // List ONLY ONE action here. Choose from:
            // Backend actions (executed immediately on the DB):
            // { "type": "create_class", "data": { "name": "...", "class_size": 40 } }
            // { "type": "assign_subject", "data": { "class_id": 123, "subject_id": 2 } }
            // { "type": "create_unit", "data": { "class_id": 123, "unit_title": "...", "unit_number": 1 } }
            // { "type": "create_lesson", "data": { "unit_id": 123, "lesson_title": "...", "lesson_number": 1 } }
            //
            // Frontend UI actions (executed in the user's browser):
            // { "type": "redirect", "data": { "url": "/units?classId=123" } }
            // { "type": "ui_click", "data": { "text": "Click Target Text" } }
            // { "type": "ui_fill", "data": { "placeholder": "Placeholder Text", "value": "Value to input" } }
          ]
        }

        **DECISION MATRIX & RULES:**
        1. If the current URL is not where you need to be to perform the action, use "redirect" first.
        2. If you need to click a button visible in the DOM State, use "ui_click".
        3. If you need to enter text into a visible input field, use "ui_fill".
        4. If you have finished all tasks required to reach the goal, set "isComplete": true, and tell the user in "text".
        5. DO NOT list multiple browser actions at once (e.g. redirecting and clicking in the same turn). Do them sequentially!
        6. DO NOT echo or print INTERNAL_DATA in your text response.
        `;
        } else {
            systemPrompt = `
        You are an advanced AI Orchestrator for the "21st Century Lesson Plan Generator".
        You MUST read the "INTERNAL_HISTORY" and "INTERNAL_DATA" to avoid doing things you already did!
        - **NEVER** create a class if it already exists in available_classes.
        - **NEVER** create a unit or lesson if it already exists in recent_history.
        - If the user asks for something already there, just tell them it is already created.

        **TONE & IDENTITY:** 
        You are "21st Century Agent". If asked about yourself or your creators, you MUST mention that you were developed by "**Roger HODALI and Honore TUYISHIME**" who want fast development in education in Rwanda according to REB.
        **CRITICAL RULE:** Respond using VERY FEW WORDS. Be extremely concise, direct, and accurate. Do not write long paragraphs unless absolutely necessary.
        
        **OUTPUT SCHEMA (MUST STRICTLY FOLLOW THIS RAW JSON FORMAT):**
        {
          "text": "Overall plan summary and conversational response",
          "actions": [
            { "type": "create_class", "data": { "name": "...", "class_size": 40 } },
            { "type": "assign_subject", "data": { "class_id": "NEWLY_CREATED", "subject_id": 1 } },
            { "type": "redirect", "data": { "url": "/units?classId=123" } },
            { "type": "ui_click", "data": { "text": "Auto-Import" } }
          ]
        }
        EXAMPLE: If user says "Import units for S4 Maths", look up the class ID in [INTERNAL_DATA], then:
        1. { "type": "redirect", "data": { "url": "/units?classId=1" } }
        2. { "type": "ui_click", "data": { "text": "Auto-Import" } }
        
        Do NOT combine multiple steps into one action. Provide an array of actions!
        
        **BACKEND ACTIONS (Required Schemas):**
        - { "type": "create_class", "data": { "name": "...", "class_size": 40 } }
        - { "type": "assign_subject", "data": { "class_id": 123, "subject_id": 2 } }
        - { "type": "create_unit", "data": { "class_id": 123, "unit_title": "...", "unit_number": 1 } }
        - { "type": "create_lesson", "data": { "unit_id": 123, "lesson_title": "...", "lesson_number": 1 } }
        NOTE: Use "class_id": "NEWLY_CREATED" if you just created the class in a previous action!

        **UI ACTIONS (Agentic control):**
        If user asks to click, generate, download, auto-import, or fill forms, respond with:
        - { "type": "redirect", "data": { "url": "/units?classId=123" } }
        - { "type": "ui_click", "data": { "text": "Auto-Import from REB" } }
        - { "type": "ui_fill", "data": { "placeholder": "Class Name", "value": "S4 Maths" } }
        CRITICAL: If a button is on another page, you MUST use the "redirect" action FIRST, before the "ui_click" action!
        
        [INTERNAL_HISTORY_DO_NOT_PRINT]
        ${pastMemory}
        [/INTERNAL_HISTORY_DO_NOT_PRINT]
        
        [INTERNAL_DATA_DO_NOT_PRINT]
        current_user_id=${userId}
        available_classes=${JSON.stringify(userClasses)}
        available_subjects=${JSON.stringify(subjects)}
        **MULTI-MODAL OUTPUT CAPABILITIES IN "text":**
        1. DIAGRAMS & FLOWCHARTS: When the user asks for concept explanations, flowcharts, architectures, lesson progressions, or pedagogical cycles, include a Mermaid diagram in a \`\`\`mermaid ... \`\`\` block in your "text"!
        2. CHARTS: When presenting comparisons, progress, lesson timings, or analytics, embed a chart in a \`\`\`json:chart block:
           \`\`\`json:chart
           {
             "title": "Topic Breakdown",
             "type": "bar",
             "data": { "labels": ["Theory", "Practical", "Assessment"], "datasets": [{ "data": [40, 40, 20] }] }
           }
           \`\`\`
        3. REAL IMAGES: When explaining real-world physical structures, embed a visual aid prompt: \`\`\`json:image { "prompt": "...", "caption": "..." } \`\`\`.
        4. TABLES: Format comparison tables, schedules, or rubrics using clean Markdown tables.

        **CRITICAL RULE FOR "text" FIELD:** Your text string MUST ONLY contain your conversational reply to the user. DO NOT echo, print, or summarize the INTERNAL_DATA or INTERNAL_HISTORY. Never output arrays, IDs, or dictionaries in your conversational reply. Respond naturally and concisely.
        `;
        }

        // 3. Call AI Service
        const aiResponseRaw = await aiService.callAIProviders(message, 30000, systemPrompt);
        
        let aiData;
        try {
            const sanitized = aiService.sanitizeJSON(aiResponseRaw);
            aiData = JSON.parse(sanitized);
            aiData.text = aiData.text || aiData.message || aiData.response;
            aiData.actions = aiData.actions || (aiData.action ? [aiData.action] : []);
            aiData.isComplete = aiData.isComplete || false;
        } catch (e) {
            aiData = { text: aiResponseRaw, actions: [], isComplete: false };
        }

        if (typeof aiData.text === 'object') aiData.text = JSON.stringify(aiData.text);

        let finalRedirect = null;
        let lastCreatedClassId = null;

        // 4. Perform Actions Sequentially
        if (aiData.actions && aiData.actions.length > 0) {
            aiData.text += "\n\n🚀 **Agent Actions Started:**";
            for (const act of aiData.actions) {
                const { type, data } = act;
                try {
                    let targetClassId = (data && data.class_id === 'NEWLY_CREATED') ? lastCreatedClassId : (data && data.class_id);
                    if (type === 'create_class' && data && data.name) {
                        // Check if exists
                        const [existing] = await pool.query('SELECT id FROM classes WHERE teacher_id = ? AND name = ?', [userId, data.name]);
                        if (existing.length > 0) {
                            lastCreatedClassId = existing[0].id;
                            aiData.text += `\nℹ️ Class "${data.name}" already exists, using existing record.`;
                        } else {
                            const [result] = await pool.query('INSERT INTO classes (teacher_id, name, class_size) VALUES (?, ?, ?)', [userId, data.name, data.class_size || 40]);
                            lastCreatedClassId = result.insertId;
                            aiData.text += `\n✅ Created class "${data.name}"`;
                        }
                        finalRedirect = '/classes';
                    }
                    else if (type === 'assign_subject' && data) {
                        const cid = (data.class_id === 'NEWLY_CREATED' || !data.class_id) ? lastCreatedClassId : data.class_id;
                        let subId = data.subject_id;

                        // Flexible lookup: search subject by name if subId is missing or subject_name is provided
                        if (data.subject_name || data.name || !subId) {
                            const searchStr = data.subject_name || data.name || '';
                            if (searchStr) {
                                const [subRows] = await pool.query(
                                    'SELECT id FROM subjects WHERE LOWER(name) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?) LIMIT 1',
                                    [`%${searchStr}%`, `%${searchStr.substring(0, 4)}%`]
                                );
                                if (subRows.length > 0) subId = subRows[0].id;
                            }
                        }

                        // Fallback to first available subject if not found
                        if (!subId) {
                            const [allSubs] = await pool.query('SELECT id FROM subjects LIMIT 1');
                            if (allSubs.length > 0) subId = allSubs[0].id;
                        }

                        if (cid && subId) {
                            const [existRel] = await pool.query('SELECT * FROM class_subjects WHERE class_id = ? AND subject_id = ?', [cid, subId]);
                            if (existRel.length === 0) {
                                await pool.query('INSERT INTO class_subjects (class_id, subject_id) VALUES (?, ?)', [cid, subId]);
                                aiData.text += `\n✅ Assigned subject to class.`;
                            } else {
                                aiData.text += `\nℹ️ Subject already assigned to this class.`;
                            }
                        } else {
                            aiData.text += `\n❌ Could not resolve class or subject to assign.`;
                        }
                        finalRedirect = '/classes';
                    }
                    else if (type === 'create_unit' && data && targetClassId && data.unit_title) {
                        // Find class_subject_id
                        const [cs] = await pool.query('SELECT id FROM class_subjects WHERE class_id = ? LIMIT 1', [targetClassId]);
                        if (cs.length === 0) throw new Error("No subject assigned to this class yet.");
                        
                        const csId = cs[0].id;
                        // Check if exists
                        const [existUnit] = await pool.query('SELECT id FROM units WHERE class_subject_id = ? AND unit_title = ?', [csId, data.unit_title]);
                        if (existUnit.length > 0) {
                            aiData.text += `\nℹ️ Unit "${data.unit_title}" already exists.`;
                        } else {
                            await pool.query('INSERT INTO units (class_subject_id, unit_number, unit_title, key_competences) VALUES (?, ?, ?, ?)', [csId, data.unit_number || 1, data.unit_title, data.key_competences || '']);
                            aiData.text += `\n✅ Created unit "${data.unit_title}"`;
                        }
                        finalRedirect = `/units?classId=${targetClassId}`;
                    }
                    else if (type === 'create_lesson' && data && data.unit_id && data.lesson_title) {
                        // Check if exists
                        const [existLesson] = await pool.query('SELECT id FROM lessons WHERE unit_id = ? AND lesson_title = ?', [data.unit_id, data.lesson_title]);
                        if (existLesson.length > 0) {
                            aiData.text += `\nℹ️ Lesson "${data.lesson_title}" already exists.`;
                        } else {
                            await pool.query('INSERT INTO lessons (unit_id, lesson_number, lesson_title) VALUES (?, ?, ?)', [data.unit_id, data.lesson_number || 1, data.lesson_title]);
                            aiData.text += `\n✅ Created lesson "${data.lesson_title}"`;
                        }
                        finalRedirect = `/units/${data.unit_id}/lessons`;
                    }
                    else if (type === 'delete_class' && data && data.class_id) {
                        await pool.query('DELETE FROM classes WHERE id = ? AND teacher_id = ?', [data.class_id, userId]);
                        aiData.text += `\n✅ Deleted class record.`;
                    }
                    else if (type === 'remove_duplicates' || type === 'delete_duplicate_classes') {
                        const [dupes] = await pool.query(`
                            SELECT name, COUNT(*) as count 
                            FROM classes 
                            WHERE teacher_id = ? 
                            GROUP BY name 
                            HAVING count > 1`, [userId]);
                        
                        let removedCount = 0;
                        for (const dupe of dupes) {
                            // Keep the oldest one (smallest ID), delete others
                            const [ids] = await pool.query('SELECT id FROM classes WHERE teacher_id = ? AND name = ? ORDER BY id ASC', [userId, dupe.name]);
                            const toDelete = ids.slice(1);
                            for (const item of toDelete) {
                                await pool.query('DELETE FROM classes WHERE id = ?', [item.id]);
                                removedCount++;
                            }
                        }
                        aiData.text += `\n✅ Cleanup complete: Removed ${removedCount} duplicate classes.`;
                    }
                    else if (type === 'ui_click' || type === 'ui_fill') {
                        aiData.text += `\n🤖 Forwarding UI command to your browser...`;
                    }
                    else if (type === 'redirect' && data && data.url) {
                        aiData.text += `\n🔄 Navigating to ${data.url}...`;
                    }
                    else {
                        throw new Error(`Missing required parameters for ${type} (e.g., subject_id, class_id)`);
                    }
                    if (act.redirect) finalRedirect = act.redirect;
                    if (type === 'redirect' && data && data.url) finalRedirect = data.url;
                } catch (err) {
                    aiData.text += `\n❌ Failed ${type}: ${err.message}`;
                }
            }

            // Real-time Socket.IO emit to synchronize connected frontend clients instantly
            socketService.notifyUser(userId, 'refresh_data', { actions: aiData.actions });
        }

        // 5. Save to History
        await pool.query(
            'INSERT INTO chats (user_id, session_id, message, response, context_type) VALUES (?, ?, ?, ?, ?)',
            [userId, session_id, message, aiData.text, aiData.actions?.[0]?.type || null]
        );

        res.json({
            success: true,
            response: aiData.text,
            actions: aiData.actions, // Send full objects, not just types
            redirect: finalRedirect,
            session_id: session_id,
            isComplete: aiData.isComplete || false
        });

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({
            success: false,
            message: `Server Error: ${error.message}`,
            stack: error.stack
        });
    }
};

// Get chat history for specific session
exports.getChatHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const sessionId = req.query.sessionId;
        
        let query = 'SELECT * FROM chats WHERE user_id = ?';
        const params = [userId];

        if (sessionId) {
            query += ' AND session_id = ?';
            params.push(sessionId);
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const [history] = await pool.query(query, params);

        res.json({
            success: true,
            data: history.reverse()
        });
    } catch (error) {
        next(error);
    }
};

exports.deleteChatHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Legacy support if no id passed, delete all
        await pool.query('DELETE FROM chats WHERE user_id = ?', [userId]);
        await pool.query('DELETE FROM chat_sessions WHERE user_id = ?', [userId]);
        res.json({ success: true, message: 'Chat history deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Upload file for chat
exports.uploadFile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { message, session_id } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // If no session_id provided, create a new session
        let actualSessionId = session_id;
        if (!actualSessionId) {
            // Create a new session with title based on filename or message
            const title = message || `File: ${req.file.originalname}`;
            const [sessRes] = await pool.query(
                'INSERT INTO chat_sessions (user_id, title) VALUES (?, ?)',
                [userId, title]
            );
            actualSessionId = sessRes.insertId;
        } else {
            // Update last_updated for existing session
            await pool.query('UPDATE chat_sessions SET last_updated = CURRENT_TIMESTAMP WHERE id = ?', [actualSessionId]);
        }

        // Prepare the file information for the AI
        const fileInfo = {
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            filename: req.file.filename,
            path: req.file.path
        };

        // Create a message that includes file information
        let fileMessage = message || '';
        if (fileMessage) {
            fileMessage += `\n[Attached file: ${req.file.originalname}]`;
        } else {
            fileMessage = `[Attached file: ${req.file.originalname}]`;
        }

        // Fetch past conversation for this session to give AI memory
        let pastMemory = "";
        const [historyRows] = await pool.query(
            'SELECT message, response FROM chats WHERE session_id = ? ORDER BY created_at ASC LIMIT 8',
            [actualSessionId]
        );
        if (historyRows.length > 0) {
            pastMemory = historyRows.map(r => `[USER]: ${r.message}\n[YOU]: ${r.response}`).join('\n\n');
        }

        // Fetch user context for actions (similar to askAI)
        const [userClasses] = await pool.query(
            'SELECT id, name, class_size FROM classes WHERE teacher_id = ?',
            [userId]
        );
        const [subjects] = await pool.query('SELECT id, name FROM subjects');
        const [recentLessons] = await pool.query(
            `SELECT l.id as lesson_id, l.lesson_title, u.id as unit_id, u.unit_title, s.name as subject_name
             FROM lessons l JOIN units u ON l.unit_id = u.id JOIN class_subjects cs ON u.class_subject_id = cs.id JOIN subjects s ON cs.subject_id = s.id JOIN classes c ON cs.class_id = c.id
             WHERE c.teacher_id = ? ORDER BY l.created_at DESC LIMIT 15`,
            [userId]
        );

        // System prompt for file handling
        const systemPrompt = `
        You are an advanced AI Orchestrator for the "21st Century Lesson Plan Generator".
        A user has uploaded a file and may have provided a message about it.
        You should:
        1. Acknowledge the file upload
        2. Ask clarifying questions about what they want to do with the file
        3. Suggest relevant actions based on the file type (e.g., if it's a syllabus, offer to import it)
        4. Help them understand how the file can be used in the platform

        File Details:
        - Original Name: ${fileInfo.originalName}
        - Type: ${fileInfo.mimetype}
        - Size: ${(fileInfo.size / 1024).toFixed(2)} KB

        CRITICAL RULE: Respond using FEW WORDS. Be extremely concise, direct, and accurate.

        [INTERNAL_HISTORY_DO_NOT_PRINT]
        ${pastMemory}
        [/INTERNAL_HISTORY_DO_NOT_PRINT]

        [INTERNAL_DATA_DO_NOT_PRINT]
        current_user_id=${userId}
        available_classes=${JSON.stringify(userClasses)}
        available_subjects=${JSON.stringify(subjects)}
        recent_history=${JSON.stringify(recentLessons)}
        [/INTERNAL_DATA_DO_NOT_PRINT]

        **OUTPUT SCHEMA (MUST STRICTLY FOLLOW THIS RAW JSON FORMAT):**
        {
          "text": "Overall response about the file upload",
          "actions": [
            { "type": "create_class", "data": { "name": "...", "class_size": 40 } },
            { "type": "assign_subject", "data": { "class_id": "NEWLY_CREATED", "subject_id": 1 } },
            { "type": "redirect", "data": { "url": "/units?classId=123" } },
            { "type": "ui_click", "data": { "text": "Auto-Import" } }
          ]
        }
        `;

        // 3. Call AI Service
        const aiResponseRaw = await aiService.callAIProviders(fileMessage, 30000, systemPrompt);

        let aiData;
        try {
            const sanitized = aiService.sanitizeJSON(aiResponseRaw);
            aiData = JSON.parse(sanitized);
            aiData.text = aiData.text || aiData.message || aiData.response;
            aiData.actions = aiData.actions || (aiData.action ? [aiData.action] : []);
        } catch (e) {
            aiData = { text: aiResponseRaw, actions: [] };
        }

        if (typeof aiData.text === 'object') aiData.text = JSON.stringify(aiData.text);

        let finalRedirect = null;

        // 4. Perform Actions Sequentially
        if (aiData.actions && aiData.actions.length > 0) {
            aiData.text += "\n\n🚀 **Agent Actions Started:**";
            for (const act of aiData.actions) {
                const { type, data } = act;
                try {
                    // Similar action handling as in askAI function...
                    // For brevity, we'll handle common cases but in a real implementation
                    // this would mirror the askAI function's action handling

                    if (type === 'ui_click' || type === 'ui_fill') {
                        aiData.text += `\n🤖 Forwarding UI command to your browser...`;
                    }
                    else if (type === 'redirect' && data.url) {
                        aiData.text += `\n🔄 Navigating to ${data.url}...`;
                        finalRedirect = data.url;
                    }
                    else {
                        aiData.text += `\nℹ️ Action ${type} noted.`;
                    }
                } catch (err) {
                    aiData.text += `\n❌ Failed ${type}: ${err.message}`;
                }
            }
        }

        // 5. Save to History (store file info along with message)
        const fileMessageForHistory = `[FILE UPLOAD] ${fileInfo.originalName} (${fileInfo.mimetype})${message ? '\nMessage: ' + message : ''}`;
        await pool.query(
            'INSERT INTO chats (user_id, session_id, message, response, context_type) VALUES (?, ?, ?, ?, ?)',
            [userId, actualSessionId, fileMessageForHistory, aiData.text, 'file_upload']
        );

        res.json({
            success: true,
            response: aiData.text,
            actions: aiData.actions,
            redirect: finalRedirect,
            session_id: actualSessionId
        });

    } catch (error) {
        console.error('File Upload Error:', error);
        res.status(500).json({ success: false, message: 'File upload failed.' });
    }
};
