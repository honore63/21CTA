const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const importDatabase = async () => {
    // SECURITY (Phase 2 remediation): credentials come from backend/.env only.
    // Never commit real credentials to this file or any other tracked file.
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
    const missingVars = requiredVars.filter((name) => !process.env[name]);
    // DB_PASSWORD may legitimately be empty (for example local XAMPP root),
    // but it must be defined so we never silently fall back to a default.
    if (process.env.DB_PASSWORD === undefined) missingVars.push('DB_PASSWORD');
    if (missingVars.length > 0) {
        console.error(`[ERROR] Missing required environment variables: ${missingVars.join(', ')}`);
        console.error('   Set them in backend/.env. Never commit real credentials.');
        process.exit(1);
    }

    if (!process.argv.includes('--confirm')) {
        console.error('[ERROR] Refusing to import without --confirm.');
        console.error('   This script executes database/schema.sql, which changes schema and data.');
        console.error('   Take and verify a backup first, then re-run with --confirm.');
        process.exit(1);
    }

    const config = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || '21cta',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        multipleStatements: true // Required to execute a multi-statement dump
    };

    console.log(`[INFO] Connecting to MySQL at ${config.host}:${config.port}/${config.database} ...`);
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('[OK] Connected.');

        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        console.log(`[INFO] Reading SQL file from: ${schemaPath}`);
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('[INFO] Executing SQL script... This may take a moment.');
        await connection.query(sql);

        console.log('[OK] Database imported successfully!');
    } catch (error) {
        console.error('[ERROR] Error importing database:', error.message);
        process.exitCode = 1;
    } finally {
        if (connection) await connection.end();
    }
};

importDatabase();
