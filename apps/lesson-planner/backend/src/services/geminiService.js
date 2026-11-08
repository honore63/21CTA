/**
 * Gemini AI Service
 * Powered by @google/genai SDK with model fallback support
 */

const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');
require('dotenv').config();

const GEMINI_MODELS = process.env.GEMINI_MODELS
    ? process.env.GEMINI_MODELS.split(',').map(m => m.trim()).filter(Boolean)
    : [process.env.GEMINI_MODEL || 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

const GEMINI_MODEL = GEMINI_MODELS[0];

const getClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('[Gemini] GEMINI_API_KEY is not configured in .env file.');
    }
    return new GoogleGenAI({ apiKey });
};

/**
 * Send a prompt to Gemini and get a text response with model fallback.
 */
const generate = async (prompt, options = {}) => {
    const { systemInstruction, jsonMode = false, maxOutputTokens = 4096 } = options;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('[Gemini] GEMINI_API_KEY is not configured in .env file.');
    }

    let lastError = null;

    for (const currentModel of GEMINI_MODELS) {
        // Try @google/genai SDK first
        try {
            const ai = getClient();
            
            if (ai.models && typeof ai.models.generateContent === 'function') {
                const res = await ai.models.generateContent({
                    model: currentModel,
                    contents: prompt,
                    config: {
                        ...(systemInstruction && { systemInstruction }),
                        ...(jsonMode && { responseMimeType: 'application/json' }),
                        maxOutputTokens
                    }
                });
                if (res && res.text) return res.text;
            }

            if (ai.interactions && typeof ai.interactions.create === 'function') {
                const requestConfig = {
                    model: currentModel,
                    input: prompt,
                    config: {
                        ...(systemInstruction && { systemInstruction }),
                        ...(jsonMode && { responseMimeType: 'application/json' })
                    }
                };
                
                const interaction = await ai.interactions.create(requestConfig);
                if (interaction && (interaction.output_text || interaction.text)) {
                    return interaction.output_text || interaction.text;
                }
            }
        } catch (sdkError) {
            console.warn(`[Gemini SDK] @google/genai SDK notice for ${currentModel}: ${sdkError.message}. Trying direct REST endpoint...`);
        }

        // Direct REST API fallback
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
            const requestBody = {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ],
                generationConfig: {
                    maxOutputTokens,
                    temperature: 0.4,
                    ...(jsonMode && { responseMimeType: 'application/json' })
                }
            };

            if (systemInstruction) {
                requestBody.systemInstruction = {
                    parts: [{ text: systemInstruction }]
                };
            }

            const response = await axios.post(url, requestBody, {
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            });

            const candidates = response.data?.candidates;
            if (candidates && candidates.length > 0) {
                const text = candidates[0]?.content?.parts?.[0]?.text;
                if (text) {
                    return text;
                }
            }
        } catch (restError) {
            console.warn(`[Gemini REST] Model ${currentModel} failed: ${restError.response?.data?.error?.message || restError.message}`);
            lastError = restError;
        }
    }

    throw lastError || new Error('[Gemini] All Gemini models failed to generate a response.');
};

/**
 * Generate a JSON object from a prompt.
 */
const generateJSON = async (prompt, options = {}) => {
    const text = await generate(prompt, { ...options, jsonMode: true });
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
        throw new Error(`[Gemini] Response was not valid JSON: ${text.substring(0, 200)}`);
    }
};

/**
 * Generate a plain text summary or analysis.
 */
const generateText = async (prompt, systemInstruction = null, maxOutputTokens = 4096) => {
    return await generate(prompt, { systemInstruction, maxOutputTokens });
};

module.exports = {
    generate,
    generateJSON,
    generateText,
    GEMINI_MODEL,
    GEMINI_MODELS
};
