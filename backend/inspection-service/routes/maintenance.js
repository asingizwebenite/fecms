const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const Maintenance = require('../models/Maintenance');
const { authenticate, authorize } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
  next();
};

const todayStr = () => new Date().toISOString().split('T')[0];

// maintenanceDate must be today or earlier (can't log future maintenance)
const validateMaintenanceDate = body('maintenanceDate')
  .optional({ nullable: true, checkFalsy: true })
  .isISO8601().withMessage('Maintenance date must be a valid date (YYYY-MM-DD)')
  .custom((val) => {
    if (val && val > todayStr()) throw new Error('Maintenance date cannot be in the future');
    return true;
  });

// nextMaintenanceDue must come strictly after maintenanceDate (or today if not provided)
const validateNextDue = body('nextMaintenanceDue')
  .optional({ nullable: true, checkFalsy: true })
  .isISO8601().withMessage('Next maintenance due must be a valid date (YYYY-MM-DD)')
  .custom((val, { req }) => {
    if (!val) return true;
    const base = req.body.maintenanceDate || todayStr();
    if (val <= base) throw new Error('Next maintenance due date must be after the maintenance date');
    return true;
  });

const validateCost = body('cost')
  .optional({ nullable: true })
  .isFloat({ min: 0 }).withMessage('Cost must be a non-negative number');

const dateValidators = [validateMaintenanceDate, validateNextDue, validateCost];

// ── Log a maintenance activity ────────────────────────────────────
/**
 * @swagger
 * /api/maintenance:
 *   post:
 *     tags: [Maintenance]
 *     summary: Log a maintenance activity (Admin or Inspector only)
 *     description: |
 *       **Access:** Admin, Inspector — Users cannot log maintenance activities
 *       The inspector field is automatically set to the authenticated user.
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
 *               maintenanceDate: { type: string, format: date, description: "Cannot be in the future" }
 *               issuesIdentified: { type: string }
 *               notes: { type: string }
 *               recommendations: { type: string }
 *               cost: { type: number, minimum: 0 }
 *               nextMaintenanceDue: { type: string, format: date, description: "Must be after maintenanceDate" }
 *     responses:
 *       201:
 *         description: Maintenance logged
 *       403:
 *         description: Admin or Inspector role required
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  authorize('Admin', 'Inspector'),
  [
    body('extinguisherId').notEmpty().withMessage('Extinguisher ID is required'),
    body('actionTaken').trim().notEmpty().withMessage('Action taken is required — describe what was done'),
    ...dateValidators,
  ],
  validate,
  async (req, res) => {
    try {
      const log = await Maintenance.create({
        ...req.body,
        inspector: req.user.id,
        inspectorName: `${req.user.firstName} ${req.user.lastName}`,
      });
      res.status(201).json({ success: true, message: 'Maintenance activity logged successfully', data: log });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── List maintenance logs ─────────────────────────────────────────
/**
 * @swagger
 * /api/maintenance:
 *   get:
 *     tags: [Maintenance]
 *     summary: List maintenance logs — filtered by role (All roles)
 *     description: |
 *       **Access:** Admin, Inspector, User
 *       - **Admin / User** see all maintenance logs
 *       - **Inspector** sees only logs they created
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
 *         description: Paginated list of maintenance logs
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

// ── Get maintenance log by ID ─────────────────────────────────────
/**
 * @swagger
 * /api/maintenance/{id}:
 *   get:
 *     tags: [Maintenance]
 *     summary: Get a maintenance log by ID (All roles)
 *     description: "**Access:** Admin, Inspector, User"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Maintenance log details
 *       404:
 *         description: Maintenance log not found
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

// ── Update maintenance log ────────────────────────────────────────
/**
 * @swagger
 * /api/maintenance/{id}:
 *   put:
 *     tags: [Maintenance]
 *     summary: Update a maintenance log (Admin or Inspector only)
 *     description: "**Access:** Admin, Inspector — Users cannot update maintenance records"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Maintenance log updated
 *       403:
 *         description: Admin or Inspector role required
 *       404:
 *         description: Maintenance log not found
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  authorize('Admin', 'Inspector'),
  dateValidators,
  validate,
  async (req, res) => {
    try {
      const log = await Maintenance.findByPk(req.params.id);
      if (!log) return res.status(404).json({ success: false, message: 'Maintenance log not found' });

      // Prevent changing who performed the maintenance
      const { inspector, inspectorName, ...safeBody } = req.body;
      await log.update(safeBody);
      res.json({ success: true, message: 'Maintenance log updated successfully', data: log });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── Delete maintenance log ────────────────────────────────────────
/**
 * @swagger
 * /api/maintenance/{id}:
 *   delete:
 *     tags: [Maintenance]
 *     summary: Delete a maintenance log (Admin only)
 *     description: "**Access:** Admin only — Inspectors and Users cannot delete maintenance records"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Maintenance log deleted
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Maintenance log not found
 */
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const log = await Maintenance.findByPk(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Maintenance log not found' });
    await log.destroy();
    res.json({ success: true, message: 'Maintenance log deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
