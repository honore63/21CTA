const { pool } = require('./database');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    try {
        console.log('🚀 Starting new features migration...');
        const sqlPath = path.join(__dirname, 'init_new_features.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute the multi-statement SQL
        const [result] = await pool.query(sql);
        console.log('✅ Migration completed successfully');
        
        // Optional: List the tables to verify
        const [tables] = await pool.query('SHOW TABLES');
        console.log('📦 Current Tables:', tables.map(t => Object.values(t)[0]));
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        // If some columns already exist, we might get an error. 
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
            console.log('⚠️ Some columns/indexes already exist, skipping duplicates...');
            process.exit(0);
        }
        process.exit(1);
    }
};

runMigration();
