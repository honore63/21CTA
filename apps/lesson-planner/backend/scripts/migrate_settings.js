const mysql = require('mysql2/promise');
require('dotenv').config();

const up = async () => {
    try {
        console.log('Connecting to database:', process.env.DB_NAME);

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || '21cta',
            multipleStatements: true
        });

        console.log('Creating settings table...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                \`value\` TEXT NOT NULL,
                \`type\` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
                \`description\` TEXT,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Insert default AI settings if they don't exist
        const defaultSettings = [
            ['ai_default_provider', 'gemini', 'string', 'Default AI provider for lesson plan generation (gemini or groq)'],
            ['ai_temperature', '0.7', 'number', 'Creativity level of AI responses (0.0 to 1.0)'],
            ['system_maintenance_mode', 'false', 'boolean', 'Whether the system is in maintenance mode']
        ];

        for (const setting of defaultSettings) {
            // Use INSERT IGNORE to skip existing keys
            await connection.execute(
                'INSERT IGNORE INTO settings (`key`, `value`, `type`, `description`) VALUES (?, ?, ?, ?)',
                setting
            );
        }

        console.log('Settings table created successfully');
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

up();
