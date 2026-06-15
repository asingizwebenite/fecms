const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { sendMail } = require('../utils/mailer');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  next();
};

// ── Send inspector activation OTP ────────────────────────────
/**
 * @swagger
 * /api/notifications/send-otp:
 *   post:
 *     tags: [Notifications]
 *     summary: Send account activation OTP to an inspector (internal)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, otp]
 *             properties:
 *               email: { type: string }
 *               firstName: { type: string }
 *               otp: { type: string }
 *     responses:
 *       200:
 *         description: OTP email sent
 */
router.post('/send-otp', [body('email').isEmail(), body('firstName').notEmpty(), body('otp').notEmpty()], validate, async (req, res) => {
  try {
    const { email, firstName, otp } = req.body;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const activationLink = `${frontendUrl}/activate-account?email=${encodeURIComponent(email)}`;
    const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 30;

    await sendMail({
      to: email,
      subject: 'TWZ FEMS — Activate Your Inspector Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #C0392B; padding: 24px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: 1px;">TWZ FEMS</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Fire Extinguisher Management System</p>
          </div>
          <div style="background: #fff; padding: 32px 30px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1a1a2e; margin-top: 0;">Hello, ${firstName}!</h2>
            <p style="color: #555; line-height: 1.6;">Your inspector account has been created by an administrator. Click the button below to go directly to the activation page — your email will be pre-filled.</p>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${activationLink}" style="background: #C0392B; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
                Activate My Account
              </a>
            </div>

            <p style="color: #555; margin-bottom: 6px;">On the activation page, enter this OTP code:</p>
            <div style="background: #f8f8f8; border: 2px dashed #C0392B; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 24px;">
              <p style="margin: 0; color: #666; font-size: 13px;">One-Time Password</p>
              <p style="margin: 10px 0; color: #C0392B; font-size: 38px; font-weight: 800; letter-spacing: 10px;">${otp}</p>
              <p style="margin: 0; color: #999; font-size: 12px;">Valid for ${expiryMinutes} minutes</p>
            </div>

            <p style="color: #555; line-height: 1.6;">If the button above does not work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #C0392B; font-size: 13px;">${activationLink}</p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #aaa; font-size: 12px; margin: 0;">If you did not expect this email, please contact your system administrator. Do not share your OTP with anyone.</p>
          </div>
        </div>
      `,
    });
    res.json({ success: true, message: `OTP email sent to ${email}` });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send email', error: err.message });
  }
});

// ── Send password reset OTP ───────────────────────────────────
/**
 * @swagger
 * /api/notifications/send-reset-otp:
 *   post:
 *     tags: [Notifications]
 *     summary: Send password reset OTP (internal)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, otp]
 *             properties:
 *               email: { type: string }
 *               firstName: { type: string }
 *               otp: { type: string }
 *     responses:
 *       200:
 *         description: Reset OTP email sent
 */
router.post('/send-reset-otp', [body('email').isEmail(), body('firstName').notEmpty(), body('otp').notEmpty()], validate, async (req, res) => {
  try {
    const { email, firstName, otp } = req.body;
    await sendMail({
      to: email,
      subject: 'TWZ FEMS — Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #C0392B; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">🔥 TWZ FEMS</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333;">Hello, ${firstName}!</h2>
            <p style="color: #555;">We received a request to reset your password. Use the OTP below.</p>
            <div style="background: #f8f8f8; border: 2px dashed #C0392B; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">Password Reset OTP</p>
              <h1 style="margin: 10px 0; color: #C0392B; font-size: 40px; letter-spacing: 8px;">${otp}</h1>
              <p style="margin: 0; color: #999; font-size: 12px;">Valid for 30 minutes</p>
            </div>
            <p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
          </div>
        </div>
      `,
    });
    res.json({ success: true, message: `Reset OTP sent to ${email}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send email', error: err.message });
  }
});

// ── Send welcome email on account activation ─────────────────
/**
 * @swagger
 * /api/notifications/send-welcome:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a welcome email after account activation (internal)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, role]
 *             properties:
 *               email: { type: string }
 *               firstName: { type: string }
 *               role: { type: string, enum: [Admin, Inspector, User] }
 *     responses:
 *       200:
 *         description: Welcome email sent
 */
router.post('/send-welcome', [body('email').isEmail(), body('firstName').notEmpty(), body('role').notEmpty()], validate, async (req, res) => {
  try {
    const { email, firstName, role } = req.body;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const roleDescriptions = {
      Admin: 'You have full administrative access to the system.',
      Inspector: 'You can view extinguishers, conduct inspections, and log maintenance activities.',
      User: 'You can view extinguisher information, schedule inspections, and monitor compliance status.',
    };

    await sendMail({
      to: email,
      subject: 'TWZ FEMS — Welcome! Your Account is Active',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #C0392B; padding: 24px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: 1px;">TWZ FEMS</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Fire Extinguisher Management System</p>
          </div>
          <div style="background: #fff; padding: 32px 30px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1a1a2e; margin-top: 0;">Welcome, ${firstName}!</h2>
            <p style="color: #555; line-height: 1.6;">Your account has been successfully activated. You are registered as a <strong>${role}</strong>.</p>
            <p style="color: #555; line-height: 1.6;">${roleDescriptions[role] || ''}</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${frontendUrl}/login" style="background: #C0392B; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
                Log In Now
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #aaa; font-size: 12px; margin: 0;">If you did not create this account, please contact your system administrator immediately.</p>
          </div>
        </div>
      `,
    });
    res.json({ success: true, message: `Welcome email sent to ${email}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send welcome email', error: err.message });
  }
});

// ── Send generic notification email ──────────────────────────
/**
 * @swagger
 * /api/notifications/send-email:
 *   post:
 *     tags: [Notifications]
 *     summary: Send a custom notification email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to, subject, message]
 *             properties:
 *               to: { type: string }
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Email sent
 */
router.post('/send-email', [body('to').isEmail(), body('subject').notEmpty(), body('message').notEmpty()], validate, async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    await sendMail({
      to,
      subject: `TWZ FEMS — ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #C0392B; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">🔥 TWZ FEMS</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
            <p style="color: #555; white-space: pre-line;">${message}</p>
          </div>
        </div>
      `,
    });
    res.json({ success: true, message: 'Email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send email', error: err.message });
  }
});

module.exports = router;
