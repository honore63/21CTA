const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const importDatabase = async () => {
    // SECURITY (Phase 2 remediation): credentials come from backend/.env only.
    // The previously hardcoded managed-MySQL credentials were exposed and must be rotated.
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingVars = requiredVars.filter((name) => !process.env[name]);
    if (missingVars.length > 0) {
        console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
        console.error('   Set them in backend/.env. Never commit real credentials.');
        process.exit(1);
    }

    if (!process.argv.includes('--confirm')) {
        console.error('❌ Refusing to import without --confirm.');
        console.error('   This script executes database/schema.sql, which contains DROP/CREATE statements.');
        console.error('   Take and verify a backup first, then re-run with --confirm.');
        process.exit(1);
    }

    const config = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
        multipleStatements: true // Required to execute a multi-statement dump
    };

    console.log('🔌 Connecting to Aiven Database...');
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected.');

        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        console.log(`ue4c2 Reading SQL file from: ${schemaPath}`);
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('🚀 Executing SQL script... This may take a moment.');
        await connection.query(sql);

        console.log('✅ Database imported successfully!');
    } catch (error) {
        console.error('❌ Error importing database:', error);
    } finally {
        if (connection) await connection.end();
    }
};

importDatabase();
