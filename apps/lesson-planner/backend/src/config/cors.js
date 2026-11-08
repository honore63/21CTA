/**
 * CORS Configuration and Origin Verification
 */

const isOriginAllowed = (origin) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return true;

    const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();

    // Environment variables (CORS_ORIGIN, FRONTEND_URL, ALLOWED_ORIGINS)
    const envOrigins = [
        process.env.CORS_ORIGIN,
        process.env.FRONTEND_URL,
        ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
    ]
        .filter(Boolean)
        .flatMap(item => item.split(',').map(s => s.trim()))
        .filter(Boolean);

    if (envOrigins.includes('*')) return true;

    if (envOrigins.some(allowed => allowed.replace(/\/$/, '').toLowerCase() === normalizedOrigin)) {
        return true;
    }

    // Allowed domain patterns
    const allowedPatterns = [
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        /\.onrender\.com$/,
        /\.vercel\.app$/,
        /\.nexastack\.net$/,
        /^https:\/\/nexastack\.net$/
    ];

    return allowedPatterns.some(pattern => pattern.test(normalizedOrigin));
};

const corsOptions = {
    origin: function (origin, callback) {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
};

module.exports = {
    isOriginAllowed,
    corsOptions
};
