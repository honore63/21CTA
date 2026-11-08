const { pool } = require('../config/database');
const { sendPaymentNotification, sendUserPaymentConfirmation } = require('./emailService');

// Initialize email queue table if not exists
const initializeEmailQueue = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_queue (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email_type VARCHAR(50) NOT NULL,
                recipient_email VARCHAR(255) NOT NULL,
                recipient_name VARCHAR(255),
                plan VARCHAR(50),
                transaction_id VARCHAR(255),
                user_id INT,
                subject VARCHAR(255),
                status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
                retry_count INT DEFAULT 0,
                max_retries INT DEFAULT 5,
                last_error TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Email queue table initialized');
    } catch (error) {
        console.error('❌ Error initializing email queue table:', error.message);
    }
};

// Add email to queue
const queueEmail = async (emailType, recipientEmail, recipientName, data = {}) => {
    try {
        const { plan, transaction_id, user_id, subject } = data;
        await pool.query(`
            INSERT INTO email_queue (
                email_type, recipient_email, recipient_name, plan, 
                transaction_id, user_id, subject
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [emailType, recipientEmail, recipientName, plan, transaction_id, user_id, subject]);
        
        console.log(`📧 Queued ${emailType} email to ${recipientEmail}`);
    } catch (error) {
        console.error('❌ Error queueing email:', error.message);
    }
};

// Process email queue with retry logic
const processEmailQueue = async () => {
    try {
        const [pendingEmails] = await pool.query(`
            SELECT * FROM email_queue 
            WHERE status = 'pending' AND retry_count < max_retries
            ORDER BY created_at ASC
            LIMIT 10
        `);

        if (pendingEmails.length === 0) {
            return; // No pending emails
        }

        console.log(`\ud83d\udce7 Processing ${pendingEmails.length} pending emails...`);

        for (const email of pendingEmails) {
            try {
                let result = false;

                console.log(`\ud83d\udce7 [Email ${email.id}] Type: ${email.email_type}, To: ${email.recipient_email}, Attempt: ${email.retry_count + 1}/${email.max_retries}`);

                if (email.email_type === 'payment_admin_notification') {
                    await sendPaymentNotification(
                        email.recipient_name,
                        email.recipient_email,
                        email.plan,
                        email.transaction_id,
                        email.user_id
                    );
                    result = true;
                } else if (email.email_type === 'payment_user_confirmation') {
                    await sendUserPaymentConfirmation(
                        email.recipient_name,
                        email.recipient_email,
                        email.plan
                    );
                    result = true;
                }

                if (result) {
                    // Mark as sent
                    await pool.query(
                        'UPDATE email_queue SET status = ?, updated_at = NOW() WHERE id = ?',
                        ['sent', email.id]
                    );
                    console.log(`\u2705 [Email ${email.id}] Sent successfully to ${email.recipient_email}`);
                }
            } catch (error) {
                // Increment retry count and store error
                const newRetryCount = email.retry_count + 1;
                const newStatus = newRetryCount >= email.max_retries ? 'failed' : 'pending';
                const errorMsg = error.message || 'Unknown error';
                
                await pool.query(
                    'UPDATE email_queue SET retry_count = ?, status = ?, last_error = ?, updated_at = NOW() WHERE id = ?',
                    [newRetryCount, newStatus, errorMsg.substring(0, 500), email.id]
                );
                
                if (newStatus === 'failed') {
                    console.error(`\u274c [Email ${email.id}] FAILED after ${newRetryCount} attempts. Error: ${errorMsg}`);
                } else {
                    console.warn(`\u26a0\ufe0f [Email ${email.id}] Retry ${newRetryCount}/${email.max_retries} failed. Will retry later. Error: ${errorMsg}`);
                }
            }
        }
    } catch (error) {
        console.error('\u274c Error processing email queue:', error.message);
    }
};

// Check email configuration
const checkEmailConfiguration = async () => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    const config = {
        emailConfigured: !!(emailUser && emailPass),
        emailUser: emailUser ? '✅ SET' : '❌ NOT SET',
        emailPass: emailPass ? '✅ SET' : '❌ NOT SET',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        message: ''
    };

    if (!emailUser || !emailPass) {
        config.message = '⚠️ EMAIL_USER or EMAIL_PASS not configured. Emails will fail!';
    } else {
        config.message = '✅ Email configuration detected.';
    }

    return config;
};

// Get email queue stats
const getQueueStats = async () => {
    try {
        const [stats] = await pool.query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM email_queue
            GROUP BY status
        `);
        
        // Also get failed email details
        const [failedEmails] = await pool.query(`
            SELECT id, recipient_email, last_error, updated_at
            FROM email_queue
            WHERE status = 'failed'
            ORDER BY updated_at DESC
            LIMIT 5
        `);
        
        return { summary: stats, failed: failedEmails };
    } catch (error) {
        console.error('❌ Error getting email stats:', error.message);
        return { summary: [], failed: [] };
    }
};

// Start email queue processor (runs every 30 seconds)
let queueProcessorInterval = null;

const startEmailQueueProcessor = () => {
    if (queueProcessorInterval) return; // Already running
    
    console.log('🚀 Starting email queue processor...');
    
    // Initial run
    processEmailQueue();
    
    // Then run every 30 seconds
    queueProcessorInterval = setInterval(() => {
        processEmailQueue();
    }, 30000);
};

const stopEmailQueueProcessor = () => {
    if (queueProcessorInterval) {
        clearInterval(queueProcessorInterval);
        queueProcessorInterval = null;
        console.log('⏹️ Email queue processor stopped');
    }
};

module.exports = {
    initializeEmailQueue,
    queueEmail,
    processEmailQueue,
    getQueueStats,
    checkEmailConfiguration,
    startEmailQueueProcessor,
    stopEmailQueueProcessor
};
