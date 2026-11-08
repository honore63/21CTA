const { pool } = require('../config/database');
const path = require('path');
const fs = require('fs');

/**
 * Teaching Materials Controller
 */

// Get all materials
exports.getMaterials = async (req, res, next) => {
    try {
        const { subject_id, material_type } = req.query;

        let query = 'SELECT * FROM teaching_materials WHERE 1=1';
        const params = [];

        if (subject_id) {
            query += ' AND subject_id = ?';
            params.push(subject_id);
        }

        if (material_type) {
            query += ' AND material_type = ?';
            params.push(material_type);
        }

        // Teachers can only see their own materials and admin materials
        if (req.user.role === 'teacher') {
            query += ' AND (uploaded_by = ? OR uploader_role = ?)';
            params.push(req.user.id, 'admin');
        }

        query += ' ORDER BY created_at DESC';

        const [materials] = await pool.query(query, params);

        res.json({
            success: true,
            data: materials
        });
    } catch (error) {
        next(error);
    }
};

// Get single material
exports.getMaterial = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [materials] = await pool.query(
            'SELECT * FROM teaching_materials WHERE id = ?',
            [id]
        );

        if (materials.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        res.json({
            success: true,
            data: materials[0]
        });
    } catch (error) {
        next(error);
    }
};

// Upload material
exports.uploadMaterial = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please upload a file'
            });
        }

        const { title, subject_id, material_type, description } = req.body;

        if (!title || !material_type) {
            // Delete uploaded file if validation fails
            fs.unlinkSync(req.file.path);

            return res.status(400).json({
                success: false,
                message: 'Please provide title and material type'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO teaching_materials 
       (uploaded_by, uploader_role, title, file_path, file_type, file_size, subject_id, material_type, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                req.user.role,
                title,
                req.file.path,
                req.file.mimetype,
                req.file.size,
                subject_id || null,
                material_type,
                description || null
            ]
        );

        const [newMaterial] = await pool.query(
            'SELECT * FROM teaching_materials WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Material uploaded successfully',
            data: newMaterial[0]
        });
    } catch (error) {
        // Clean up file if error occurs
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }
        next(error);
    }
};

// Download material
exports.downloadMaterial = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [materials] = await pool.query(
            'SELECT * FROM teaching_materials WHERE id = ?',
            [id]
        );

        if (materials.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const material = materials[0];

        // Check if file exists
        if (!fs.existsSync(material.file_path)) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Send file
        res.download(material.file_path, material.title);
    } catch (error) {
        next(error);
    }
};

// Delete material
exports.deleteMaterial = async (req, res, next) => {
    try {
        const { id } = req.params;

        const [materials] = await pool.query(
            'SELECT * FROM teaching_materials WHERE id = ?',
            [id]
        );

        if (materials.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const material = materials[0];

        // Check authorization
        if (req.user.role === 'teacher' && material.uploaded_by !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Delete file from filesystem
        if (fs.existsSync(material.file_path)) {
            fs.unlinkSync(material.file_path);
        }

        // Delete from database
        await pool.query('DELETE FROM teaching_materials WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Material deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};
