const axios = require('axios');
require('dotenv').config();

/**
 * AI Service for Lesson Plan Generation
 * Supports both Gemini and Groq AI providers
 */

class AIService {
    constructor() {
        // Support multiple Groq keys comma-separated (preferred) or single key for backward compatibility
        const groqKeysFromEnv = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
        this.groqApiKeys = groqKeysFromEnv.split(',').map(k => k.trim()).filter(k => k);
        this.currentGroqKeyIndex = 0;

        this.axiosConfig = {
            timeout: 60000, // 60 seconds timeout
            headers: { 'Content-Type': 'application/json' }
        };
    }

    /**
     * Generate lesson plan using AI (OpenAI -> Gemini -> Groq)
     */
    async generateLessonPlan(lessonData, provider = null) {
        const startTime = Date.now();
        const prompt = this.constructPrompt(lessonData);
        let errorMessages = [];

        // Build list of available providers, respecting requested provider order
        const availableProviders = [];
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
            availableProviders.push('gemini');
        }
        const groqKeys = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
        if (groqKeys.length > 0 || (this.groqApiKeys && this.groqApiKeys.length > 0)) {
            availableProviders.push('groq');
        }

        const providers = [];
        if (provider && availableProviders.includes(provider.toLowerCase())) {
            providers.push(provider.toLowerCase());
            for (const p of availableProviders) {
                if (p !== provider.toLowerCase()) providers.push(p);
            }
        } else {
            providers.push(...availableProviders);
        }

        if (providers.length === 0) {
            providers.push('groq'); // Default fallback attempt
        }

        for (const currentProvider of providers) {
            try {
                console.log(`Attempting generation with ${currentProvider}...`);
                let response;
                if (currentProvider === 'gemini') {
                    const gemini = require('./geminiService');
                    response = await gemini.generateText(prompt, null, 8192);
                } else if (currentProvider === 'groq') {
                    response = await this.generateWithGroq(prompt, null, 8192);
                }

                const result = this.formatResult(response, currentProvider, startTime, prompt);

                // VALIDATION: Check if the AI followed the "5 points" rule and produced valid JSON
                const validation = this.validateResult(result.content);
                if (validation.isValid) {
                    return result;
                } else {
                    console.warn(`[${currentProvider}] Validation failed: ${validation.reason}. Attempting REGENERATION...`);
                    const retryPrompt = `YOUR PREVIOUS RESPONSE FAILED VALIDATION for the following reason: ${validation.reason}.\n\nREGENERATE the complete lesson plan now in full RAW JSON without truncating. ENSURE you provide AT LEAST 5 detailed points for every single column in every section. DO NOT use placeholders.\n\nORIGINAL DATA:\n${prompt}`;

                    let retryResponse;
                    if (currentProvider === 'gemini') {
                        const gemini = require('./geminiService');
                        retryResponse = await gemini.generateText(retryPrompt, null, 8192);
                    } else if (currentProvider === 'groq') {
                        retryResponse = await this.generateWithGroq(retryPrompt, null, 8192);
                    }

                    const retryResult = this.formatResult(retryResponse, currentProvider, startTime, prompt);
                    const retryValidation = this.validateResult(retryResult.content);
                    if (retryValidation.isValid) {
                        return retryResult;
                    }
                    throw new Error(`Validation failed on retry: ${retryValidation.reason}`);
                }
            } catch (error) {
                console.warn(`${currentProvider} failed:`, error.message);
                errorMessages.push(`${currentProvider}: ${error.message}`);
                // Continue to next provider in loop
            }
        }

