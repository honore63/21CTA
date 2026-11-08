const axios = require('axios');
const nodemailer = require('nodemailer');

/**
 * Nodemailer Transporter Helper
 */
const createTransporter = () => {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    return null;
};

/**
 * Universal Email Sender (EmailJS with Nodemailer SMTP Fallback)
 */
const sendEmail = async (options) => {
    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (serviceId && templateId && publicKey) {
        try {
            const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                accessToken: privateKey, // Required for server-side calls
                template_params: {
                    to_email: options.email,
                    subject: options.subject,
                    message_html: options.html, // Use {{{message_html}}} in your EmailJS template
                    to_name: options.to_name || 'Teacher'
                }
            });

            console.log(`✅ Email sent successfully via EmailJS API to ${options.email}`);
            return response.data;
        } catch (error) {
            console.warn(`⚠️ EmailJS API error for ${options.email}, attempting Nodemailer fallback:`, error.response?.data || error.message);
        }
    }

    const transporter = createTransporter();
    if (transporter) {
        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || '21st Century Lesson Plan Generator'}" <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            html: options.html
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully via Nodemailer SMTP to ${options.email}`);
        return info;
    }

    console.error('❌ Neither EmailJS nor Nodemailer configuration is available or working');
    throw new Error('Email configuration missing or non-functional');
};

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Welcome Email
// ─────────────────────────────────────────────────────────────────────────────
const getWelcomeTemplate = (full_name, school_name) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to 21st Century Lesson Plan Generator</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans', 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1a6b5a;padding:48px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;line-height:1.2;">Welcome, ${full_name}! 🎉</h1>
              <p style="margin:12px 0 0;color:#e8f4f1;font-size:16px;line-height:1.6;">Your AI-powered teaching workspace is ready.</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${school_name ? `<div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:12px;padding:16px 20px;margin-bottom:32px;text-align:center;">
                <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">🏫 Registered from: <strong style="color:#15803d;">${school_name}</strong></p>
              </div>` : ''}
              
              <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 32px;">Transform your teaching experience with these tools:</p>
              
              <!-- Features Grid -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 8px 16px 0;" width="50%">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;">
                      <div style="font-size:24px;margin-bottom:8px;">⚡</div>
                      <h3 style="margin:0 0 8px;color:#111827;font-size:14px;font-weight:700;">AI Lesson Plans</h3>
                      <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Generate REB-standard 5Es plans in seconds.</p>
                    </div>
                  </td>
                  <td style="padding:0 0 16px 8px;" width="50%">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center;">
                      <div style="font-size:24px;margin-bottom:8px;">📚</div>
                      <h3 style="margin:0 0 8px;color:#111827;font-size:14px;font-weight:700;">CBC Curriculum</h3>
                      <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.5;">Aligned with Rwandan curricula.</p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <div style="text-align:center;margin:32px 0 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                   style="display:inline-block;background:#1a6b5a;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:8px;">
                  🚀 Go to My Workspace
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:32px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">21st Century Lesson Plan Generator · Kigali, Rwanda</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Password Reset Email
// ─────────────────────────────────────────────────────────────────────────────
const getPasswordResetTemplate = (full_name, resetUrl) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans', 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1a6b5a;padding:40px;text-align:center;">
              <div style="font-size:32px;margin-bottom:12px;">🔐</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Password Reset Request</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#111827;font-size:16px;font-weight:600;margin:0 0 16px;">Hello ${full_name},</p>
              <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 32px;">We received a request to reset your password. Click the button below to continue. This link will expire in <strong>5 minutes</strong>.</p>
              
              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 32px;">
                <a href="${resetUrl}" 
                   style="display:inline-block;background:#1a6b5a;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 40px;border-radius:8px;">
                  Reset My Password
                </a>
              </div>
              
              <!-- Fallback Link -->
              <p style="margin:0 0 6px;color:#475569;font-size:13px;">Didn't request this? <a href="mailto:${process.env.EMAIL_USER}" style="color:#818cf8;text-decoration:none;">Contact support</a></p>
              <p style="margin:0;color:#334155;font-size:12px;">21st Century Lesson Plan Generator &middot; Kigali, Rwanda</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Admin Security Alert (device abuse)
// ─────────────────────────────────────────────────────────────────────────────
const getAdminAlertTemplate = (existingUser, newAttemptEmail, fingerprint, ip) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;background:#f8fafc;">
    <tr><td align="center">
      <table width="600" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#dc2626;padding:40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Security Alert</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="color:#4b5563;margin:0 0 24px;font-size:15px;">A new registration was blocked because the device already has an account.</p>
          <div style="background:#f9fafb;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:16px;">
            <p style="margin:0 0 8px;color:#111827;font-size:14px;"><strong>Tried Email:</strong> ${newAttemptEmail}</p>
            <p style="margin:0 0 8px;color:#111827;font-size:14px;"><strong>Existing Account:</strong> ${existingUser.email}</p>
            <p style="margin:0 0 8px;color:#111827;font-size:14px;"><strong>IP:</strong> ${ip}</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Custom Message Email
// ─────────────────────────────────────────────────────────────────────────────
const getCustomMessageTemplate = (full_name, message_subject, message_content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${message_subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans', 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1a6b5a;padding:40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Message from Admin</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">Hello ${full_name},</p>
              
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:32px;margin-bottom:24px;">
                <h2 style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:700;">${message_subject}</h2>
                <div style="color:#374151;font-size:15px;line-height:1.8;white-space: pre-wrap;">${message_content}</div>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:32px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">21st Century Lesson Plan Generator · Kigali, Rwanda</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Payment Notification (To Admin)
// ─────────────────────────────────────────────────────────────────────────────
const getPaymentNotificationTemplate = (userName, userEmail, plan, transactionId, userId) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#1a6b5a;padding:32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">New Payment Proof Received 💰</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#374151;">
              <p style="margin:0 0 16px;">Hello Admin,</p>
              <p style="margin:0 0 24px;">A user has submitted a payment proof for the <strong>${plan.toUpperCase()}</strong> plan.</p>
              
              <div style="background:#f9fafb;padding:24px;border-radius:12px;margin:0 0 32px;border:1px solid #e2e8f0;">
                <p style="margin:0 0 8px;font-size:14px;"><strong>User:</strong> ${userName} (${userEmail})</p>
                <p style="margin:0 0 8px;font-size:14px;"><strong>Plan:</strong> ${plan.toUpperCase()}</p>
                <p style="margin:0;font-size:14px;"><strong>Transaction ID:</strong> ${transactionId || 'N/A'}</p>
              </div>

              <div style="text-align:center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/users/${userId}" 
                   style="display:inline-block;background:#1a6b5a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
                  Manage User
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: User Payment Confirmation (To User)
// ─────────────────────────────────────────────────────────────────────────────
const getUserPaymentConfirmationTemplate = (userName, plan) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);border:1px solid #e2e8f0;">
          <tr>
            <td style="background:#1a6b5a;padding:48px 40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:16px;">📜</div>
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Proof Received!</h1>
              <p style="color:#e8f4f1;margin:8px 0 0;font-size:15px;">We're reviewing your payment request.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;color:#374151;">
              <p style="font-size:16px;font-weight:600;margin:0 0 16px;">Hello ${userName},</p>
              <p style="font-size:15px;line-height:1.6;margin-bottom:24px;">Thank you for submitting your payment proof for the <strong>${plan.toUpperCase()}</strong> plan. Our team is currently verifying the transaction.</p>
              
              <div style="background:#f0fdf4;border-radius:12px;padding:24px;border:1px solid #dcfce7;">
                <p style="margin:0;font-size:14px;color:#166534;font-weight:600;">Current Status: Pending Review</p>
                <p style="margin:8px 0 0;font-size:13px;color:#15803d;line-height:1.5;">Activation typically takes between 5 to 15 minutes. You will receive another email once your plan is active.</p>
              </div>

              <div style="text-align:center;margin-top:40px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
                   style="display:inline-block;background:#1a6b5a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
                  Go to Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;text-align:center;background:#f9fafb;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">21st Century Lesson Plan Generator · Kigali, Rwanda</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ─────────────────────────────────────────────────────────────────────────────
// Main send function
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Named helpers
// ─────────────────────────────────────────────────────────────────────────────

const sendWelcomeEmail = async (user) => {
    await sendEmail({
        email: user.email,
        subject: '🎉 Welcome to 21st Century Lesson Plan Generator!',
        html: getWelcomeTemplate(user.full_name, user.school_name),
        to_name: user.full_name
    });
};

const sendPasswordResetEmail = async (user, resetUrl) => {
    await sendEmail({
        email: user.email,
        subject: '🔐 Reset Your Password - LessonPlan AI',
        html: getPasswordResetTemplate(user.full_name, resetUrl),
        to_name: user.full_name
    });
};

const sendAdminSecurityAlert = async (existingUser, newAttemptEmail, fingerprint, ip) => {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    await sendEmail({
        email: adminEmail,
        subject: '🚨 Security Alert: Multi-Account Registration Blocked',
        html: getAdminAlertTemplate(existingUser, newAttemptEmail, fingerprint, ip),
        to_name: 'Admin'
    });
};

const sendCustomEmail = async (user, subject, message) => {
    await sendEmail({
        email: user.email,
        subject: subject,
        html: getCustomMessageTemplate(user.full_name, subject, message),
        to_name: user.full_name
    });
};

const sendPaymentNotification = async (userName, userEmail, plan, transactionId, userId) => {
    const admins = ['hodaliroger1@gmail.com', 'tuyishimehonore63@gmail.com'];
    
    try {
        for (const admin of admins) {
            await sendEmail({
                email: admin,
                subject: `💰 New Payment Proof: ${userName} (${plan.toUpperCase()})`,
                html: getPaymentNotificationTemplate(userName, userEmail, plan, transactionId, userId),
                to_name: 'Admin'
            });
        }
        console.log('✅ Admin payment notification sent.');
        return true;
    } catch (err) {
        console.error('❌ Failed to send admin payment notification:', err.message);
        throw err;
    }
};

const sendUserPaymentConfirmation = async (userName, userEmail, plan) => {
    try {
        await sendEmail({
            email: userEmail,
            subject: `📜 Payment Proof Received: ${plan.toUpperCase()} Plan`,
            html: getUserPaymentConfirmationTemplate(userName, plan),
            to_name: userName
        });
        console.log(`✅ Payment confirmation sent to user: ${userEmail}`);
        return true;
    } catch (err) {
        console.error('❌ Failed to send user payment confirmation:', err.message);
        throw err;
    }
};



// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE: Scheduled Maintenance Notification
// ─────────────────────────────────────────────────────────────────────────────
const getMaintenanceTemplate = (full_name) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scheduled Maintenance Notice - 21st Century Lesson Plan System</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans', 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:#1a6b5a;padding:40px 32px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.18);padding:14px 22px;border-radius:50px;margin-bottom:16px;">
                <span style="font-size:32px;line-height:1;">🛠️</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">Scheduled System Maintenance</h1>
              <p style="margin:8px 0 0;color:#e8f4f1;font-size:15px;">21st Century Lesson Plan Generator</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <p style="color:#111827;font-size:16px;font-weight:600;margin:0 0 16px;">Dear ${full_name || 'Teacher'},</p>
              
              <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">
                We are writing to inform you that our system will undergo scheduled system maintenance to upgrade platform infrastructure and enhance your AI lesson planning performance.
              </p>
              
              <!-- Time Banner -->
              <div style="background:#fffbeb;border:1px solid #fef3c7;border-left:4px solid #f59e0b;border-radius:12px;padding:20px;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:top;width:36px;">
                      <span style="font-size:22px;">⏰</span>
                    </td>
                    <td>
                      <h3 style="margin:0 0 4px;color:#92400e;font-size:15px;font-weight:700;">Maintenance Time Window</h3>
                      <p style="margin:0;color:#b45309;font-size:18px;font-weight:700;">14h00 – 21h00 (CAT)</p>
                      <p style="margin:4px 0 0;color:#78350f;font-size:13px;">The system may be temporarily unreachable or slow during this period.</p>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">
                We <strong>sincerely apologize for any inconvenience or downtime</strong> this maintenance may cause during your preparation schedule.
              </p>
              
              <!-- Inquiries Banner -->
              <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:12px;padding:20px;margin-bottom:28px;">
                <p style="margin:0;color:#166534;font-size:14px;line-height:1.6;">
                  💬 <strong>Have questions or need assistance?</strong><br>
                  Please don't hesitate to reply directly to this email. Our support team is happy to help you with any inquiries!
                </p>
              </div>
              
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">
                Thank you for your understanding and dedication to digital education.<br><br>
                Warm regards,<br>
                <strong style="color:#111827;">The 21st Century Lesson Plan Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 4px;color:#4b5563;font-size:13px;font-weight:600;">21st Century Lesson Plan Generator</p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">Empowering Rwandan Educators · Kigali, Rwanda</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const sendMaintenanceEmail = async (user) => {
    try {
        await sendEmail({
            email: user.email,
            subject: '🔧 Scheduled Maintenance Notice (14h00 - 21h00)',
            html: getMaintenanceTemplate(user.full_name),
            to_name: user.full_name
        });
        console.log(`✅ Maintenance email sent to ${user.email}`);
        return true;
    } catch (err) {
        console.error(`❌ Failed to send maintenance email to ${user.email}:`, err.message);
        throw err;
    }
};

module.exports = { 
    sendEmail, 
    sendWelcomeEmail, 
    sendPasswordResetEmail, 
    sendAdminSecurityAlert,
    sendCustomEmail,
    sendPaymentNotification,
    sendUserPaymentConfirmation,
    sendMaintenanceEmail,
    getMaintenanceTemplate
};
