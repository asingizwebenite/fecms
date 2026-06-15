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

// ── Register a new extinguisher ───────────────────────────────────
/**
 * @swagger
 * /api/extinguishers:
 *   post:
 *     tags: [Extinguishers]
 *     summary: Register a new fire extinguisher (Admin only)
 *     description: "**Access:** Admin only — Inspectors and Users cannot register new extinguishers"
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
 *       403:
 *         description: Admin role required
 *       409:
 *         description: Serial number already registered
 */
router.post(
  '/',
  authenticate,
  authorize('Admin'),
  [
    body('serialNumber').trim().notEmpty().withMessage('Serial number is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('type').isIn(['Water', 'CO2', 'Foam', 'Dry Chemical']).withMessage('Type must be one of: Water, CO2, Foam, Dry Chemical'),
    body('size').isIn(['1.5 lb', '5 lb', '9 lb', '12 lb']).withMessage('Size must be one of: 1.5 lb, 5 lb, 9 lb, 12 lb'),
    body('installationDate').isISO8601().withMessage('Installation date must be a valid date (YYYY-MM-DD)'),
    body('expiryDate').isISO8601().withMessage('Expiry date must be a valid date (YYYY-MM-DD)'),
  ],
  validate,
  async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(req.body.expiryDate);
      const installationDate = new Date(req.body.installationDate);

      if (expiryDate < today) {
        return res.status(422).json({ success: false, message: 'Expiry date cannot be in the past — the extinguisher is already expired' });
      }
      if (installationDate >= expiryDate) {
        return res.status(422).json({ success: false, message: 'Installation date must be before the expiry date' });
      }

      const exists = await Extinguisher.findOne({ where: { serialNumber: req.body.serialNumber } });
      if (exists) return res.status(409).json({ success: false, message: `Serial number "${req.body.serialNumber}" is already registered` });

      const extinguisher = await Extinguisher.create({ ...req.body, createdBy: req.user.id });
      res.status(201).json({ success: true, message: 'Fire extinguisher registered successfully', data: extinguisher });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── List all extinguishers ────────────────────────────────────────
/**
 * @swagger
 * /api/extinguishers:
 *   get:
 *     tags: [Extinguishers]
 *     summary: List all fire extinguishers with filtering and pagination (All roles)
 *     description: "**Access:** Admin, Inspector, User"
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
 *         description: Partial match search on location
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of extinguishers
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

// ── Get extinguisher by ID ────────────────────────────────────────
/**
 * @swagger
 * /api/extinguishers/{id}:
 *   get:
 *     tags: [Extinguishers]
 *     summary: Get a fire extinguisher by ID (All roles)
 *     description: "**Access:** Admin, Inspector, User"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Extinguisher details
 *       404:
 *         description: Extinguisher not found
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

// ── Update extinguisher ───────────────────────────────────────────
/**
 * @swagger
 * /api/extinguishers/{id}:
 *   put:
 *     tags: [Extinguishers]
 *     summary: Update fire extinguisher information (Admin or Inspector)
 *     description: |
 *       **Access:** Admin, Inspector
 *       - **Admin** can update all fields (location, type, size, dates, status, notes)
 *       - **Inspector** can only update: `status`, `notes`, `lastInspectionDate`, `nextInspectionDate`
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
 *       400:
 *         description: No valid fields provided
 *       403:
 *         description: Admin or Inspector role required
 *       404:
 *         description: Extinguisher not found
 */
router.put('/:id', authenticate, authorize('Admin', 'Inspector'), async (req, res) => {
  try {
    const extinguisher = await Extinguisher.findByPk(req.params.id);
    if (!extinguisher) return res.status(404).json({ success: false, message: 'Extinguisher not found' });

    let update;

    if (req.user.role === 'Inspector') {
      // Inspectors may only update operational fields — not structural/admin details
      const { status, notes, lastInspectionDate, nextInspectionDate } = req.body;
      update = {};
      if (status !== undefined) update.status = status;
      if (notes !== undefined) update.notes = notes;
      if (lastInspectionDate !== undefined) update.lastInspectionDate = lastInspectionDate;
      if (nextInspectionDate !== undefined) update.nextInspectionDate = nextInspectionDate;

      if (Object.keys(update).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Inspectors can only update the following fields: status, notes, lastInspectionDate, nextInspectionDate',
        });
      }

      if (update.status && !['Active', 'Expired', 'Under Maintenance', 'Decommissioned'].includes(update.status)) {
        return res.status(422).json({ success: false, message: 'Status must be one of: Active, Expired, Under Maintenance, Decommissioned' });
      }
    } else {
      // Admin full update with date validation
      update = { ...req.body };

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ success: false, message: 'No fields provided to update' });
      }

      const expiryDate = update.expiryDate ? new Date(update.expiryDate) : new Date(extinguisher.expiryDate);
      const installationDate = update.installationDate ? new Date(update.installationDate) : new Date(extinguisher.installationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        return res.status(422).json({ success: false, message: 'Expiry date cannot be in the past — the extinguisher is already expired' });
      }
      if (installationDate >= expiryDate) {
        return res.status(422).json({ success: false, message: 'Installation date must be before the expiry date' });
      }
    }

    await extinguisher.update(update);
    res.json({ success: true, message: 'Extinguisher updated successfully', data: extinguisher });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Delete extinguisher ───────────────────────────────────────────
/**
 * @swagger
 * /api/extinguishers/{id}:
 *   delete:
 *     tags: [Extinguishers]
 *     summary: Delete a fire extinguisher permanently (Admin only)
 *     description: "**Access:** Admin only — Inspectors and Users cannot delete extinguisher records"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Extinguisher deleted
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Extinguisher not found
 */
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const extinguisher = await Extinguisher.findByPk(req.params.id);
    if (!extinguisher) return res.status(404).json({ success: false, message: 'Extinguisher not found' });
    await extinguisher.destroy();
    res.json({ success: true, message: 'Extinguisher deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
