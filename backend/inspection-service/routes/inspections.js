const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Inspection = require('../models/Inspection');
const { authenticate, authorize } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  next();
};

// ── Schedule an inspection ────────────────────────────────────
/**
 * @swagger
 * /api/inspections:
 *   post:
 *     tags: [Inspections]
 *     summary: Schedule a new inspection
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [extinguisherId, scheduledDate, scheduledTime]
 *             properties:
 *               extinguisherId: { type: string }
 *               extinguisherSerial: { type: string }
 *               scheduledDate: { type: string, format: date }
 *               scheduledTime: { type: string, example: "14:00" }
 *               inspectorName: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Inspection scheduled
 */
router.post(
  '/',
  authenticate,
  [
    body('extinguisherId').notEmpty().withMessage('Extinguisher ID required'),
    body('scheduledDate').isISO8601().withMessage('Valid date required'),
    body('scheduledTime').notEmpty().withMessage('Scheduled time required'),
  ],
  validate,
  async (req, res) => {
    try {
      const inspection = await Inspection.create({ ...req.body, scheduledBy: req.user.id });
      res.status(201).json({ success: true, message: 'Inspection scheduled', data: inspection });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── List inspections ──────────────────────────────────────────
/**
 * @swagger
 * /api/inspections:
 *   get:
 *     tags: [Inspections]
 *     summary: List all inspections
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Pending, Completed, Overdue, Cancelled] }
 *       - in: query
 *         name: extinguisherId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of inspections
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, extinguisherId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (extinguisherId) where.extinguisherId = extinguisherId;
    if (req.user.role === 'Inspector') where.inspector = req.user.id;

    const { count, rows } = await Inspection.findAndCountAll({
      where,
      limit: Number(limit),
      offset: (page - 1) * limit,
      order: [['scheduledDate', 'ASC']],
    });

    // Auto-mark overdue in bulk
    const now = new Date();
    await Inspection.update(
      { status: 'Overdue' },
      { where: { status: 'Pending', scheduledDate: { [Op.lt]: now } } }
    );

    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get inspection by ID ──────────────────────────────────────
/**
 * @swagger
 * /api/inspections/{id}:
 *   get:
 *     tags: [Inspections]
 *     summary: Get an inspection by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Inspection details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found' });
    res.json({ success: true, data: inspection });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Update inspection ─────────────────────────────────────────
/**
 * @swagger
 * /api/inspections/{id}:
 *   put:
 *     tags: [Inspections]
 *     summary: Update an inspection (Admin/Inspector)
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
 *               status: { type: string, enum: [Pending, Completed, Overdue, Cancelled] }
 *               result: { type: string, enum: [Pass, Fail, Needs Attention] }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Inspection updated
 */
router.put('/:id', authenticate, authorize('Admin', 'Inspector'), async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found' });

    const update = { ...req.body };
    if (update.status === 'Completed') update.completedAt = new Date();
    await inspection.update(update);
    res.json({ success: true, message: 'Inspection updated', data: inspection });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Delete inspection ─────────────────────────────────────────
/**
 * @swagger
 * /api/inspections/{id}:
 *   delete:
 *     tags: [Inspections]
 *     summary: Delete an inspection (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Inspection deleted
 */
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found' });
    await inspection.destroy();
    res.json({ success: true, message: 'Inspection deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
