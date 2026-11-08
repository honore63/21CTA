const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { extractText } = require('../services/fileService');
const { uploadFile, deleteFile, getPublicIdFromUrl } = require('../config/cloudinary');


/**
 * Reference Materials Controller for AI Lesson Planning
 * Files are stored on Cloudinary to survive server restarts/deployments.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Download a remote URL into a Buffer (for text extraction from Cloudinary URLs)
 */
const downloadToBuffer = (url) => new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
    }).on('error', reject);
});

/**
 * Extract text from a material record.
 * Tries extracted_text cache first, then downloads from Cloudinary URL if available.
 */
const ensureExtractedText = async (mat) => {
    if (mat.extracted_text) return mat.extracted_text;

    // Try Cloudinary URL (preferred - survives deployments)
    if (mat.file_url) {
        try {
            const buffer = await downloadToBuffer(mat.file_url);
            const mimeType = mat.file_type || 'application/pdf';
            // Write temp file for parsers that need file paths
            const tmpPath = path.join(os.tmpdir(), `dlp_tmp_${Date.now()}_${mat.id}`);
            fs.writeFileSync(tmpPath, buffer);
            const text = await extractText(tmpPath, mimeType);
            fs.unlinkSync(tmpPath);
            return text || '';
        } catch (e) {
            console.error(`[RefMaterial] Text extraction from URL failed for ${mat.id}:`, e.message);
        }
    }

    // Fallback: legacy local file_path
    if (mat.file_path) {
        return await extractText(mat.file_path, mat.file_type).catch(() => '');
    }

    return '';
};

// ─── GET endpoints ────────────────────────────────────────────────────────────

exports.getMaterials = async (req, res, next) => {
    try {
        const teacherId = req.user.id;
        const [materials] = await pool.query(
            'SELECT * FROM reference_materials WHERE teacher_id = ? ORDER BY created_at DESC',
            [teacherId]
        );
        res.json({ success: true, data: materials });
    } catch (error) {
        next(error);
    }
};

exports.getMaterialsBySubject = async (req, res, next) => {
    try {
        const teacherId = req.user.id;
        const { subject_id } = req.params;
        const [materials] = await pool.query(
            'SELECT * FROM reference_materials WHERE teacher_id = ? AND subject_id = ? ORDER BY created_at DESC',
            [teacherId, subject_id]
        );
        res.json({ success: true, data: materials });
    } catch (error) {
        next(error);
    }
};

// ─── UPLOAD ───────────────────────────────────────────────────────────────────

