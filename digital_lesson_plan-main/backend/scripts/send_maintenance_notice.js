const { pool } = require('../src/config/database');
const { sendMaintenanceEmail } = require('../src/services/emailService');

async function sendMaintenanceNoticeToActiveUsers() {
    console.log('🚀 Starting Scheduled Maintenance Notification Dispatch...\n');

    try {
        // Query users with >= 3 generated lesson plans
        const [qualifyingUsers] = await pool.query(`
            SELECT 
                u.id, 
                u.full_name, 
                u.email, 
                COUNT(DISTINCT lp.id) AS generated_plans_count
            FROM users u
            JOIN classes c ON c.teacher_id = u.id
            JOIN class_subjects cs ON cs.class_id = c.id
            JOIN units un ON un.class_subject_id = cs.id
            JOIN lessons l ON l.unit_id = un.id
            JOIN lesson_plans lp ON lp.lesson_id = l.id
            WHERE u.role != 'admin' AND (u.is_suspended IS NULL OR u.is_suspended = 0)
            GROUP BY u.id, u.full_name, u.email
            HAVING COUNT(DISTINCT lp.id) >= 3
            ORDER BY generated_plans_count DESC
        `);

        console.log(`📋 Found ${qualifyingUsers.length} qualifying registered user(s) with >= 3 lesson plans:\n`);
        console.table(qualifyingUsers.map(u => ({ ID: u.id, Name: u.full_name, Email: u.email, Plans: u.generated_plans_count })));

        if (qualifyingUsers.length === 0) {
            console.log('⚠️ No users found matching the criteria (>= 3 lesson plans).');
            process.exit(0);
        }

        let successCount = 0;
        let failCount = 0;

        console.log('\n✉️ Sending maintenance emails...\n');

        for (const user of qualifyingUsers) {
            try {
                console.log(`Sending email to ${user.full_name} (${user.email})...`);
                await sendMaintenanceEmail(user);
                successCount++;
                // Small pause between emails to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                console.error(`❌ Failed for ${user.email}:`, err.message);
                failCount++;
            }
        }

        console.log('\n========================================');
        console.log(`🎉 Dispatch Complete!`);
        console.log(`✅ Successfully sent: ${successCount}`);
        console.log(`❌ Failed: ${failCount}`);
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('💥 Error running maintenance notice dispatch:', error.message);
        process.exit(1);
    }
}

sendMaintenanceNoticeToActiveUsers();
