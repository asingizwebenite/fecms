const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  next();
};

// ── Public: Register (role = User) ──────────────────────────
/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags: [Users]
 *     summary: Register a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already exists
 */
router.post(
  '/register',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

      const user = await User.create({ firstName, lastName, email, password, role: 'User', isAccountActivated: true });
      res.status(201).json({ success: true, message: 'Account created successfully', data: user.toSafeObject() });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Admin: Create Inspector account ─────────────────────────
/**
 * @swagger
 * /api/users/inspectors:
 *   post:
 *     tags: [Users]
 *     summary: Admin creates an inspector account (sends OTP via email)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *     responses:
 *       201:
 *         description: Inspector account created, OTP sent
 */
router.post(
  '/inspectors',
  authenticate,
  authorize('Admin'),
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(409).json({ success: false, message: 'Email already registered' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 30) * 60 * 1000);
      const tempPassword = crypto.randomBytes(16).toString('hex');

      const user = await User.create({
        firstName,
        lastName,
        email,
        password: tempPassword,
        role: 'Inspector',
        isActive: false,
        isAccountActivated: false,
        otp: await bcrypt.hash(otp, 10),
        otpExpiry,
      });

      try {
        await axios.post(`${NOTIFICATION_URL}/api/notifications/send-otp`, { email, firstName, otp });
      } catch {}

      res.status(201).json({ success: true, message: `Inspector account created. OTP sent to ${email}`, data: user.toSafeObject() });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Public: Activate inspector account with OTP ──────────────
/**
 * @swagger
 * /api/users/activate-account:
 *   post:
 *     tags: [Users]
 *     summary: Activate inspector account using OTP and set new password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email: { type: string }
 *               otp: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Account activated successfully
 */
router.post(
  '/activate-account',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').notEmpty().withMessage('OTP is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const user = await User.findOne({ where: { email, role: 'Inspector' } });

      if (!user) return res.status(404).json({ success: false, message: 'Inspector account not found' });
      if (user.isAccountActivated) return res.status(400).json({ success: false, message: 'Account already activated' });
      if (!user.otp || !user.otpExpiry) return res.status(400).json({ success: false, message: 'No OTP found for this account' });
      if (new Date() > user.otpExpiry) return res.status(400).json({ success: false, message: 'OTP has expired' });

      const otpValid = await bcrypt.compare(otp, user.otp);
      if (!otpValid) return res.status(400).json({ success: false, message: 'Invalid OTP' });

      user.password = newPassword;
      user.isActive = true;
      user.isAccountActivated = true;
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      res.json({ success: true, message: 'Account activated successfully. You can now log in.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Public: Forgot password ──────────────────────────────────
/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     tags: [Users]
 *     summary: Request a password reset OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: Reset OTP sent if email exists
 */
router.post('/forgot-password', [body('email').isEmail().normalizeEmail()], validate, async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset OTP has been sent.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = await bcrypt.hash(otp, 10);
    user.resetPasswordExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    try {
      await axios.post(`${NOTIFICATION_URL}/api/notifications/send-reset-otp`, { email: user.email, firstName: user.firstName, otp });
    } catch {}

    res.json({ success: true, message: 'If that email exists, a reset OTP has been sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Public: Reset password ───────────────────────────────────
/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: Reset password using OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email: { type: string }
 *               otp: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post(
  '/reset-password',
  [body('email').isEmail().normalizeEmail(), body('otp').notEmpty(), body('newPassword').isLength({ min: 6 })],
  validate,
  async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user || !user.resetPasswordToken || new Date() > user.resetPasswordExpiry) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      const valid = await bcrypt.compare(otp, user.resetPasswordToken);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid OTP' });

      user.password = newPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpiry = null;
      await user.save();
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Authenticated: Get own profile ───────────────────────────
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'otp', 'otpExpiry', 'resetPasswordToken', 'resetPasswordExpiry'] },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Authenticated: Update own profile ────────────────────────
/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update current user profile
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.update({ firstName, lastName });
    res.json({ success: true, message: 'Profile updated', data: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Authenticated: Change password ───────────────────────────
/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     tags: [Users]
 *     summary: Change current user password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Password changed
 */
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      const match = await user.comparePassword(req.body.currentPassword);
      if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      user.password = req.body.newPassword;
      await user.save();
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Admin: List all users ─────────────────────────────────────
/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [Admin, Inspector, User] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const where = role ? { role } : {};
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'otp', 'otpExpiry', 'resetPasswordToken', 'resetPasswordExpiry'] },
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: Get user by ID ─────────────────────────────────────
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User details
 */
router.get('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'otp', 'otpExpiry', 'resetPasswordToken', 'resetPasswordExpiry'] },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: Update user role or status ────────────────────────
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user role or active status (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: string, enum: [Admin, Inspector, User] }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const update = {};
    if (role) update.role = role;
    if (typeof isActive === 'boolean') update.isActive = isActive;

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.update(update);
    res.json({ success: true, message: 'User updated', data: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: Delete user ────────────────────────────────────────
/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.destroy();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: Resend OTP to inspector ───────────────────────────
/**
 * @swagger
 * /api/users/inspectors/{id}/resend-otp:
 *   post:
 *     tags: [Users]
 *     summary: Resend activation OTP to an inspector (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OTP resent
 */
router.post('/inspectors/:id/resend-otp', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.params.id, role: 'Inspector' } });
    if (!user) return res.status(404).json({ success: false, message: 'Inspector not found' });
    if (user.isAccountActivated) return res.status(400).json({ success: false, message: 'Account already activated' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 30) * 60 * 1000);
    await user.save();

    try {
      await axios.post(`${NOTIFICATION_URL}/api/notifications/send-otp`, { email: user.email, firstName: user.firstName, otp });
    } catch {}

    res.json({ success: true, message: `OTP resent to ${user.email}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
