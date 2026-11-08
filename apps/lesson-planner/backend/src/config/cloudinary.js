const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

/**
 * Upload a file to Cloudinary
 * @param {string} filePath - Local file path (temporary)
 * @param {Object} options - Cloudinary upload options
 * @returns {Object} - Cloudinary upload result (url, public_id, etc.)
 */
const uploadFile = async (filePath, options = {}) => {
    const defaultOptions = {
        resource_type: 'auto',
        folder: 'dlp_reference_materials',
        use_filename: true,
        unique_filename: true,
    };
    const result = await cloudinary.uploader.upload(filePath, { ...defaultOptions, ...options });
    return result;
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - The public_id of the resource (e.g. "folder/filename.pdf")
 * @param {string} resourceType - 'raw' for docs, 'image' for images
 */
const deleteFile = async (publicId, resourceType = 'raw') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
        return result;
    } catch (err) {
        console.error('[Cloudinary] Delete error:', err.message);
    }
};

/**
 * Extract public_id from a Cloudinary URL (including file extension for raw resources)
 * e.g. https://res.cloudinary.com/demo/raw/upload/v123/folder/file.pdf -> folder/file.pdf
 */
const getPublicIdFromUrl = (url) => {
    try {
        const urlObj = new URL(url);
        // pathname looks like: /demo/raw/upload/v1234567/folder/file.pdf
        const parts = urlObj.pathname.split('/upload/');
        if (parts.length < 2) return null;
        // Remove the version segment (v12345/) if present
        const withoutVersion = parts[1].replace(/^v\d+\//, '');
        return withoutVersion;
    } catch (e) {
        return null;
    }
};

module.exports = { cloudinary, uploadFile, deleteFile, getPublicIdFromUrl };
