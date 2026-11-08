// Helmet.js Configuration for Enhanced Security
// Provides important security headers to protect against common web vulnerabilities

const helmet = require('helmet');

/**
 * Configure Helmet with optimized settings for this application
 * @returns {import('helmet')} Configured helmet middleware
 */
const configureHelmet = () => {
  return helmet({
    // Content Security Policy - prevent XSS attacks
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"], // Disallow inline script attributes
        connectSrc: ["'self'", 'https://api.groq.com', 'https://generativelanguage.googleapis.com'],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },

    // Prevent clickjacking by denying framing
    xFrameOptions: { action: 'deny' },

    // Allow cross-origin requests for resources (uploads, static assets)
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    // Prevent MIME type sniffing
    xContentTypeOptions: true,

    // Enable XSS protection (legacy but still useful)
    xXssProtection: true,

    // Hide powered by header
    hidePoweredBy: { setTo: 'PHP 7.4.3' },

    // Referrer policy - control referrer information
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // Permissions Policy - control browser features
    permissionsPolicy: {
      features: {
        // Deny potentially dangerous features
        accelerometer: [],
        ambientLightSensor: [],
        autoplay: [],
        battery: [],
        camera: [],
        displayCapture: [],
        documentDomain: [],
        encryptedMedia: [],
        executionWhileNotRendered: [],
        executionWhileOutOfViewport: [],
        fullscreen: ['self'],
        geolocation: [],
        gyroscope: [],
        magnetometer: [],
        microphone: [],
        midi: [],
        navigationOverride: [],
        payment: [],
        pictureInPicture: [],
        publickeyCredentialsGet: [],
        syncXhr: [],
        USB: [],
        webShare: [],
        windowManagement: [],
      },
    },

    // Expect-CT certificate transparency (optional but good practice)
    expectCt: {
      maxAge: 86400, // 24 hours
      enforce: true,
    },

    // Strict Transport Security - force HTTPS
    // Note: Only enable in production with proper SSL setup
    hsts: {
      maxAge: process.env.NODE_ENV === 'production' ? 31536000 : 0, // 1 year in production
      includeSubDomains: true,
      preload: true,
    },

    // Control how much referrer information is included in requests
    // Already handled by referrerPolicy above
  });
};

module.exports = { configureHelmet };