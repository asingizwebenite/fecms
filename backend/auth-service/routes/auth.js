const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  next();
};

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, tokenVersion: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const signRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

// ── Login ────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: User login — returns JWT access and refresh tokens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials or account not activated
 *       401:
 *         description: Wrong password
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });
      if (!user.isActive) return res.status(403).json({ success: false, message: 'Account has been deactivated' });
      if (!user.isAccountActivated) {
        return res.status(403).json({
          success: false,
          message: 'Account not yet activated. Please use the OTP sent to your email to activate your account.',
        });
      }

      const match = await user.comparePassword(password);
      if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      const accessToken = signToken(user);
      const refreshToken = signRefreshToken(user);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Refresh token ─────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token using a refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New access token
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh-token', [body('refreshToken').notEmpty()], validate, async (req, res) => {
  try {
    const decoded = jwt.verify(req.body.refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid refresh token' });

    const accessToken = signToken(user);
    res.json({ success: true, data: { accessToken } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

// ── Verify token ──────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/verify-token:
 *   post:
 *     tags: [Auth]
 *     summary: Verify an access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Token invalid or expired
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, data: decoded });
  } catch {
    res.status(401).json({ success: false, valid: false, message: 'Invalid or expired token' });
  }
});

// ── Get current user (me) ─────────────────────────────────────
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the currently authenticated user (All roles)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user info from token
 */
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});

// ── Logout ────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out and invalidate the current access token (All roles)
 *     description: Increments the user's token version so all existing tokens become invalid immediately.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    await User.increment('tokenVersion', { by: 1, where: { id: req.user.id } });
    res.json({ success: true, message: 'Logged out successfully. Your session has been invalidated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
