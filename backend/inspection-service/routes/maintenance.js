const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Maintenance = require('../models/Maintenance');
const { authenticate, authorize } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  next();
};

// ── Log a maintenance activity ────────────────────────────────
/**
 * @swagger
 * /api/maintenance:
 *   post:
 *     tags: [Maintenance]
 *     summary: Log a maintenance activity (Inspector/Admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [extinguisherId, actionTaken]
 *             properties:
 *               extinguisherId: { type: string }
 *               extinguisherSerial: { type: string }
 *               actionTaken: { type: string }
 *               maintenanceDate: { type: string, format: date }
 *               issuesIdentified: { type: string }
 *               notes: { type: string }
 *               recommendations: { type: string }
 *               cost: { type: number }
 *               nextMaintenanceDue: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Maintenance logged
 */
router.post(
  '/',
  authenticate,
  authorize('Admin', 'Inspector'),
  [
    body('extinguisherId').notEmpty().withMessage('Extinguisher ID required'),
    body('actionTaken').trim().notEmpty().withMessage('Action taken is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const log = await Maintenance.create({
        ...req.body,
        inspector: req.user.id,
        inspectorName: `${req.user.firstName} ${req.user.lastName}`,
      });
      res.status(201).json({ success: true, message: 'Maintenance logged', data: log });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── List maintenance logs ─────────────────────────────────────
/**
 * @swagger
 * /api/maintenance:
 *   get:
 *     tags: [Maintenance]
 *     summary: List all maintenance logs
 *     security: [{ bearerAuth: [] }]
 *     parameters:
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
 *         description: List of maintenance logs
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { extinguisherId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (extinguisherId) where.extinguisherId = extinguisherId;
    if (req.user.role === 'Inspector') where.inspector = req.user.id;

    const { count, rows } = await Maintenance.findAndCountAll({
      where,
      limit: Number(limit),
      offset: (page - 1) * limit,
      order: [['maintenanceDate', 'DESC']],
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get maintenance log by ID ─────────────────────────────────
/**
 * @swagger
 * /api/maintenance/{id}:
 *   get:
 *     tags: [Maintenance]
 *     summary: Get a maintenance log by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Maintenance log details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const log = await Maintenance.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Maintenance log not found' });
    res.json({ success: true, data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Update maintenance log ────────────────────────────────────
/**
 * @swagger
 * /api/maintenance/{id}:
 *   put:
 *     tags: [Maintenance]
 *     summary: Update a maintenance log (Admin/Inspector)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Maintenance log updated
 */
router.put('/:id', authenticate, authorize('Admin', 'Inspector'), async (req, res) => {
  try {
    const log = await Maintenance.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Maintenance log not found' });
    await log.update(req.body);
    res.json({ success: true, message: 'Maintenance log updated', data: log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Delete maintenance log ────────────────────────────────────
/**
 * @swagger
 * /api/maintenance/{id}:
 *   delete:
 *     tags: [Maintenance]
 *     summary: Delete a maintenance log (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Maintenance log deleted
 */
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const log = await Maintenance.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Maintenance log not found' });
    await log.destroy();
    res.json({ success: true, message: 'Maintenance log deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
