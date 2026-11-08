const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool
let dbConfig;

if (process.env.DATABASE_URL || process.env.DB_URL) {
  // Parsing URL or passing directly if mysql2 supports it (it does in some versions or via separate parsing)
  // For most reliability with mysql2, we'll try to use the URL directly in createPool
  dbConfig = process.env.DATABASE_URL || process.env.DB_URL;
  console.log('🌐 Using database connection URL for pool...');
} else {
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '21cta',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    multipleStatements: true
  };
}

// Add SSL config if required (needed for Aiven)
if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

const pool = mysql.createPool(dbConfig);

// Initialize connection with less strict settings for cloud environments
pool.on('connection', (connection) => {
  // Note: 'connection' here is a raw mysql2 connection.
  // We use the callback style to avoid promise wrapper issues in the event listener.
  connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))", (err) => {
    if (err) {
      console.warn('⚠️ Could not adjust sql_mode for new connection:', err.message);
    }
  });
});

// Test database connection and ensure DB exists
const testConnection = async () => {
    try {
        // If we're using a URL, we skip the auto-creation logic as hosted DBs usually already exist
        // and we might not have permissions to CREATE DATABASE on the server root
        if (!(process.env.DATABASE_URL || process.env.DB_URL)) {
            // First, try a simple connection without a database to see if MySQL is even running
            // and create the database if it doesn't exist
            const connectionConfig = {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                multipleStatements: true
            };

            if (process.env.DB_SSL === 'true' || process.env.DB_HOST?.includes('render.com')) {
                connectionConfig.ssl = { rejectUnauthorized: false };
            }

            try {
                const tempConn = await mysql.createConnection(connectionConfig);
                await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || '21cta'}\``);
                await tempConn.end();
            } catch (createDbErr) {
                // If this fails, it might be because the user doesn't have permissions, 
                // but if the DB already exists, the pool connection below will still work.
                console.warn('⚠️ Could not verify/create database:', createDbErr.message);
            }
        }

        // Now test the pool connection
        const connection = await pool.getConnection();
        // Relax strict mode for this session
        await connection.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
        console.log('✅ Database connected successfully (Strict mode relaxed)');
        connection.release();
        return true;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Database connection failed: Connection Refused. Is MySQL/XAMPP running?');
        } else {
            console.error('❌ Database connection failed:', error.message);
        }
        return false;
    }
};

