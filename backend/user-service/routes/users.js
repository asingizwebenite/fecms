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

// Reusable strong password rule
const strongPassword = (field = 'password') =>
  body(field)
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[@$!%*?&_#\-]/).withMessage('Password must contain at least one special character (@$!%*?&_#-)');

// ── Public: Register (role = User, requires OTP activation) ────
/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags: [Users]
 *     summary: Register a new user account (Public — OTP sent to email for activation)
 *     description: |
 *       **Access:** Public (no authentication required)
 *       After registration an OTP is sent to the provided email. The account
 *       remains inactive until activated via /api/users/activate-account.
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
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Min 8 chars, must include uppercase, lowercase, number and special character
 *     responses:
 *       201:
 *         description: Account created — OTP sent to email
 *       409:
 *         description: Email already registered
 */
router.post(
  '/register',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('A valid email address is required'),
    strongPassword('password'),
  ],
  validate,
  async (req, res) => {
    try {
      const { firstName, lastName, email, password } = req.body;
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(409).json({ success: false, message: 'An account with that email already exists' });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 30) * 60 * 1000);

      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        role: 'User',
        isActive: true,
        isAccountActivated: false,
        otp: await bcrypt.hash(otp, 10),
        otpExpiry,
      });

      try {
        await axios.post(`${NOTIFICATION_URL}/api/notifications/send-otp`, { email, firstName, otp });
      } catch {}

      res.status(201).json({
        success: true,
        message: `Account created. An OTP has been sent to ${email}. Please activate your account to continue.`,
        data: user.toSafeObject(),
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Admin: Create Inspector account ─────────────────────────────
/**
 * @swagger
 * /api/users/inspectors:
 *   post:
 *     tags: [Users]
 *     summary: Create an inspector account — OTP sent via email (Admin only)
 *     description: |
 *       **Access:** Admin only
 *       Creates an inactive Inspector account and emails an OTP for account activation.
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
 *       403:
 *         description: Admin role required
 */
router.post(
  '/inspectors',
  authenticate,
  authorize('Admin'),
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().normalizeEmail().withMessage('A valid email address is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(409).json({ success: false, message: 'An account with that email already exists' });

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

// ── Public: Activate account with OTP (any role) ────────────────
/**
 * @swagger
 * /api/users/activate-account:
 *   post:
 *     tags: [Users]
 *     summary: Activate account using OTP received by email (Public)
 *     description: |
 *       **Access:** Public
 *       Used by both newly registered Users and Inspectors created by an Admin.
 *       Inspectors must also set a new password on activation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string }
 *               otp: { type: string, description: "6-digit OTP from email" }
 *               newPassword:
 *                 type: string
 *                 description: Required only for Inspector accounts
 *     responses:
 *       200:
 *         description: Account activated successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
  '/activate-account',
  [
    body('email').isEmail().normalizeEmail().withMessage('A valid email address is required'),
    body('otp').trim().notEmpty().withMessage('OTP is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user) return res.status(404).json({ success: false, message: 'No account found with that email address' });
      if (user.isAccountActivated) return res.status(400).json({ success: false, message: 'This account is already activated' });
      if (!user.otp || !user.otpExpiry) return res.status(400).json({ success: false, message: 'No pending OTP for this account. Request a new one.' });
      if (new Date() > user.otpExpiry) return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });

      const otpValid = await bcrypt.compare(otp, user.otp);
      if (!otpValid) return res.status(400).json({ success: false, message: 'Incorrect OTP. Please check your email and try again.' });

      // Inspectors must set a new password; Users keep the password they registered with
      if (user.role === 'Inspector') {
        if (!newPassword) return res.status(400).json({ success: false, message: 'Inspectors must provide a new password on activation' });

        const errors = [];
        if (newPassword.length < 8) errors.push('Password must be at least 8 characters');
        if (!/[A-Z]/.test(newPassword)) errors.push('Password must contain at least one uppercase letter');
        if (!/[a-z]/.test(newPassword)) errors.push('Password must contain at least one lowercase letter');
        if (!/[0-9]/.test(newPassword)) errors.push('Password must contain at least one number');
        if (!/[@$!%*?&_#\-]/.test(newPassword)) errors.push('Password must contain at least one special character (@$!%*?&_#-)');
        if (errors.length > 0) return res.status(422).json({ success: false, errors });

        user.password = newPassword;
        user.isActive = true;
      }

      user.isAccountActivated = true;
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      // Send welcome email
      try {
        await axios.post(`${NOTIFICATION_URL}/api/notifications/send-welcome`, {
          email: user.email,
          firstName: user.firstName,
          role: user.role,
        });
      } catch {}

      res.json({ success: true, message: 'Account activated successfully. You can now log in.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Public: Forgot password ──────────────────────────────────────
/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     tags: [Users]
 *     summary: Request a password reset OTP (Public)
 *     description: |
 *       **Access:** Public
 *       Sends a 6-digit OTP to the registered email. The response is identical
 *       whether or not the email exists, to prevent user enumeration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: If that email exists, a reset OTP has been sent
 */
router.post('/forgot-password', [body('email').isEmail().normalizeEmail().withMessage('A valid email address is required')], validate, async (req, res) => {
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

// ── Public: Reset password ───────────────────────────────────────
/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: Reset password using OTP received by email (Public)
 *     description: |
 *       **Access:** Public
 *       Verifies the OTP from forgot-password and sets the new password.
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
 *               newPassword:
 *                 type: string
 *                 description: Min 8 chars, uppercase, lowercase, number, special character required
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail().withMessage('A valid email address is required'),
    body('otp').trim().notEmpty().withMessage('OTP is required'),
    strongPassword('newPassword'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user || !user.resetPasswordToken || new Date() > user.resetPasswordExpiry) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please request a new one.' });
      }
      const valid = await bcrypt.compare(otp, user.resetPasswordToken);
      if (!valid) return res.status(400).json({ success: false, message: 'Incorrect OTP. Please check your email and try again.' });

      user.password = newPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpiry = null;
      await user.save();
      res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Authenticated: Get own profile ───────────────────────────────
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Get current user's profile (All roles)
 *     description: "**Access:** Admin, Inspector, User"
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'otp', 'otpExpiry', 'resetPasswordToken', 'resetPasswordExpiry', 'tokenVersion'] },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Authenticated: Update own profile ────────────────────────────
/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [Users]
 *     summary: Update current user's profile (All roles)
 *     description: "**Access:** Admin, Inspector, User"
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
router.put(
  '/profile',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
  ],
  validate,
  async (req, res) => {
    try {
      const { firstName, lastName } = req.body;
      if (!firstName && !lastName) {
        return res.status(400).json({ success: false, message: 'Provide at least one field to update (firstName or lastName)' });
      }
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      await user.update({ ...(firstName && { firstName }), ...(lastName && { lastName }) });
      res.json({ success: true, message: 'Profile updated', data: user.toSafeObject() });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Authenticated: Change password ───────────────────────────────
/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     tags: [Users]
 *     summary: Change current user's password (All roles)
 *     description: "**Access:** Admin, Inspector, User"
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
 *               newPassword:
 *                 type: string
 *                 description: Min 8 chars, uppercase, lowercase, number, special character required
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password is incorrect
 */
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    strongPassword('newPassword'),
  ],
  validate,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      const match = await user.comparePassword(req.body.currentPassword);
      if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

      const samePassword = await user.comparePassword(req.body.newPassword);
      if (samePassword) return res.status(400).json({ success: false, message: 'New password must be different from the current password' });

      user.password = req.body.newPassword;
      await user.save();
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Any auth: List active inspectors ─────────────────────────────
/**
 * @swagger
 * /api/users/inspectors:
 *   get:
 *     tags: [Users]
 *     summary: List all active inspectors (All roles)
 *     description: "**Access:** Admin, Inspector, User — used when scheduling inspections"
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of active inspectors
 */
router.get('/inspectors', authenticate, async (req, res) => {
  try {
    const inspectors = await User.findAll({
      where: { role: 'Inspector', isActive: true, isAccountActivated: true },
      attributes: ['id', 'firstName', 'lastName', 'email'],
      order: [['firstName', 'ASC']],
    });
    res.json({ success: true, data: inspectors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: List all users ─────────────────────────────────────────
/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users with pagination (Admin only)
 *     description: "**Access:** Admin only"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [Admin, Inspector, User] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       403:
 *         description: Admin role required
 */
router.get('/', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'otp', 'otpExpiry', 'resetPasswordToken', 'resetPasswordExpiry', 'tokenVersion'] },
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: Get user by ID ─────────────────────────────────────────
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user by ID (Admin only)
 *     description: "**Access:** Admin only"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User details
 *       403:
 *         description: Admin role required
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'otp', 'otpExpiry', 'resetPasswordToken', 'resetPasswordExpiry', 'tokenVersion'] },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: Update user role or status ────────────────────────────
/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user role, active status, or details (Admin only)
 *     description: "**Access:** Admin only — Admins can assign roles and activate/deactivate accounts"
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
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Admin role required
 *       404:
 *         description: User not found
 */
router.put(
  '/:id',
  authenticate,
  authorize('Admin'),
  [
    body('role').optional().isIn(['Admin', 'Inspector', 'User']).withMessage('Role must be Admin, Inspector, or User'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('email').optional().isEmail().normalizeEmail().withMessage('A valid email address is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { role, isActive, firstName, lastName, email } = req.body;
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const update = {};
      if (role !== undefined) update.role = role;
      if (typeof isActive === 'boolean') update.isActive = isActive;
      if (firstName) update.firstName = firstName;
      if (lastName) update.lastName = lastName;
      if (email) {
        const conflict = await User.findOne({ where: { email, id: { [Op.ne]: req.params.id } } });
        if (conflict) return res.status(409).json({ success: false, message: 'That email address is already in use by another account' });
        update.email = email;
      }

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ success: false, message: 'No valid fields provided to update' });
      }

      await user.update(update);
      res.json({ success: true, message: 'User updated successfully', data: user.toSafeObject() });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Admin: Delete user ────────────────────────────────────────────
/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user account permanently (Admin only)
 *     description: "**Access:** Admin only — Admins cannot delete their own account"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Cannot delete own account
 *       403:
 *         description: Admin role required
 *       404:
 *         description: User not found
 */
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.destroy();
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: Resend OTP to inspector ───────────────────────────────
/**
 * @swagger
 * /api/users/inspectors/{id}/resend-otp:
 *   post:
 *     tags: [Users]
 *     summary: Resend activation OTP to an inspector (Admin only)
 *     description: "**Access:** Admin only"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OTP resent
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Inspector not found
 */
router.post('/inspectors/:id/resend-otp', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const user = await User.findOne({ where: { id: req.params.id, role: 'Inspector' } });
    if (!user) return res.status(404).json({ success: false, message: 'Inspector not found' });
    if (user.isAccountActivated) return res.status(400).json({ success: false, message: 'This account is already activated' });

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
