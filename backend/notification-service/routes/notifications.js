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
    await sendMail({
      to: email,
      subject: 'TWZ FEMS — Activate Your Inspector Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #C0392B; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">🔥 TWZ FEMS</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0;">Fire Extinguisher Management System</p>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
            <h2 style="color: #333;">Hello, ${firstName}!</h2>
            <p style="color: #555;">Your inspector account has been created by an administrator. Use the OTP below to activate your account and set your password.</p>
            <div style="background: #f8f8f8; border: 2px dashed #C0392B; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">Your One-Time Password (OTP)</p>
              <h1 style="margin: 10px 0; color: #C0392B; font-size: 40px; letter-spacing: 8px;">${otp}</h1>
              <p style="margin: 0; color: #999; font-size: 12px;">Valid for ${process.env.OTP_EXPIRY_MINUTES || 30} minutes</p>
            </div>
            <p style="color: #555;">To activate your account:</p>
            <ol style="color: #555;">
              <li>Go to the activation page</li>
              <li>Enter your email address</li>
              <li>Enter the OTP above</li>
              <li>Set your new password</li>
            </ol>
            <p style="color: #999; font-size: 12px;">If you did not expect this email, please contact your system administrator.</p>
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