const createTablesIfNotExist = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('📦 Checking for required tables...');
    
    // Create chat_sessions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) DEFAULT 'New Conversation',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create chats
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_id INT DEFAULT NULL,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        context_type VARCHAR(50) DEFAULT NULL,
        context_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_session_id (session_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    // Attempt to add session_id if table already existed without it
    try {
        await connection.query('ALTER TABLE chats ADD COLUMN session_id INT DEFAULT NULL');
        // If we succeeded, try adding index and foreign key
        await connection.query('CREATE INDEX idx_session_id ON chats(session_id)');
    } catch(e) {
        // Column likely exists already, ignore
    }

    // Create contact_messages
    await connection.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('unread', 'read') DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Add phone_number to users if it doesn't exist
    try {
        const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'phone_number'");
        if (columns.length === 0) {
            console.log('📱 Adding phone_number column to users table...');
            await connection.query("ALTER TABLE users ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL AFTER email");
            await connection.query("ALTER TABLE users ADD CONSTRAINT idx_phone_unique UNIQUE (phone_number)");
            console.log('✅ phone_number column added with unique constraint.');
        }
    } catch (err) {
        console.warn('⚠️ Could not migrate users table for phone_number:', err.message);
    }

    // Add subscription tracking columns if they don't exist
    try {
        const [rows] = await connection.query("SHOW TABLES LIKE 'subscriptions'");
        if (rows.length > 0) {
            const [columns] = await connection.query("SHOW COLUMNS FROM subscriptions");
            const columnNames = columns.map(c => c.Field);
            
            if (!columnNames.includes('last_reset_date')) {
                console.log('📅 Adding last_reset_date to subscriptions...');
                await connection.query("ALTER TABLE subscriptions ADD COLUMN last_reset_date DATE DEFAULT NULL");
            }
            if (!columnNames.includes('plans_used_today')) {
                console.log('📊 Adding plans_used_today to subscriptions...');
                await connection.query("ALTER TABLE subscriptions ADD COLUMN plans_used_today INT DEFAULT 0");
            }
            if (!columnNames.includes('total_plans_used')) {
                console.log('📈 Adding total_plans_used to subscriptions...');
                await connection.query("ALTER TABLE subscriptions ADD COLUMN total_plans_used INT DEFAULT 0");
            }
            if (!columnNames.includes('requested_plan')) {
                console.log('📝 Adding requested_plan to subscriptions...');
                await connection.query("ALTER TABLE subscriptions ADD COLUMN requested_plan VARCHAR(50) DEFAULT NULL");
            }
        } else {
            // Create the table if it doesn't exist at all
            console.log('📦 Creating subscriptions table...');
            await connection.query(`
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    plan ENUM('free', 'basic', 'standard', 'vip') DEFAULT 'free',
                    status ENUM('active', 'pending', 'expired', 'cancelled') DEFAULT 'active',
                    plans_used_today INT DEFAULT 0,
                    total_plans_used INT DEFAULT 0,
                    last_reset_date DATE DEFAULT NULL,
                    transaction_id VARCHAR(255) DEFAULT NULL,
                    phone VARCHAR(20) DEFAULT NULL,
                    proof_url TEXT DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY idx_user (user_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
        }
    } catch (err) {
        console.warn('⚠️ Could not migrate subscriptions table:', err.message);
    }

    // Ensure special_needs_learners table exists with correct schema
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS special_needs_learners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lesson_id INT NOT NULL,
                type_of_need VARCHAR(100) NOT NULL,
                number_of_learners INT NOT NULL DEFAULT 1,
                accommodations TEXT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_lesson_id (lesson_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Migration: transition from old 'type' to 'type_of_need'
        const [typeOfNeedCols] = await connection.query("SHOW COLUMNS FROM special_needs_learners LIKE 'type_of_need'");
        const [typeCols] = await connection.query("SHOW COLUMNS FROM special_needs_learners LIKE 'type'");

        if (typeOfNeedCols.length === 0) {
            console.log('🔧 Migrating special_needs_learners: adding type_of_need...');
            await connection.query("ALTER TABLE special_needs_learners ADD COLUMN type_of_need VARCHAR(100) NOT NULL DEFAULT '' AFTER lesson_id");
        }

        if (typeCols.length > 0) {
            console.log('📦 Migrating data from old "type" to "type_of_need"...');
            await connection.query("UPDATE special_needs_learners SET type_of_need = `type` WHERE type_of_need = '' OR type_of_need IS NULL");
            console.log('🗑️ Dropping deprecated "type" column...');
            await connection.query("ALTER TABLE special_needs_learners DROP COLUMN `type` ");
        }
    } catch (err) {
        console.warn('⚠️ Could not migrate special_needs_learners:', err.message);
    }

    // Ensure visitors table exists for traffic logs
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS visitors (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ip_address VARCHAR(45) DEFAULT NULL,
                browser VARCHAR(255) DEFAULT NULL,
                device VARCHAR(50) DEFAULT 'desktop',
                os VARCHAR(255) DEFAULT NULL,
                page_path VARCHAR(255) DEFAULT '/',
                referrer TEXT DEFAULT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_timestamp (timestamp)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ Visitors table verified.');
    } catch (err) {
        console.warn('⚠️ Could not create visitors table:', err.message);
    }

    // Ensure system_settings table exists for global config (promo mode, etc.)
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT DEFAULT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log('✅ System settings table verified.');
    } catch (err) {
        console.warn('⚠️ Could not create system_settings table:', err.message);
    }

    // Add Cloudinary columns to reference_materials if they don't exist
    try {
        const [fileUrlCol] = await connection.query("SHOW COLUMNS FROM reference_materials LIKE 'file_url'");
        if (fileUrlCol.length === 0) {
            await connection.query("ALTER TABLE reference_materials ADD COLUMN file_url TEXT DEFAULT NULL");
            await connection.query("ALTER TABLE reference_materials ADD COLUMN cloudinary_public_id VARCHAR(500) DEFAULT NULL");
            console.log('✅ Cloudinary columns added to reference_materials.');
        }
    } catch (err) {
        console.warn('⚠️ Could not add Cloudinary columns to reference_materials:', err.message);
    }

    console.log('✅ Required tables verified.');
    // Bootstrap AI agent tasks table
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS agent_tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                teacher_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status ENUM('pending', 'in_progress', 'completed', 'overdue') DEFAULT 'pending',
                source_activity VARCHAR(100) DEFAULT NULL,
                due_date TIMESTAMP NULL DEFAULT NULL,
                completed_at TIMESTAMP NULL DEFAULT NULL,
                reminder_sent TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_teacher_id (teacher_id),
                INDEX idx_status (status),
                INDEX idx_due_date (due_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        // Also ensure subject_id column on syllabuses for FK-based matching.
        // On a brand-new database the syllabuses table is created later in
        // server.js, so check for it first instead of logging a false error.
        const [sylTables] = await connection.query("SHOW TABLES LIKE 'syllabuses'");
        const [sylCols] = sylTables.length > 0
            ? await connection.query("SHOW COLUMNS FROM syllabuses LIKE 'subject_id'")
            : [[]];
        if (sylTables.length > 0 && sylCols.length === 0) {
            console.log('📦 Adding subject_id FK column to syllabuses...');
            await connection.query('ALTER TABLE syllabuses ADD COLUMN subject_id INT DEFAULT NULL AFTER id');
            await connection.query('CREATE INDEX idx_syllabus_subject ON syllabuses(subject_id)');
        }
        console.log('✅ Agent tasks & syllabus FK verified.');
    } catch (err) {
        console.warn('⚠️ Could not bootstrap agent/syllabus tables:', err.message);
    }

    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Table initialization failed:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection, createTablesIfNotExist };
