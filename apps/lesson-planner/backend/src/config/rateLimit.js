// Rate Limiting Configuration
// Prevent abuse and brute force attacks by limiting request frequency

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const crypto = require('crypto');

/**
 * Count API traffic per signed-in user when a bearer token is present, and per
 * IP for anonymous traffic. Keying authenticated traffic by user prevents one
 * busy school (many users behind a single NAT address) from locking everybody
 * out, while anonymous floods are still bounded.
 */
const apiKeyGenerator = (req) => {
  const header = req.headers && req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return `user:${crypto.createHash('sha256').update(header).digest('hex').slice(0, 24)}`;
  }
  return ipKeyGenerator(req.ip);
};

/**
 * General API rate limiter
 * @returns {import('express-rate-limit')} Rate limit middleware
 */
const createApiLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1200, // 1200 requests per user or anonymous IP per window
    keyGenerator: apiKeyGenerator,
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
    max: 20, // Limit each IP to 20 FAILED authentication attempts per windowMs
    message: {
      success: false,
      message: 'Too many failed login attempts from this IP, please try again after 15 minutes',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Successful logins and registrations must not lock out a shared school IP.
    skipSuccessfulRequests: true,
  });
};

/**
 * Rate limiter for AI/heavy computation endpoints
 * @returns {import('express-rate-limit')} Rate limit middleware
 */
const createAiLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each user (or anonymous IP) to 20 AI requests per windowMs
    keyGenerator: apiKeyGenerator,
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