// Rate Limiting Configuration
// Prevent abuse and brute force attacks by limiting request frequency

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * @returns {import('express-rate-limit')} Rate limit middleware
 */
const createApiLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again after 15 minutes',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests: false,
  });
};

/**
 * Stricter rate limiter for authentication endpoints
 * @returns {import('express-rate-limit')} Rate limit middleware
 */
const createAuthLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per windowMs
    message: {
      success: false,
      message: 'Too many login attempts from this IP, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  });
};

/**
 * Rate limiter for AI/heavy computation endpoints
 * @returns {import('express-rate-limit')} Rate limit middleware
 */
const createAiLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 AI requests per windowMs (more restrictive)
    message: {
      success: false,
      message: 'Too many AI requests from this IP, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
  });
};

module.exports = {
  createApiLimiter,
  createAuthLimiter,
  createAiLimiter,
};