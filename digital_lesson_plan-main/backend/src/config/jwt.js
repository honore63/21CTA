const jwt = require('jsonwebtoken');
require('dotenv').config();

const jwtConfig = {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
};

// Generate JWT token
const generateToken = (payload) => {
    return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn
    });
};

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, jwtConfig.secret);
    } catch (error) {
        return null;
    }
};

module.exports = {
    jwtConfig,
    generateToken,
    verifyToken
};
