const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const importDatabase = async () => {
    const config = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'lessonplan_db',
        ssl: {
            rejectUnauthorized: false
        },
        multipleStatements: true // Essential for running a dump file
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
