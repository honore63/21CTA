const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text from different file types
 */
const extractText = async (filePath, fileType) => {
    try {
        let finalPath = filePath;

        // Fallback: If the path doesn't exist, it might be an absolute path from a different OS
        // or a path with incorrect separators (Windows vs Linux).
        if (!fs.existsSync(finalPath)) {
            // 1. Normalize all separators to forward slashes first, then pop the filename
            const fileName = filePath.replace(/\\/g, '/').split('/').pop();

            // 2. Build the correct path relative to the project root
            const projectRoot = path.join(__dirname, '../../');
            const possibleRelativePath = path.join(projectRoot, 'uploads/materials', fileName);

            if (fs.existsSync(possibleRelativePath)) {
                finalPath = possibleRelativePath;
            } else {
                // Try one more level: maybe it's just in /uploads or directly in projectRoot
                const alternativePath = path.join(projectRoot, 'uploads', fileName);
                if (fs.existsSync(alternativePath)) {
                    finalPath = alternativePath;
                } else {
                    console.warn(`[File Discovery] File not found. Tried:\n1. ${filePath}\n2. ${possibleRelativePath}\n3. ${alternativePath}`);
                    return '';
                }
            }
        }

        const dataBuffer = fs.readFileSync(finalPath);

        if (fileType === 'application/pdf') {
            const data = await pdfParse(dataBuffer);
            return data.text;
        }

        if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: dataBuffer });
            return result.value;
        }

        if (fileType === 'text/plain') {
            return dataBuffer.toString('utf8');
        }

        return '';
    } catch (error) {
        console.error('Text extraction error:', error.message);
        return '';
    }
};

module.exports = {
    extractText
};
