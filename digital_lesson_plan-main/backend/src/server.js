const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection, createTablesIfNotExist } = require('./config/database');
const compression = require('compression');
const errorMiddleware = require('./middleware/errorMiddleware');
const { initializeEmailQueue, startEmailQueueProcessor } = require('./services/emailQueueService');
const { configureHelmet } = require('./config/helmet');
const { createApiLimiter, createAuthLimiter, createAiLimiter } = require('./config/rateLimit');
const { connectRedis } = require('./config/redis');


// Import routes
const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const unitRoutes = require('./routes/unitRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const lessonPlanRoutes = require('./routes/lessonPlanRoutes');
const materialRoutes = require('./routes/materialRoutes');
const referenceMaterialRoutes = require('./routes/referenceMaterialRoutes');
const adminRoutes = require('./routes/adminRoutes');
const syllabusRoutes = require('./routes/syllabusRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const chatRoutes = require('./routes/chatRoutes');
const contactRoutes = require('./routes/contactRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const agentRoutes = require('./routes/agentRoutes');

// Initialize express app
const app = express();

const { corsOptions } = require('./config/cors');

// Middleware
app.use(compression()); // Compress all responses for speed
app.use(configureHelmet()); // Security headers
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Static files for frontend
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Debug Middleware
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
});

// Initialize rate limiters
const apiLimiter = createApiLimiter();
const authLimiter = createAuthLimiter();
const aiLimiter = createAiLimiter();

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Apply stricter rate limiting to auth routes
app.use('/api/auth', authLimiter);

// Apply specific rate limiting to AI and heavy computation routes
app.use('/api/agent', aiLimiter);
app.use('/api/chat', aiLimiter);
app.use('/api/lesson-plans/generate', aiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/lesson-plans', lessonPlanRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/reference-materials', referenceMaterialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/syllabuses', syllabusRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agent', agentRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'AI-Powered Lesson Plan Management System API is running',
        timestamp: new Date().toISOString()
    });
});

// Catch-all route for frontend - MUST BE AFTER API ROUTES
app.get('*', (req, res) => {
    // If request is for an API route that doesn't exist, return 404 JSON
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: 'API Route not found' });
    }

    // Otherwise, serve index.html for frontend routing if it exists
    const indexPath = path.join(frontendPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // More professional fallback if frontend isn't built on this server
        res.status(200).json({
            success: true,
            message: 'AI-Powered Lesson Plan Management System API is live.',
            frontend_status: 'Not served from this instance (check Vercel/Netlify)',
            api_health: '/api/health'
        });
    }
});

app.use(errorMiddleware);

const PORT = parseInt(process.env.PORT, 10) || 5001;
const fs = require('fs');
const passport = require('passport');
require('./config/passport'); // Import passport strategy

const http = require('http');
const { initSocket } = require('./services/socketService');

const httpServer = http.createServer(app);
initSocket(httpServer);