exports.uploadMaterial = async (req, res, next) => {
    let localTmpPath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const { title, description, subject_id } = req.body;
        const teacherId = req.user.id;
        localTmpPath = req.file.path;
        const fileType = req.file.mimetype;

        // ── 1. Upload to Cloudinary ──────────────────────────────────────────
        let cloudinaryUrl = null;
        let cloudinaryPublicId = null;

        const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name';

        if (hasCloudinary) {
            const uploadResult = await uploadFile(localTmpPath, {
                folder: 'dlp_reference_materials',
                resource_type: 'auto'
            });
            cloudinaryUrl = uploadResult.secure_url;
            cloudinaryPublicId = uploadResult.public_id;
        }

        // ── 2. Pre-extract text (fast, capped at 50k chars) ──────────────────
        let extractedText = null;
        try {
            const rawText = await Promise.race([
                extractText(localTmpPath, fileType),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
            ]);
            if (rawText) {
                extractedText = rawText.substring(0, 50000);
            }
        } catch (e) {
            console.warn('[RefMaterial] Text extraction skipped during upload:', e.message);
        }

        // ── 3. Save to database ──────────────────────────────────────────────
        // Store both URL (Cloudinary) and file_path (legacy) for backward compatibility
        const filePath = cloudinaryUrl || localTmpPath;

        // Check if file_url column exists and insert accordingly
        let insertId;
        try {
            const [result] = await pool.query(
                `INSERT INTO reference_materials
                    (teacher_id, title, description, file_path, file_url, cloudinary_public_id, file_type, subject_id, extracted_text)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [teacherId, title, description || null, localTmpPath, cloudinaryUrl, cloudinaryPublicId, fileType, subject_id || null, extractedText]
            );
            insertId = result.insertId;
        } catch (colErr) {
            // Columns might not exist yet — fallback to basic insert
            const [result] = await pool.query(
                `INSERT INTO reference_materials
                    (teacher_id, title, description, file_path, file_type, subject_id, extracted_text)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [teacherId, title, description || null, filePath, fileType, subject_id || null, extractedText]
            );
            insertId = result.insertId;
        }

        // ── 4. Clean up local temp file after successful Cloudinary upload ───
        if (cloudinaryUrl && localTmpPath && fs.existsSync(localTmpPath)) {
            fs.unlinkSync(localTmpPath);
        }

        res.status(201).json({
            success: true,
            message: cloudinaryUrl
                ? 'Material uploaded to Cloudinary and processed successfully'
                : 'Material uploaded locally and processed successfully',
            data: { id: insertId, title, file_type: fileType, file_url: cloudinaryUrl }
        });
    } catch (error) {
        // Cleanup temp file on error
        if (localTmpPath && fs.existsSync(localTmpPath)) {
            try { fs.unlinkSync(localTmpPath); } catch (_) {}
        }
        next(error);
    }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

exports.deleteMaterial = async (req, res, next) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.id;

        const [materials] = await pool.query(
            'SELECT file_path, file_url, cloudinary_public_id, file_type FROM reference_materials WHERE id = ? AND teacher_id = ?',
            [id, teacherId]
        );

        if (materials.length === 0) {
            return res.status(404).json({ success: false, message: 'Material not found or access denied' });
        }

        const mat = materials[0];

        // Delete from Cloudinary if public_id is stored
        if (mat.cloudinary_public_id) {
            await deleteFile(mat.cloudinary_public_id, 'raw').catch(e =>
                console.warn('[RefMaterial] Cloudinary delete failed (continuing):', e.message)
            );
        } else if (mat.file_url) {
            // Derive public_id from URL as fallback
            const pubId = getPublicIdFromUrl(mat.file_url);
            if (pubId) {
                await deleteFile(pubId, 'raw').catch(() => {});
            }
        }

        // Delete local file if it exists
        if (mat.file_path && fs.existsSync(mat.file_path)) {
            fs.unlinkSync(mat.file_path);
        }

        await pool.query('DELETE FROM reference_materials WHERE id = ?', [id]);

        res.json({ success: true, message: 'Material deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// ─── Lesson Attachment ────────────────────────────────────────────────────────

exports.attachToLesson = async (req, res, next) => {
    try {
        const { lesson_id, material_ids } = req.body;
        await pool.query('DELETE FROM lesson_materials WHERE lesson_id = ?', [lesson_id]);
        if (material_ids && material_ids.length > 0) {
            const values = material_ids.map(mid => [lesson_id, mid]);
            await pool.query('INSERT INTO lesson_materials (lesson_id, material_id) VALUES ?', [values]);
        }
        res.json({ success: true, message: 'Materials attached to lesson successfully' });
    } catch (error) {
        next(error);
    }
};

exports.getLessonMaterials = async (req, res, next) => {
    try {
        const { lesson_id } = req.params;
        const [materials] = await pool.query(
            `SELECT rm.* FROM reference_materials rm
             JOIN lesson_materials lm ON rm.id = lm.material_id
             WHERE lm.lesson_id = ?`,
            [lesson_id]
        );
        res.json({ success: true, data: materials });
    } catch (error) {
        next(error);
    }
};

// Export helper for use in lesson plan controller
module.exports.ensureExtractedText = ensureExtractedText;
