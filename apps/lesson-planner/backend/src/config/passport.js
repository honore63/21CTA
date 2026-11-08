const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { pool } = require('./database');
const { generateToken } = require('./jwt');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
    passReqToCallback: true
},
    async (req, accessToken, refreshToken, profile, done) => {
        try {
            const { id: googleId, displayName: full_name, emails } = profile;
            const email = emails[0].value;
            const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

            // Decode state
            let action = 'login';
            let fingerprint = null;
            if (req.query.state) {
                try {
                    const decoded = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
                    action = decoded.action;
                    fingerprint = decoded.fingerprint;
                } catch (e) {
                    console.error('Failed to decode OAuth state:', e);
                }
            }

            // Check if user already exists with this googleId
            const [existingGoogleUsers] = await pool.query(
                'SELECT * FROM users WHERE google_id = ?',
                [googleId]
            );

            if (existingGoogleUsers.length > 0) {
                const user = existingGoogleUsers[0];
                // Update fingerprint if missing
                if (fingerprint && !user.fingerprint) {
                    await pool.query('UPDATE users SET fingerprint = ? WHERE id = ?', [fingerprint, user.id]);
                }
                return done(null, user);
            }

            // Check if user exists with this email but no googleId
            const [existingEmailUsers] = await pool.query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (existingEmailUsers.length > 0) {
                const user = existingEmailUsers[0];
                // Update user with googleId and fingerprint
                await pool.query(
                    'UPDATE users SET google_id = ?, fingerprint = COALESCE(fingerprint, ?) WHERE id = ?',
                    [googleId, fingerprint || null, user.id]
                );
                user.google_id = googleId;
                return done(null, user);
            }

            // --- CRITICAL LOGIC FOR NEW USERS ---
            // If the user is trying to "Login" but they don't exist, block it
            if (action === 'login') {
                return done(null, false, { message: 'Account not found. Please Sign Up first.' });
            }

            // BLOCK MULTI-ACCOUNT CREATION VIA GOOGLE
            if (fingerprint) {
                const [deviceUsers] = await pool.query(
                    'SELECT id, email FROM users WHERE fingerprint = ?',
                    [fingerprint]
                );
                if (deviceUsers.length > 0) {
                    // Similar logic to exports.register in authController
                    return done(null, false, { 
                        message: 'Multiple accounts detected on this device. Creation restricted.' 
                    });
                }
            }

            // Only create a user if they are on the "Register" path
            const [result] = await pool.query(
                'INSERT INTO users (full_name, email, google_id, role, fingerprint, last_ip) VALUES (?, ?, ?, ?, ?, ?)',
                [full_name, email, googleId, 'teacher', fingerprint || null, ip_address]
            );

            const newUser = {
                id: result.insertId,
                full_name,
                email,
                google_id: googleId,
                role: 'teacher',
                fingerprint
            };

            return done(null, newUser);
        } catch (error) {
            return done(error, null);
        }
    }));

module.exports = passport;