const startServer = async () => {
    try {
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ Failed to connect to database.');
            process.exit(1);
        }

        // 1. Open HTTP & Socket.IO listener immediately
        const startListen = (portToTry) => {
            const currentPort = Number(portToTry);
            const server = httpServer.listen(currentPort, () => {
                const publicUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${currentPort}`;
                console.log('='.repeat(60));
                console.log('🚀 AI-Powered Lesson Plan Management System Online (Socket.IO Enabled)');
                console.log(`📡 URL: ${publicUrl}`);
                if (currentPort !== PORT) {
                    console.log(`⚠️  Note: Default port ${PORT} was occupied. Automatically listening on port ${currentPort}.`);
                }
                console.log('='.repeat(60));
            });

            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    const nextPort = currentPort + 1;
                    console.warn(`⚠️ Port ${currentPort} is in use. Retrying on port ${nextPort}...`);
                    startListen(nextPort);
                } else {
                    console.error('❌ Server error:', err);
                }
            });
        };

        startListen(PORT);

        // 2. Run migrations and verify tables in background
        await createTablesIfNotExist();


        const { pool } = require('./config/database');
        // SAFETY GUARD (Phase 2 remediation, 2026-11-08):
        // Schema changes are NEVER applied automatically at startup. The previous
        // implementation could DROP every non-view table when the seed user
        // (users.id = 2) was missing or a query failed. That behaviour is removed
        // permanently. Apply reviewed migrations or a verified backup instead.
        try {
            const [users] = await pool.query('SELECT id FROM users WHERE id = 2 LIMIT 1');
            const [lessonsTable] = await pool.query("SHOW TABLES LIKE 'lessons'");
            const [materialsTable] = await pool.query("SHOW TABLES LIKE 'lesson_materials'");

            const missingTables = [];
            if (lessonsTable.length === 0) missingTables.push('lessons');
            if (materialsTable.length === 0) missingTables.push('lesson_materials');

            if (missingTables.length > 0) {
                console.error(`❌ Database schema incomplete. Missing tables: ${missingTables.join(', ')}`);
                console.error('   Automatic schema repair is DISABLED by design.');
                console.error('   Restore from a verified backup or apply reviewed migrations, then restart.');
            } else if (users.length === 0) {
                console.warn('⚠️  Seed user id=2 not found. No automatic repair will be attempted.');
            } else {
                console.log('✅ Database is healthy and data is present.');
            }
        } catch (dbCheckError) {
            console.error('❌ Database health check failed:', dbCheckError.message);
            console.error('   Automatic schema repair is DISABLED by design. Verify connectivity and schema manually.');
        }

        // Check for is_suspended column specifically (Incremental Migration for User Management)
        try {
            const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'is_suspended'");
            if (columns.length === 0) {
                console.log('🔄 Adding missing is_suspended column to users table...');
                await pool.query('ALTER TABLE users ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT FALSE');
                console.log('✅ Column is_suspended added successfully.');
            }
        } catch (colError) {
            console.error('❌ Failed to check/add is_suspended column:', colError.message);
        }

        // Check for google_id column specifically
        try {
            const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'google_id'");
            if (columns.length === 0) {
                console.log('🔄 Adding google_id column to users table...');
                await pool.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE AFTER email');
                // Also make password_hash nullable for google users
                await pool.query('ALTER TABLE users MODIFY password_hash VARCHAR(255) NULL');
                console.log('✅ google_id column added successfully.');
            }
        } catch (googleColError) {
            console.error('❌ Failed to check/add google_id column:', googleColError.message);
        }

        // Check for Reset Password columns
        try {
            const [columns] = await pool.query("SHOW COLUMNS FROM users LIKE 'reset_password_token'");
            if (columns.length === 0) {
                console.log('🔄 Adding password reset columns to users table...');
                await pool.query(`
                    ALTER TABLE users 
                    ADD COLUMN reset_password_token VARCHAR(255) NULL,
                    ADD COLUMN reset_password_expires DATETIME NULL
                `);
                console.log('✅ Password reset columns added successfully.');
            }
        } catch (resetColError) {
            console.error('❌ Failed to check/add reset columns:', resetColError.message);
        }

        // --- NEW INCREMENTAL MIGRATIONS ---

        // 1. Syllabuses Table & Normalization
        try {
            const [tables] = await pool.query("SHOW TABLES LIKE 'syllabuses'");
            if (tables.length === 0) {
                console.log('🔄 Creating syllabuses table...');
                await pool.query(`
                    CREATE TABLE syllabuses (
                        id int(11) NOT NULL AUTO_INCREMENT,
                        subject_name varchar(255) NOT NULL,
                        grade_level varchar(50) DEFAULT NULL,
                        content_text longtext DEFAULT NULL,
                        structured_data longtext DEFAULT NULL,
                        created_at timestamp NOT NULL DEFAULT current_timestamp(),
                        updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
                        PRIMARY KEY (id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
            }

            // Sync: syllabus_units
            const [unitTables] = await pool.query("SHOW TABLES LIKE 'syllabus_units'");
            if (unitTables.length === 0) {
                console.log('🔄 Creating syllabus_units table...');
                await pool.query(`
                    CREATE TABLE syllabus_units (
                        id int(11) NOT NULL AUTO_INCREMENT,
                        syllabus_id int(11) NOT NULL,
                        grade_level varchar(50) DEFAULT NULL,
                        unit_number int(11) NOT NULL,
                        unit_title varchar(500) NOT NULL,
                        key_competence text DEFAULT NULL,
                        PRIMARY KEY (id),
                        FOREIGN KEY (syllabus_id) REFERENCES syllabuses(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
            }

            // Sync: syllabus_lessons
            const [lessonTables] = await pool.query("SHOW TABLES LIKE 'syllabus_lessons'");
            if (lessonTables.length === 0) {
                console.log('🔄 Creating syllabus_lessons table...');
                await pool.query(`
                    CREATE TABLE syllabus_lessons (
                        id int(11) NOT NULL AUTO_INCREMENT,
                        unit_id int(11) NOT NULL,
                        lesson_number int(11) NOT NULL,
                        lesson_title varchar(500) NOT NULL,
                        knowledge_understanding text DEFAULT NULL,
                        skills text DEFAULT NULL,
                        attitudes_values text DEFAULT NULL,
                        content_area text DEFAULT NULL,
                        learning_activities text DEFAULT NULL,
                        PRIMARY KEY (id),
                        FOREIGN KEY (unit_id) REFERENCES syllabus_units(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
            }
            console.log('✅ Normalized Syllabus storage ready.');
        } catch (err) { console.error('❌ Normalized Syllabus migration failed:', err.message); }

        // 2. Scheduling Tables
        try {
            const [tables] = await pool.query("SHOW TABLES LIKE 'teacher_schedules'");
            if (tables.length === 0) {
                console.log('🔄 Creating scheduling tables...');
                await pool.query(`
                    CREATE TABLE teacher_schedules (
                        id int(11) NOT NULL AUTO_INCREMENT,
                        teacher_id int(11) NOT NULL,
                        class_subject_id int(11) NOT NULL,
                        day_of_week enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
                        start_time time NOT NULL,
                        end_time time NOT NULL,
                        location varchar(255) DEFAULT NULL,
                        created_at timestamp NOT NULL DEFAULT current_timestamp(),
                        PRIMARY KEY (id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
                await pool.query(`
                    CREATE TABLE term_settings (
                        id int(11) NOT NULL AUTO_INCREMENT,
                        term_name varchar(50) NOT NULL,
                        start_date date NOT NULL,
                        end_date date NOT NULL,
                        is_active tinyint(1) DEFAULT 0,
                        PRIMARY KEY (id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
                await pool.query(`
                    CREATE TABLE holidays (
                        id int(11) NOT NULL AUTO_INCREMENT,
                        holiday_date date NOT NULL,
                        description varchar(255) DEFAULT NULL,
                        PRIMARY KEY (id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);
                console.log('✅ Scheduling tables created.');
            }
        } catch (err) { console.error('❌ Scheduling migration failed:', err.message); }

        // 3. Lesson Completion Columns
        try {
            const [columns] = await pool.query("SHOW COLUMNS FROM lessons LIKE 'is_completed'");
            if (columns.length === 0) {
                console.log('🔄 Adding completion columns to lessons table...');
                await pool.query('ALTER TABLE lessons ADD COLUMN is_completed TINYINT(1) DEFAULT 0');
                await pool.query('ALTER TABLE lessons ADD COLUMN teacher_reflection TEXT DEFAULT NULL');
                console.log('✅ Lesson completion columns added.');
            }
        } catch (err) { console.error('❌ Lesson completion migration failed:', err.message); }

        // 5. Subscriptions Table
        try {
            const [subTable] = await pool.query("SHOW TABLES LIKE 'subscriptions'");
            if (subTable.length === 0) {
                console.log('🔄 Creating subscriptions table...');
                await pool.query(`
                    CREATE TABLE subscriptions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL UNIQUE,
                        plan ENUM('free','basic','standard','vip') NOT NULL DEFAULT 'free',
                        status ENUM('active','pending','expired','cancelled') NOT NULL DEFAULT 'active',
                        transaction_id VARCHAR(100) NULL,
                        payment_phone VARCHAR(20) NULL,
                        proof_screenshot VARCHAR(255) NULL,
                        plans_used_today INT NOT NULL DEFAULT 0,
                        total_plans_used INT NOT NULL DEFAULT 0,
                        last_reset_date DATE NULL,
                        expires_at DATETIME NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                `);
                console.log('✅ Subscriptions table created.');
            } else {
                // Incremental migration for usage columns if table already exists
                const [cols] = await pool.query("SHOW COLUMNS FROM subscriptions LIKE 'plans_used_today'");
                if (cols.length === 0) {
                    console.log('🔄 Adding usage tracking columns to subscriptions table...');
                    await pool.query(`
                        ALTER TABLE subscriptions 
                        ADD COLUMN plans_used_today INT NOT NULL DEFAULT 0,
                        ADD COLUMN total_plans_used INT NOT NULL DEFAULT 0,
                        ADD COLUMN last_reset_date DATE NULL
                    `);
                    console.log('✅ Usage tracking columns added.');
                }
            }
        } catch (err) { console.error('❌ Subscription migration failed:', err.message); }

        // Ensure payment-proofs upload dir exists
        const proofsDir = path.join(__dirname, '../uploads/payment-proofs');
        if (!fs.existsSync(proofsDir)) {
            fs.mkdirSync(proofsDir, { recursive: true });
            console.log('✅ payment-proofs upload directory created.');
        }

        // 6. Chat Table Migration
        try {
            await createTablesIfNotExist();
        } catch (err) { console.error('❌ Chat migration failed:', err.message); }

        // Initialize Passport
        app.use(passport.initialize());

        // Initialize Redis connection
        await connectRedis();

        // Initialize email queue table and start processor
        await initializeEmailQueue();
        startEmailQueueProcessor();



        // Check email configuration
        const { checkEmailConfiguration } = require('./services/emailQueueService');
        const emailConfig = await checkEmailConfiguration();
        if (!emailConfig.emailConfigured) {
            console.warn('⚠️ WARNING: Email configuration incomplete!');
            console.warn(`   - EMAIL_USER: ${emailConfig.emailUser}`);
            console.warn(`   - EMAIL_PASS: ${emailConfig.emailPass}`);
            console.warn('   📧 Set these environment variables to enable email notifications.');
        }

        // Check critical environment variables
        const missingEnvVars = [];
        if (!process.env.GEMINI_API_KEY) missingEnvVars.push('GEMINI_API_KEY (AI task summaries disabled)');
        if (!process.env.CLOUDINARY_CLOUD_NAME) missingEnvVars.push('CLOUDINARY_CLOUD_NAME (file uploads use local fallback)');
        if (missingEnvVars.length > 0) {
            console.warn('⚠️  Optional env vars not set:');
            missingEnvVars.forEach(v => console.warn(`   • ${v}`));
        }






        // Log email queue status periodically
        const { getQueueStats } = require('./services/emailQueueService');
        setInterval(async () => {
            const stats = await getQueueStats();
            if (stats.length > 0) {
                console.log('📧 Email Queue Status:', stats.map(s => `${s.status}: ${s.count}`).join(' | '));
            }
        }, 120000); // Every 2 minutes

    } catch (error) {
        console.error('❌ Server startup failure:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
