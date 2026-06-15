const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const Extinguisher = require('../models/Extinguisher');
const { authenticate, authorize } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  next();
};

// ── Register a new extinguisher ───────────────────────────────
/**
 * @swagger
 * /api/extinguishers:
 *   post:
 *     tags: [Extinguishers]
 *     summary: Register a new fire extinguisher (Admin/Inspector)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExtinguisherInput'
 *     responses:
 *       201:
 *         description: Extinguisher registered
 */
router.post(
  '/',
  authenticate,
  authorize('Admin', 'Inspector'),
  [
    body('serialNumber').trim().notEmpty().withMessage('Serial number is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('type').isIn(['Water', 'CO2', 'Foam', 'Dry Chemical']).withMessage('Invalid type'),
    body('size').isIn(['1.5 lb', '5 lb', '9 lb', '12 lb']).withMessage('Invalid size'),
    body('installationDate').isISO8601().withMessage('Valid installation date required'),
    body('expiryDate').isISO8601().withMessage('Valid expiry date required'),
  ],
  validate,
  async (req, res) => {
    try {
      const exists = await Extinguisher.findOne({ where: { serialNumber: req.body.serialNumber } });
      if (exists) return res.status(409).json({ success: false, message: 'Serial number already registered' });

      const extinguisher = await Extinguisher.create({ ...req.body, createdBy: req.user.id });
      res.status(201).json({ success: true, message: 'Fire extinguisher registered', data: extinguisher });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── List all extinguishers ────────────────────────────────────
/**
 * @swagger
 * /api/extinguishers:
 *   get:
 *     tags: [Extinguishers]
 *     summary: List all fire extinguishers
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Active, Expired, Under Maintenance, Decommissioned] }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of extinguishers
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, type, location, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (location) where.location = { [Op.iLike]: `%${location}%` };

    const { count, rows } = await Extinguisher.findAndCountAll({
      where,
      limit: Number(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get extinguisher by ID ────────────────────────────────────
/**
 * @swagger
 * /api/extinguishers/{id}:
 *   get:
 *     tags: [Extinguishers]
 *     summary: Get a fire extinguisher by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Extinguisher details
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const extinguisher = await Extinguisher.findByPk(req.params.id);
    if (!extinguisher) return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    res.json({ success: true, data: extinguisher });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Update extinguisher ───────────────────────────────────────
/**
 * @swagger
 * /api/extinguishers/{id}:
 *   put:
 *     tags: [Extinguishers]
 *     summary: Update fire extinguisher information (Admin/Inspector)
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
 *             $ref: '#/components/schemas/ExtinguisherInput'
 *     responses:
 *       200:
 *         description: Extinguisher updated
 */
router.put('/:id', authenticate, authorize('Admin', 'Inspector'), async (req, res) => {
  try {
    const extinguisher = await Extinguisher.findByPk(req.params.id);
    if (!extinguisher) return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    await extinguisher.update(req.body);
    res.json({ success: true, message: 'Extinguisher updated', data: extinguisher });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Delete extinguisher ───────────────────────────────────────
/**
 * @swagger
 * /api/extinguishers/{id}:
 *   delete:
 *     tags: [Extinguishers]
 *     summary: Delete a fire extinguisher (Admin only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Extinguisher deleted
 */
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const extinguisher = await Extinguisher.findByPk(req.params.id);
    if (!extinguisher) return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    await extinguisher.destroy();
    res.json({ success: true, message: 'Extinguisher deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