        throw new Error(`AI Generation failed. Debug: ${errorMessages.join(' | ')}`);
    }
    /**
     * Helper to call multiple AI providers in sequence for a specific prompt
     */
    async callAIProviders(prompt, customTimeout = 60000, systemPrompt = null) {
        const providers = [];
        if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
            providers.push('gemini');
        }
        if (this.groqApiKeys.length > 0) {
            providers.push('groq');
        }

        if (providers.length === 0) {
            throw new Error('No AI providers configured. Please set GEMINI_API_KEY or GROQ_API_KEYS in your environment.');
        }

        let lastError = null;
        for (const provider of providers) {
            try {
                let response;
                if (provider === 'gemini') {
                    const gemini = require('./geminiService');
                    response = await gemini.generateText(prompt, systemPrompt, 4096);
                } else if (provider === 'groq') {
                    response = await this.generateWithGroq(prompt, systemPrompt);
                }
                
                if (response) return response;
            } catch (err) {
                console.warn(`[AI Provider Fallback] Provider ${provider} failed: ${err.message}`);
                lastError = err;
            }
        }
        throw lastError || new Error('All AI providers failed to generate content');
    }

    async generateCurriculumFromSyllabus(syllabusText) {
        if (!syllabusText || syllabusText.length < 50) {
            throw new Error("Syllabus text is too short or empty.");
        }

        const CHUNK_SIZE = 5000; // Small chunks for precision and to prevent output cutoff
        const totalLength = syllabusText.length;
        const totalChunks = Math.ceil(totalLength / CHUNK_SIZE);
        
        console.log(`[Curriculum AI] Total Text Size: ${totalLength} chars. Processing in ${totalChunks} chunks...`);

        let finalUnits = [];
        let currentContext = {
            last_unit_number: 0,
            last_unit_title: '',
            last_lesson_number: 0
        };

        for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, totalLength);
            const chunk = syllabusText.substring(start, end);
            
            console.log(`[Curriculum AI] Processing Chunk ${i+1}/${totalChunks} (${start} to ${end})...`);

            const prompt = `You are a curriculum expert for the Rwanda Education Board (REB). 
Analyze this specific part of a syllabus book (Chunk ${i+1} of ${totalChunks}) and extract a structured list of Units and Lessons.

**CURRENT CONTEXT (FROM PREVIOUS CHUNKS):**
- Last Unit Number found: ${currentContext.last_unit_number}
- Last Unit Title found: "${currentContext.last_unit_title}"
- Last Lesson Number found in that unit: ${currentContext.last_lesson_number}

**SYLLABUS TEXT (CHUNK ${i+1}):**
${chunk}

**INSTRUCTIONS:**
1. Extract all Units and Lessons mentioned in THIS chunk.
2. **LESSON IDENTIFICATION (STRICT):** You MUST extract the **Lesson Name** exclusively from the **"Content"** column of the syllabus table. Do NOT look for lesson titles in other columns.
3. **CONCISENESS (CRITICAL):** Keep descriptions for "key_competences", "knowledge_understanding", and "learning_activities" concise and focused. Do NOT output thousands of words per unit. If a field is very long in the book, summarize the main points. This prevents the JSON from being cut off.
4. **CLASS IDENTIFICATION (MANDATORY):** REB syllabuses (especially A-Level) contain content for multiple years (S4, S5, S6) in the same book. You MUST look for headers like "S.4 MATHEMATICS" or "SENIOR 4" to identify which grade level a unit belongs to.
3. If a unit started in a previous chunk but continues here with more lessons, include it.
4. If a new unit starts here, increment the unit number correctly based on the book structure.
5. Extract every single Unit without skipping any. Extract every single Lesson inside those units.
6. For each unit, extract:
   - "grade_level": The class this unit belongs to (e.g., "S4", "S5", "S6", "P1", etc.)
   - "unit_number": An integer (e.g., 1, 2)
   - "unit_title": The formal name of the unit
   - "key_competences": A paragraph describing the outcome
   - "lessons": An array of:
     { 
       "lesson_number": integer, 
       "lesson_title": "string",
       "knowledge_understanding": "Specific Knowledge objectives from REB table",
       "skills": "Specific Skills from REB table",
       "attitudes_values": "Specific Attitudes from REB table",
       "content_area": "The 'Content' column detail",
       "learning_activities": "The 'Learning Activities' column detail"
     }
7. **TREE STRUCTURE (CONSISTENCY):** Ensure the unit numbering is sequential for each grade.

**MANDATORY OUTPUT FORMAT (JSON ONLY):**
{
  "units": [
    {
      "grade_level": "S4",
      "unit_number": 1,
      "unit_title": "...",
      "key_competences": "...",
      "lessons": [
        { 
           "lesson_number": 1, 
           "lesson_title": "...",
           "knowledge_understanding": "...",
           "skills": "...",
           "attitudes_values": "...",
           "content_area": "...",
           "learning_activities": "..."
        }
      ]
    }
  ]
}

Return ONLY valid JSON. If no units/lessons are found in this specific chunk, return {"units": []}.`;

            try {
                const response = await this.callAIProviders(prompt, 90000); // 90sec for big chunks
                const sanitized = this.sanitizeJSON(response);
                const result = JSON.parse(sanitized);

                if (result.units && Array.isArray(result.units)) {
                    for (const newUnit of result.units) {
                        // Logic to merge or add
                        // We check for title similarity AND GRADE LEVEL to avoid duplicates spanning chunks
                        const existingUnit = finalUnits.find(u => 
                            (u.unit_number === parseInt(newUnit.unit_number) && u.grade_level === newUnit.grade_level) || 
                            (u.unit_title.toLowerCase().trim() === newUnit.unit_title.toLowerCase().trim() && u.grade_level === newUnit.grade_level)
                        );

                        if (existingUnit) {
                            // Deduplicate and merge lessons
                            newUnit.lessons.forEach(l => {
                                if (!existingUnit.lessons.some(el => el.lesson_title.toLowerCase() === l.lesson_title.toLowerCase())) {
                                    existingUnit.lessons.push(l);
                                }
                            });
                        } else {
                            finalUnits.push(newUnit);
                        }
                    }

                    // Update context for next chunk
                    if (result.units.length > 0) {
                        const last = result.units[result.units.length - 1];
                        currentContext.last_unit_number = last.unit_number;
                        currentContext.last_unit_title = last.unit_title;
                        currentContext.last_lesson_number = last.lessons?.length > 0 ? last.lessons[last.lessons.length-1].lesson_number : 0;
                    }
                }
            } catch (err) {
                console.error(`[Curriculum AI] Error on chunk ${i+1}:`, err.message);
                // We keep going so we don't lose previous chunks
            }
        }

        if (finalUnits.length === 0) {
            throw new Error("AI failed to extract any curriculum structure from the books provided.");
        }

        // Final sort to be sure by Class then Unit number
        finalUnits.sort((a, b) => {
            if (a.grade_level !== b.grade_level) {
                return a.grade_level.localeCompare(b.grade_level, undefined, { numeric: true, sensitivity: 'base' });
            }
            return a.unit_number - b.unit_number;
        });
        finalUnits.forEach(u => {
            if (u.lessons) u.lessons.sort((la, lb) => la.lesson_number - lb.lesson_number);
        });

        return { units: finalUnits };
    }

    /**
     * Programmatic validation of the AI output
     */
    validateResult(content) {
        try {
            const data = typeof content === 'string' ? JSON.parse(content) : content;

            if (!data.phases || !Array.isArray(data.phases)) {
                return { isValid: false, reason: "Missing phases array" };
            }

            for (const phase of data.phases) {
                if (!phase.sub_phases) continue;

                for (const sub of phase.sub_phases) {
                    const tActions = sub.teacher_activities || [];
                    const lActions = sub.learner_activities || [];

                    // Check for minimum 5 points
                    if (tActions.length < 5 || lActions.length < 5) {
                        return {
                            isValid: false,
                            reason: `Phase "${phase.section_name} - ${sub.type}" has too few points (Teacher: ${tActions.length}, Learner: ${lActions.length}). Required: 5+ each.`
                        };
                    }

                    // If any trigger phrase appears, check that the same sub-phase's teacher column
                    // contains at least one real Q1/Q2/Q3 question format.
                    const triggerPhrases = [
                        "teacher asks questions",
                        "teacher gives questions",
                        "learners answer",
                        "see page",
                        "teacher provides homework",
                        "teacher gives homework",
                        "provides exercises",
                        "gives exercises",
                        "administers a quiz",
                        "provides a quiz",
                        "gives a quiz",
                        "administers a test",
                        "provides a test",
                        "gives a test"
                    ];

                    const allText = [...tActions, ...lActions].join(' ').toLowerCase();
                    const hasTrigger = triggerPhrases.some(kw => allText.includes(kw));

                    if (hasTrigger) {
                        // Check if real Q1/Q2 questions exist in teacher column
                        const tText = tActions.join(' ').toLowerCase();
                        const hasRealQuestions = /q1\s*:|q2\s*:|q3\s*:/.test(tText);
                        if (!hasRealQuestions) {
                            return {
                                isValid: false,
                                reason: `Phase "${phase.section_name} - ${sub.type}" uses a trigger phrase (e.g., 'gives exercises', 'asks questions') but provides NO actual Q1/Q2 questions. You MUST write real questions when using these phrases.`
                            };
                        }
                    }


                }
            }

            return { isValid: true };
        } catch (e) {
            return { isValid: false, reason: "Invalid JSON format" };
        }
    }

    /**
     * Helper to format result
     */
    formatResult(response, provider, startTime, prompt) {
        const generationTime = (Date.now() - startTime) / 1000;
        const sanitizedResponse = this.sanitizeJSON(response);
        return {
            content: sanitizedResponse,
            provider: provider,
            generationTime,
            prompt
        };
    }





    /**
     * Sanitize AI-generated JSON by removing Markdown blocks and fixing common syntax errors/truncations
     */
    sanitizeJSON(content) {
        if (!content) return content;

        let sanitized = content.trim();

        // 1. Remove Markdown code blocks if present
        if (sanitized.includes('```')) {
            const jsonMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                sanitized = jsonMatch[1].trim();
            } else {
                sanitized = sanitized.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
            }
        }

        // 2. Find the first '{' and start from there
        const firstBrace = sanitized.indexOf('{');
        if (firstBrace !== -1) {
            sanitized = sanitized.substring(firstBrace);
        }

        // 3. Fix invalid JSON escape sequences (e.g., LaTeX \frac, \(, \), \[ etc.)
        sanitized = sanitized.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');

        // Test if already valid JSON
        try {
            JSON.parse(sanitized);
            return sanitized;
        } catch (e) {
            // Needs repair
        }

        // 4. Truncation Repair: Track unclosed strings, brackets, and braces
        let inString = false;
        let escaped = false;
        const openStack = [];

        for (let i = 0; i < sanitized.length; i++) {
            const char = sanitized[i];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (char === '\\') {
                escaped = true;
                continue;
            }
            if (char === '"') {
                inString = !inString;
                continue;
            }
            if (!inString) {
                if (char === '{' || char === '[') {
                    openStack.push(char);
                } else if (char === '}' && openStack[openStack.length - 1] === '{') {
                    openStack.pop();
                } else if (char === ']' && openStack[openStack.length - 1] === '[') {
                    openStack.pop();
                }
            }
        }

        // If truncated inside a string literal, close the quote
        if (inString) {
            sanitized += '"';
        }

        // Close all unclosed brackets/braces in LIFO order
        while (openStack.length > 0) {
            const open = openStack.pop();
            if (open === '{') sanitized += '}';
            else if (open === '[') sanitized += ']';
        }

        // Remove trailing commas before closing braces/brackets
        sanitized = sanitized.replace(/,\s*([\}\]])/g, '$1');

        return sanitized;
    }

    /**
     * Generate with Groq (with API Key Rotation and Model Fallback)
     */
    async generateWithGroq(prompt, systemPrompt = null, maxTokens = null) {
        // Refresh keys in case they were updated in process.env
        const groqKeysFromEnv = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
        const envKeys = groqKeysFromEnv.split(',').map(k => k.trim()).filter(Boolean);
        if (envKeys.length > 0) {
            this.groqApiKeys = envKeys;
        }

        if (!this.groqApiKeys || this.groqApiKeys.length === 0) {
            throw new Error('No Groq API keys configured. Please set GROQ_API_KEYS or GROQ_API_KEY in your environment variables.');
        }

        const defaultSystem = 'You are an expert Rwandan educator. You MUST return ONLY a raw JSON object. Never use Markdown code blocks (```json), never add extra text outside the JSON.';
        const activeSystem = systemPrompt || defaultSystem;
        
        // Dynamically set max_tokens: 8192 default for lesson plans, 2048 for chat/system queries
        const finalMaxTokens = maxTokens || (systemPrompt ? 2048 : 8192);

        // Configurable models list with robust fallback across available Groq models
        const configuredModels = process.env.GROQ_MODELS 
            ? process.env.GROQ_MODELS.split(',').map(m => m.trim()).filter(Boolean) 
            : [];
        const models = configuredModels.length > 0 ? configuredModels : [
            'openai/gpt-oss-120b',
            'qwen/qwen3.6-27b',
            'openai/gpt-oss-20b',
            'moonshotai/kimi-k2-instruct-0905',
            'moonshotai/kimi-k2-instruct',
            'llama-3.1-8b-instant'
        ];

        const maxTotalAttempts = this.groqApiKeys.length * models.length;
        let totalAttempts = 0;
        let lastError = null;

        while (totalAttempts < maxTotalAttempts) {
            const currentKey = this.groqApiKeys[this.currentGroqKeyIndex];
            const currentModel = models[totalAttempts % models.length];

            try {
                console.log(`[Groq] Attempt ${totalAttempts + 1}/${maxTotalAttempts} using key #${this.currentGroqKeyIndex + 1} with model ${currentModel} (max_tokens: ${finalMaxTokens})`);

                const response = await axios.post(
                    'https://api.groq.com/openai/v1/chat/completions',
                    {
                        model: currentModel,
                        messages: [
                            { role: 'system', content: activeSystem },
                            { role: 'user', content: prompt }
                        ],
                        response_format: { type: 'json_object' },
                        temperature: 0.4,
                        max_tokens: finalMaxTokens
                    },
                    {
                        timeout: 55000,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentKey}`
                        }
                    }
                );

                if (response.data?.choices?.[0]?.message?.content) {
                    console.log(`[Groq] ✓ Success with key #${this.currentGroqKeyIndex + 1} (${currentModel})`);
                    return response.data.choices[0].message.content;
                } else {
                    throw new Error('Invalid response from Groq API');
                }
            } catch (error) {
                lastError = error;
                const status = error.response?.status;
                const errorData = error.response?.data?.error;
                const errorMessage = errorData?.message || error.message;

                console.warn(`[Groq] ✗ Attempt ${totalAttempts + 1} failed with key #${this.currentGroqKeyIndex + 1} (${currentModel}) - Status: ${status || 'Network/Timeout'}: ${errorMessage}`);

                // If authentication error or rate limit / quota, rotate API key
                const isKeyError = status === 401 || status === 403 || status === 429 ||
                    (status === 400 && errorData?.type === 'insufficient_quota') ||
                    (status === 403 && (errorMessage?.toLowerCase().includes('limit') || errorData?.code?.toLowerCase().includes('limit')));

                if (isKeyError && this.groqApiKeys.length > 1) {
                    this.currentGroqKeyIndex = (this.currentGroqKeyIndex + 1) % this.groqApiKeys.length;
                    console.log(`[Groq] Rotated to key #${this.currentGroqKeyIndex + 1}`);
                }

                // Advance to next attempt to try next model / key
                totalAttempts++;
            }
        }

        console.error('[Groq] All API keys and models exhausted');
        throw lastError || new Error('All Groq API keys and fallback models have been exhausted.');
    }

    /**
     * Construct the AI prompt
     */
    constructPrompt(lessonData) {
        const { subject, unit, lesson, duration: durationMinutes, teacherReflection, syllabusContent } = lessonData;

        // Suggested timing distribution
        const timings = {
            intro: Math.round(durationMinutes * 0.25),
            dev: Math.round(durationMinutes * 0.60),
            evaluate: Math.round(durationMinutes * 0.15)
        };

        let continuityContext = '';
        if (teacherReflection) {
            continuityContext = `
**PEDAGOGICAL CONTINUITY (CRITICAL):**
The previously taught lesson had this teacher reflection: "${teacherReflection}". 
You MUST adjust this new lesson plan to address the points mentioned. If learners struggled, provide more scaffolding. If they exceeded expectations, provide more challenging tasks. Ensure the transition from the previous lesson's outcomes is smooth.
`;
        }

        // Determine target language based on subject
        let targetLanguage = 'English';
        const subjectName = (subject.name || '').toLowerCase();

        if (subjectName.includes('kinyarwanda')) {
            targetLanguage = 'Kinyarwanda';
        } else if (subjectName.includes('french') || subjectName.includes('français') || subjectName.includes('francais')) {
            targetLanguage = 'French';
        } else if (subjectName.includes('kiswahili') || subjectName.includes('swahili')) {
            targetLanguage = 'Kiswahili';
        }

        // Language Maps for Section Names and Sub-Phases
        const langMaps = {
            'Kinyarwanda': {
                intro: 'Intangiriro',
                dev: 'Iterambere ry\'isomo',
                concl: 'Umusozo',
                engage: 'Icyiciro cyo Gushishikariza',
                explore: 'Icyiciro cyo Kuvumbura',
                explain: 'Icyiciro cyo Gusobanura',
                elaborate: 'Icyiciro cyo Kwagura imyigire',
                evaluate: 'Icyiciro cy\'Isuzuma',
                presentation: 'Kwerekana',
                practice: 'Imyitozo',
                production: 'Gukora wigenga',
                crossCuttingIssues: 'Uburinganire, Kubungabunga ibidukikije n\'iterambere rirambye, Kwigisha amahoro n\'indangagaciro, Uburezi budaheza, Uburezi mu by\'imari, Ikoranabuhanga',
                genericCompetences: 'Gushyikirana no gukorera hamwe, Gushishoza no gukemura ibibazo, Guhanga ibishya, Kwigira no kwiteza imbere, Kwiga ubuzima bwose'
            },
            'French': {
                intro: 'Introduction',
                dev: 'Développement',
                concl: 'Conclusion',
                engage: 'Phase d\'Engagement',
                explore: 'Phase d\'Exploration',
                explain: 'Phase d\'Explication',
                elaborate: 'Phase d\'Élaboration',
                evaluate: 'Phase d\'Évaluation',
                presentation: 'Présentation',
                practice: 'Pratique',
                production: 'Production',
                crossCuttingIssues: 'Éducation au genre, Environnement et durabilité, Éducation à la paix et aux valeurs, Éducation inclusive, Éducation financière, TIC et littératie numérique',
                genericCompetences: 'Communication et collaboration, Pensée critique et résolution de problèmes, Créativité et innovation, Auto-gestion et développement personnel, Apprentissage tout au long de la vie'
            },
            'Kiswahili': {
                intro: 'Utangulizi',
                dev: 'Maendeleo ya Somo',
                concl: 'Hitimisho',
                engage: 'Awamu ya Kuchochea',
                explore: 'Awamu ya Ugunduzi',
                explain: 'Awamu ya Maelezo',
                elaborate: 'Awamu ya Upanuzi',
                evaluate: 'Awamu ya Tathmini',
                presentation: 'Uwasilishaji',
                practice: 'Mazoezi',
                production: 'Uzalishaji',
                crossCuttingIssues: 'Elimu ya jinsia, Mazingira na uendelevu, Elimu ya amani na maadili, Elimu jumuishi, Elimu ya fedha, ICT na ujuzi wa kidijitali',
                genericCompetences: 'Mawasiliano na ushirikiano, Fikra tunduizi na utatuzi wa matatizo, Ubunifu na upanuzi, Kujitawala na maendeleo binafsi, Kujifunza maisha yote'
            },
            'English': {
                intro: 'Introduction',
                dev: 'Development',
                concl: 'Conclusion',
                engage: 'Engage Phase',
                explore: 'Explore Phase',
                explain: 'Explain Phase',
                elaborate: 'Elaborate Phase',
                evaluate: 'Evaluate Phase',
                presentation: 'Presentation',
                practice: 'Practice',
                production: 'Production',
                crossCuttingIssues: 'Gender Education, Environmental and sustainability, Peace and Values Education, Inclusive Education, Financial Education, ICT and Digital Literacy',
                genericCompetences: 'Communication and Collaboration, Critical Thinking and Problem Solving, Creativity and Innovation, Self-Management and Personal Development, Life-long learning'
            }
        };

        const currentLangMap = langMaps[targetLanguage] || langMaps['English'];

        // Determine pedagogical model
        const isLanguage = subjectName.includes('kinyarwanda') ||
            subjectName.includes('english') ||
            subjectName.includes('french') ||
            subjectName.includes('français') ||
            subjectName.includes('kiswahili') ||
            subjectName.includes('swahili');

        const pedagogicalModel = isLanguage ? '3Ps' : '5Es';

        let modelInstructions = '';
        let schemaPhases = [];
        let requiredSubPhases = [];

        if (pedagogicalModel === '3Ps') {
            requiredSubPhases = [currentLangMap.intro, currentLangMap.presentation, currentLangMap.practice, currentLangMap.production, currentLangMap.concl];
            modelInstructions = `
**PEDAGOGICAL MODEL: 3Ps (Presentation, Practice, Production)**
Since this is a Language subject, you MUST use the 3Ps model across the phases.
1. **Presentation (${currentLangMap.presentation}):** Teacher introduces the new language item (grammar/vocabulary/skill) in context.
2. **Practice (${currentLangMap.practice}):** Guided practice where learners use the item in a controlled way.
3. **Production (${currentLangMap.production}):** Learners use the language freely in a creative, real-world task.
**CRITICAL:** These three phases MUST occur in this EXACT chronological order (1 -> 2 -> 3) to move from teacher-led to learner-led mastery.

**KINYARWANDA PEDAGOGY (CRITICAL):**
If the target language is Kinyarwanda, you MUST use these official modelling terms for 3Ps:
- **"Kwerekana"** (Presentation)
- **"Imyitozo"** (Practice)
- **"Gukora wigenga"** (Production)

**STRICT LABELING (CRITICAL):**
- You MUST use the **EXACT** labels provided above for the "type" field in the JSON.
- **FOR LANGUAGES (3Ps):** NEVER add the word "Phase", "Section", or any translations. Write ONLY the clean local term (e.g., "Kwerekana").
- **FOR SCIENCE/OTHERS (5Es):** The word "Phase" (or local equivalent like "Icyiciro" or "Awamu") MUST be used as provided in the mapping.
- **NEVER USE** these old/incorrect terms: "Ndatanga urugero", "Dukorane", "Dukore".
- **AI REASONING (CRITICAL):** Before you generate each step, cross-reference the Official Syllabus Content provided. Think about the specific learning outcomes defined in the syllabus for this unit/lesson. Your activities MUST directly move the learner toward these specific goals.

${syllabusContent ? `**OFFICIAL SYLLABUS CONTENT (PRIMARY SOURCE):**\n${syllabusContent.substring(0, 30000)}\n(Use this content as the definitive guide for what to teach in this lesson.)\n` : ''}

**SUBJECT DETAILS:** 
- Subject: ${subject.name} (Grade: ${lesson.class_name})
- Unit: ${unit.unit_number} - ${unit.unit_title}
- Lesson: ${lesson.lesson_number} - ${lesson.lesson_title}
- Key Lab/Materials: ${lesson.learning_materials || 'General materials'}
- Duration: ${durationMinutes} minutes

Ensure the lesson is very detailed and following the teacher-centered to learner-centered shift.`;

            schemaPhases = [
                {
                    "section_name": currentLangMap.intro,
                    "timing": `${timings.intro} min`,
                    "sub_phases": [{ "type": currentLangMap.intro, "teacher_activities": ["..."], "learner_activities": ["..."], "competences": ["..."] }]
                },
                {
                    "section_name": currentLangMap.dev,
                    "timing": `${timings.dev} min`,
                    "sub_phases": [
                        { "type": currentLangMap.presentation, "teacher_activities": ["..."], "learner_activities": ["..."], "competences": ["..."] },
                        { "type": currentLangMap.practice, "teacher_activities": ["..."], "learner_activities": ["..."], "competences": ["..."] },
                        { "type": currentLangMap.production, "teacher_activities": ["..."], "learner_activities": ["..."], "competences": ["..."] }
                    ]
                },
                {
                    "section_name": currentLangMap.concl,
                    "timing": `${timings.evaluate} min`,
                    "sub_phases": [{ "type": currentLangMap.concl, "teacher_activities": ["..."], "learner_activities": ["..."], "competences": ["..."] }]
                }
            ];
        } else {
            requiredSubPhases = [currentLangMap.engage, currentLangMap.explore, currentLangMap.explain, currentLangMap.elaborate, currentLangMap.evaluate];
            modelInstructions = `
**PEDAGOGICAL MODEL: 5Es (Engage, Explore, Explain, Elaborate, Evaluate)**
Since this is a Science or Humanities subject, use the standard 5Es model.`;

            schemaPhases = [
                {
                    "section_name": currentLangMap.intro,
                    "timing": `${timings.intro} min`,
                    "sub_phases": [{ "type": currentLangMap.engage, "teacher_activities": ["..."], "learner_activities": ["..."], "competences": ["..."] }]
                },
                {
                    "section_name": currentLangMap.dev,
                    "timing": `${timings.dev} min`,
                    "sub_phases": [
                        { "type": currentLangMap.explore, "teacher_activities": ["..."], "learner_activities": ["..."], "competences": ["..."] },
                        { "type": currentLangMap.explain, "teacher_activities": ["..."], "learner_activities": ["..."], "competences": ["..."] },
                        { "type": currentLangMap.elaborate, "teacher_activities": ["..."], "learner_activities": ["..."], "competences": ["..."] }
                    ]
                },
                {
                    "section_name": currentLangMap.concl,
                    "timing": `${timings.evaluate} min`,
                    "sub_phases": [{ "type": currentLangMap.evaluate, "teacher_activities": ["..."], "learner_activities": ["..."], "competences": ["..."] }]
                }
            ];
        }

        let prompt = `You are an expert Rwandan educator. Generate a COMPREHENSIVE and AGE-APPROPRIATE lesson plan for the REB curriculum.
        
**CRITICAL LANGUAGE INSTRUCTION:**
The subject is "${subject.name}". You MUST generate the ENTIRE lesson plan content (titles, descriptions, activities, teacher self-evaluation, etc.) in **${targetLanguage}**.
- The JSON KEYS (e.g., "header_details", "teacher_activities") must remain in ENGLISH.
- **CRITICAL:** ALL VALUES must be in **${targetLanguage}**.
- **CRITICAL:** Even if the input/context provided below (like Unit Title, Key Competences, or Reference Materials) is in English, you **MUST TRANSLATE** it into ${targetLanguage} for the final output. Do NOT simply copy English text.

${continuityContext}

${modelInstructions}

**STRICT LANGUAGE SEPARATION RULES (DO NOT MIX LANGUAGES):**
1. **IF TARGET IS KINYARWANDA:** 
   - Use proper Ikinyarwanda cy'amashuri.
   - **FORBIDDEN:** Do NOT use Kiswahili words. (e.g., do NOT use 'Mada', 'Shughuli', 'Wanafunzi', 'Kipindi'). Use 'Umutwe', 'Ibikorwa', 'Abanyeshuri', 'Isomo'.
2. **IF TARGET IS KISWAHILI:** 
   - Use standard academic Kiswahili (Sanifu).
   - **FORBIDDEN:** Do NOT use Kinyarwanda words. (e.g., do NOT use 'Igihembwe', 'Imfashanyigisho', 'Icyiciro'). Use 'Muhula', 'Zana za kujifunzia', 'Darasa'.
3. **IF TARGET IS FRENCH:**
   - Use standard academic French.
   - **FORBIDDEN:** Do NOT use English/Kinyarwanda words inside the French text.

**MANDATORY OUTPUT FORMAT:**
You must return only a valid JSON object. No other text.

**CRITICAL JSON ESCAPING RULES:**
1. All string values in JSON MUST use escaped characters (\\n for newlines, \\t for tabs). Never use literal newlines inside JSON string values.
2. **APOSTROPHES/SINGLE QUOTES:** JSON strings are wrapped in DOUBLE QUOTES ("). Inside double-quoted strings, apostrophes (') do NOT need escaping and should be used as-is.
   - CORRECT: "lesson_title": "Imimaro y'ingenzi y'amagambo"
   - CORRECT: "text": "This is Bob's book"  
   - CORRECT: "text": "L'école est grande"
   - WRONG: "text": "Imimaro y\\'ingenzi" (do NOT escape apostrophes!)
3. **BACKSLASHES AND DOUBLE QUOTES:** Only backslashes (\\) and double quotes (") need escaping inside JSON strings.
   - CORRECT: "text": "She said \\"Hello\\""
   - CORRECT: "path": "C:\\\\Users\\\\Documents"



**JSON SCHEMA:**
{
  "header_details": {
    "special_needs_provision": "Detailed provision for the specific special needs",
    "unit_title": "Real title of the unit",
    "key_unit_competence": "To be able to:\\n. [Action 1]\\n. [Action 2]",
    "lesson_title": "Real lesson title",
    "instructional_objective": "Comprehensive ABCCD objective",
    "plan_for_class": "Location details",
    "learning_materials": "Specific tools",
    "references": "Full citations and links"
  },
  "visual_aid": {
    "title": "Clear Concept Diagram Title",
    "mermaid_code": "flowchart TD\\n  A[Core Concept] --> B[Key Step / Component]\\n  B --> C[Application / Example]\\n  C --> D[Summary Outcome]",
    "description": "Educational explanation of this visual diagram for classroom teaching",
    "image_prompt": "Realistic high-definition educational illustration of the lesson topic for high school students"
  },
  "timing_chart": {
    "title": "Lesson Timing Allocation (${durationMinutes} min)",
    "type": "doughnut",
    "data": {
      "labels": ["Introduction (${timings.intro}m)", "Development (${timings.dev}m)", "Conclusion & Evaluation (${timings.evaluate}m)"],
      "datasets": [{
        "data": [${timings.intro}, ${timings.dev}, ${timings.evaluate}],
        "backgroundColor": ["#3b82f6", "#10b981", "#f59e0b"]
      }]
    }
  },
  "lesson_flow_overview": "3-4 sentence overview of lesson",
  "teacher_self_evaluation": "A professional reflection statement",
  "phases": ${JSON.stringify(schemaPhases, null, 2)}
}

**OFFICIAL REB LISTS:**
Use these exact terms for the "competences" field:
- **Cross-Cutting Issues:** ${currentLangMap.crossCuttingIssues}
- **Generic Competences:** ${currentLangMap.genericCompetences}

1. **PEDAGOGICAL QUESTIONS & ANSWERS — TRIGGER PHRASES REQUIRE REAL CONTENT (CRITICAL):**
    - Questions are contextual — you do NOT need to add questions to every phase.
    - **HOWEVER**, if you use ANY of these trigger phrases anywhere in an activity, you MUST immediately follow it with actual numbered questions (Q1:..., Q2:...) and answers (A1:..., A2:...):
        "teacher asks questions", "teacher gives questions", "learners answer", "see page",
        "teacher provides homework", "teacher gives homework", "provides exercises", "gives exercises",
        "administers a quiz", "provides a quiz", "gives a quiz",
        "administers a test", "provides a test", "gives a test"
    - **STRICT COLUMN FIDELITY**: 
        - **QUESTIONS** (Q1:..., Q2:...) MUST be in the **Teacher Activity** column.
        - **ANSWERS** (A1:..., A2:...) MUST be in the **Learner Activity** column.
    - **FORBIDDEN**: Using any trigger phrase above WITHOUT providing the actual content (Q1/Q2/A1/A2). This will cause the system to reject your output.
    - **EXAMPLE (CORRECT):** Teacher Activity: "Teacher gives exercises: Q1: Differentiate f(x) = 3x² + 2x. Q2: Find the derivative of g(x) = sin(x)."
    - **EXAMPLE (WRONG):** Teacher Activity: "Teacher gives exercises to learners." ← NO actual questions = REJECTED.

2. **MANDATORY DURATION COMPLIANCE:**
   - The total duration for this lesson is EXACTLY **${durationMinutes} minutes**.
   - You MUST ensure the "timing" fields in your JSON add up to exactly ${durationMinutes}.
   - You MUST tailor the volume and depth of activities to fit this specific time frame.

3. **ABCCD OBJECTIVES:** Every "instructional_objective" MUST follow the ABCCD model (Audience, Behavior, Condition, Criteria, Degree) as a natural sentence without labels.

4. **KEY UNIT COMPETENCE FORMAT:** The "key_unit_competence" field MUST follow this exact structure with escaped newlines:
   "To be able to:\\n. [Action 1]\\n. [Action 2]"
5. **PLANNED LOCATION:** The "plan_for_class" field MUST strictly contain only the location name provided in input with NO additional text.
6. **TEACHER SELF-EVALUATION:** MUST be a professional reflection.
7. **SPECIAL NEEDS PROVISION (CRITICAL):** 
   - You MUST identify the specific number of learners with SEN (e.g., "3 learners with Visual Impairment").
   - You MUST provide a **detailed pedagogical script** on exactly HOW they will be helped (e.g., "The teacher will provide large-print worksheets for the 3 visual impairment learners and seat them in the front row.").
   - If "None", write EXACTLY "None".
8. **MANDATORY: 5+ POINTS PER PHASE (STRICT):**
   - **Always provide AT LEAST 5 DISTINCT POINTS in each sub-phase column.**
   - You MUST generate at least **5-10 highly detailed** activity points for BOTH the teacher and learner columns in EVERY sub-phase (${requiredSubPhases.join(', ')}).
   - Even for a short lesson, do NOT consolidate points. Provide 5 distinct, numbered actions.
9. **DIVERSE EVALUATION (BLOOM'S TAXONOMY):**
   - Do NOT only use MCQs. Use a mix of Open questions, short answers, and discussion topics.
   - The final evaluation phase (${pedagogicalModel === '3Ps' ? currentLangMap.concl : currentLangMap.evaluate}) MUST include specific questions corresponding to the lesson difficulty.
10. **MANDATORY: NO PLACEHOLDERS & PROVIDE REAL EXAMPLES (CRITICAL):**
   - NEVER use vague phrases like "Teacher gives questions" or "Learners answer questions" in isolation. 
   - You MUST provide the **ACTUAL CONTENT** as defined in Rule #1.
   - Example (Question/Answer Pair): 
     Teacher Activity: "Teacher asks: Q1: What is the main function of the lungs?"
     Learner Activity: "Learners answer: A1: The lungs facilitate gas exchange, bringing oxygen into the blood."
11. **STRUCTURED Q&A:** Use double escaped newlines ("\\n\\n") between Q&A pairs.
12. **MANDATORY: NO REFERENCES TO PAGES:** Never say "See page X". Write the actual content out.
13. **MANDATORY: DEPTH & VOLUME:** Check that every phase has at least 5 points before finishing.
14. **MANDATORY: COMPETENCES & ISSUES WITH EXPLANATIONS (CRITICAL):**
    - You MUST use ONLY official REB names for Generic Competences and Cross-Cutting Issues.
    - **CRITICAL:** Every competence or issue listed MUST include a **short explanation** of how it is addressed in that specific phase.
    - **UNIQUENESS RULE:** Every explanation MUST be different. You are **FORBIDDEN** from repeating the same explanation or sentence across different competences or phases. It must reflect the actual activity happening in that specific sub-phase.
    - Format: "[Official Name]: [Unique explanation]".
15. **MANDATORY: SUBJECT NOTATION & FORMULAS (CRITICAL):** 
    - Use proper Unicode symbols (x², √x, ±, ≠, ≤, ≥, π). 
    - **NEVER use caret notation (4^2).** Use official superscripts (4²).
    - For Fractions, use proper horizontal or diagonal lines if possible, or clear notation.
16. **MANDATORY: REFERENCE ACCURACY (CRITICAL):**
    - You MUST use the **Provided Reference materials** as your primary source. Mention specifically what was used from them.
    - You MUST provide at least 2-3 relevant **External Resource Links** (https://) in the references field.
17. **MANDATORY: GRADE-LEVEL APPROPRIATENESS:** Complexity must match the class level.
18. **STRICT VERIFICATION CHECKLIST:** 
    Before outputting, you MUST verify:
    - [ ] TIMING: Sums to ${durationMinutes}?
    - [ ] VOLUME: At least 5 detailed points in every column of every section?
    - [ ] CONTENT: Are actual questions and answers provided (no placeholders)?
    - [ ] SEN: Is the number of students and specific help method mentioned?
    - [ ] SYMBOLS: Are math symbols proper Unicode (no carets)?
    - [ ] REFERENCES: Are external links included?
    - [ ] COMPETENCES: Does every competence/issue include a short explanation of HOW it's addressed?
    - [ ] ${pedagogicalModel === '3Ps' ? 'INTRODUCTION' : 'ENGAGE'}: Do the learners formulate and ask the 'Key Question' after teacher guidance?

19. **MANDATORY: KEY QUESTION IN LESSON START (CRITICAL):**
    - Within the **${pedagogicalModel === '3Ps' ? currentLangMap.intro : currentLangMap.engage}** sub-phase, the **Teacher** MUST guide and facilitate the learners through a scenario or observation, but the **Key Question** (Akabazo k'ingenzi) MUST be formulated and asked by the **Learners** to the teacher.
    - This "Key Question" MUST be specific and reflect the learners' curiosity about the topic.
    - The **Learner Activity** column MUST explicitly show the learners formulating and asking this question.
    - The **Teacher Activity** column MUST show the teacher guiding them towards this question and responding to it to transition to the next phase.

20. **MANDATORY: DATA FIDELITY (STRICT):**
    - You MUST use the **EXACT** "Class Size" and "Plan for class" provided in the **INPUT DATA** below.
    - **NEVER** default to "40" if a different number is provided.
    - **NEVER** use the school name as the "plan_for_class" if a specific location (inside, outside, smartclass, etc.) is provided.
    - If "Class Size" is 34, your output MUST be 34. If "Plan for class" is "smartclass", your output MUST be "smartclass".

**FINAL CRITICAL REMINDER:**
**Always provide not less than 5 points in each phase.** Every single section must be detailed and comprehensive.

**INPUT DATA:**
- School: ${lesson.school_name || ''} (System Provided)
- Teacher: ${lesson.teacher_name || ''} (System Provided)
- Subject: ${subject.name || ''}
- Class Level: ${lesson.class_name || ''}
- Unit: ${unit.unit_number || ''} - ${unit.unit_title || ''}
- Lesson Title: ${lesson.lesson_title || ''}
- Lesson No: ${lesson.lesson_number || ''}
- Duration: ${durationMinutes} minutes
- Date: ${lesson.teaching_date || ''}
- Term: ${lesson.term || ''}
- Class Size: ${lesson.class_size || ''} (System Provided)
- Plan for class: ${lesson.location || ''}
- Learning Materials: ${lesson.learning_materials || ''}
- Special Needs: ${lessonData.specialNeeds?.length > 0 ? lessonData.specialNeeds.map(sn => `${sn.number_of_learners} with ${sn.type}`).join(', ') : 'None'}

${lessonData.referenceMaterials && lessonData.referenceMaterials.length > 0 ? `
**PRIMARY REFERENCE MATERIALS (BOOKS/DOCUMENTS):**
The following content is extracted from official books or documents uploaded by the teacher. You MUST use this as your PRIMARY source for the lesson content, examples, and activities.
${lessonData.referenceMaterials.map((mat, index) => `
--- MATERIAL ${index + 1}: ${mat.title} ---
${mat.extracted_text ? mat.extracted_text.substring(0, 3000) : ''}
`).join('\n')}

CRITICAL: While you prioritize the above materials, you are encouraged to use your general expert knowledge to enhance the introduction, development, and conclusion, provided it does NOT contradict the provided materials.` : ''}

Generate the JSON now (MANDATORY: Return ONLY raw JSON, do NOT use Markdown code blocks, do NOT add introductory or concluding text):`;

        return prompt;
    }

    async matchClassToSyllabus(className, subjectName) {
        const prompt = `You are a Rwandan education expert specialized in the REB (Rwanda Education Board) curriculum. 
A teacher created a class named "${className}" and assigned the subject "${subjectName}". 
Interpret this to find the formal REB Grade Level and the formal REB Subject name.
    
**CRITICAL: NICKNAMES & CONCATENATION**
- Teachers often type nicknames without spaces (e.g., "P4Math", "P5Science", "S4Hist").
- You MUST be smart enough to separate these. "P4Math" -> Grade: P4, Subject: Mathematics.
- "S1Eng" -> Grade: S1, Subject: English.
- "P3Kiny" -> Grade: P3, Subject: Kinyarwanda.

**REASONING CHALLENGES:**
- Class names often include "Combinations" (e.g., S4MS2, S4PCB, S4MCB, S5HLG). 
- "S4PCB" means Senior 4 Physics-Chemistry-Biology. The grade is "S4".
- "S4MS2" means Senior 4 Mathematics-SST (Social Studies?) or similar. The grade is "S4".
- "P" refers to Primary (P1-P6), "S" refers to Senior (S1-S6).
- If the teacher calls the class "Math senior four", the grade is "S4" and subject is "Mathematics".
- If the subject is "Math", "Mat", "Mth", return "Mathematics".
- If the subject is "Kiny", "Kinyarwanda", return "Kinyarwanda".
- If the subject is "Ict", return "Information and Communication Technology (ICT)".
- If the subject is "Entre", "Entrep", return "Entrepreneurship".

**GRADE MAPPING:**
Senior 1 -> S1
P 1 -> P1
Grade 1 -> P1 (unless Senior is specified)

**OUTPUT FORMAT (JSON ONLY):**
{
  "grade_level": "S4",
  "formal_subject": "Mathematics",
  "reasoning": "P4Math concatenated string refers to Primary 4 level and Mathematics."
}
Return only valid JSON.`;

        try {
            const response = await this.callAIProviders(prompt, 20000);
            const sanitized = this.sanitizeJSON(response);
            return JSON.parse(sanitized);
        } catch (err) {
            console.error('AI Matching failed:', err.message);
            // Fallback to basic regex if AI fails
            let grade = 'General';
            const c = className.toUpperCase();
            if (c.includes('S4')) grade = 'S4';
            else if (c.includes('S5')) grade = 'S5';
            else if (c.includes('S6')) grade = 'S6';
            else if (c.includes('S1')) grade = 'S1';
            else if (c.includes('S2')) grade = 'S2';
            else if (c.includes('S3')) grade = 'S3';
            else if (c.includes('P1')) grade = 'P1';
            else if (c.includes('P2')) grade = 'P2';
            else if (c.includes('P3')) grade = 'P3';
            else if (c.includes('P4')) grade = 'P4';
            else if (c.includes('P5')) grade = 'P5';
            else if (c.includes('P6')) grade = 'P6';
            
            return { grade_level: grade, formal_subject: subjectName };
        }
    }
}

module.exports = new AIService();
