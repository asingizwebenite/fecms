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

// Build a local-time Date from a YYYY-MM-DD string and HH:MM string
const combineDatetime = (dateStr, timeStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

// Valid status transitions — Completed and Cancelled are terminal states
const VALID_TRANSITIONS = {
  Pending:   ['Completed', 'Cancelled', 'Overdue'],
  Overdue:   ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

// ── Schedule an inspection ────────────────────────────────────────
/**
 * @swagger
 * /api/inspections:
 *   post:
 *     tags: [Inspections]
 *     summary: Schedule a new inspection (Admin, Inspector, User)
 *     description: |
 *       **Access:** Admin, Inspector, User
 *       All roles can schedule inspections. Only Admin can assign a specific inspector.
 *       Inspector and User submissions leave the inspector field to be assigned by Admin.
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
 *               inspector: { type: string, description: "Admin only — UUID of the assigned inspector" }
 *               inspectorName: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Inspection scheduled
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  [
    body('extinguisherId').notEmpty().withMessage('Extinguisher ID is required'),
    body('scheduledDate')
      .isISO8601().withMessage('Scheduled date must be a valid date (YYYY-MM-DD)'),
    body('scheduledTime')
      .notEmpty().withMessage('Scheduled time is required')
      .matches(/^\d{2}:\d{2}$/).withMessage('Time must be in HH:MM format'),
    body('scheduledDate').custom((date, { req }) => {
      const time = req.body.scheduledTime;
      if (!date || !time || !/^\d{2}:\d{2}$/.test(time)) return true;
      if (combineDatetime(date, time) <= new Date()) {
        throw new Error('Scheduled date and time must be in the future');
      }
      return true;
    }),
  ],
  validate,
  async (req, res) => {
    try {
      // Strip fields that must not be set at creation time
      const { status, completedAt, result, ...safeBody } = req.body;
      const payload = { ...safeBody, scheduledBy: req.user.id };

      // Only Admin can assign an inspector at scheduling time
      if (req.user.role !== 'Admin') {
        delete payload.inspector;
        delete payload.inspectorName;
      }

      const inspection = await Inspection.create(payload);
      res.status(201).json({ success: true, message: 'Inspection scheduled successfully', data: inspection });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── List inspections ──────────────────────────────────────────────
/**
 * @swagger
 * /api/inspections:
 *   get:
 *     tags: [Inspections]
 *     summary: List inspections — filtered by role (All roles)
 *     description: |
 *       **Access:** Admin, Inspector, User
 *       - **Admin / User** see all inspections
 *       - **Inspector** sees only inspections assigned to them
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
 *         description: Paginated list of inspections
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, extinguisherId, page = 1, limit = 20 } = req.query;

    // Auto-mark overdue first so returned rows reflect current state
    await Inspection.update(
      { status: 'Overdue' },
      { where: { status: 'Pending', scheduledDate: { [Op.lt]: new Date() } } }
    );

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

    res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: Number(limit), pages: Math.ceil(count / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Get inspection by ID ──────────────────────────────────────────
/**
 * @swagger
 * /api/inspections/{id}:
 *   get:
 *     tags: [Inspections]
 *     summary: Get an inspection by ID (All roles)
 *     description: "**Access:** Admin, Inspector, User"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Inspection details
 *       404:
 *         description: Inspection not found
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

// ── Update inspection ─────────────────────────────────────────────
/**
 * @swagger
 * /api/inspections/{id}:
 *   put:
 *     tags: [Inspections]
 *     summary: Update an inspection record (Admin or Inspector only)
 *     description: |
 *       **Access:** Admin, Inspector — Users cannot update inspection records
 *       - Inspector records results, notes, and status
 *       - Admin can additionally reassign the inspector and reschedule
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
 *               scheduledDate: { type: string, format: date }
 *               scheduledTime: { type: string }
 *               inspector: { type: string, description: "Admin only — reassign inspector" }
 *               inspectorName: { type: string }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Inspection updated
 *       400:
 *         description: Invalid status transition or business rule violation
 *       403:
 *         description: Admin or Inspector role required
 *       404:
 *         description: Inspection not found
 */
router.put('/:id', authenticate, authorize('Admin', 'Inspector'), async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found' });

    const { status, result, scheduledDate, scheduledTime, ...rest } = req.body;
    const update = { ...rest };

    // Inspectors cannot reassign inspector or change scheduling metadata
    if (req.user.role === 'Inspector') {
      delete update.inspector;
      delete update.inspectorName;
      delete update.scheduledBy;
      delete update.extinguisherId;
    }

    // ── Status transition guard ──────────────────────────────
    if (status && status !== inspection.status) {
      const allowed = VALID_TRANSITIONS[inspection.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status from '${inspection.status}' to '${status}'. ${inspection.status} inspections cannot be modified.`,
        });
      }
      update.status = status;
      if (status === 'Completed') update.completedAt = new Date();
    }

    // ── Result requires Completed status ─────────────────────
    if (result !== undefined) {
      const effectiveStatus = update.status || inspection.status;
      if (effectiveStatus !== 'Completed') {
        return res.status(400).json({
          success: false,
          message: 'Result can only be recorded when the inspection is marked as Completed',
        });
      }
      update.result = result;
    }

    // ── Block rescheduling terminal-state inspections ─────────
    if (scheduledDate !== undefined || scheduledTime !== undefined) {
      if (inspection.status === 'Completed' || inspection.status === 'Cancelled') {
        return res.status(400).json({
          success: false,
          message: `Cannot reschedule a ${inspection.status} inspection`,
        });
      }
      const newDate = scheduledDate || inspection.scheduledDate;
      const newTime = scheduledTime || inspection.scheduledTime;
      if (!/^\d{2}:\d{2}$/.test(newTime)) {
        return res.status(400).json({ success: false, message: 'Time must be in HH:MM format' });
      }
      if (combineDatetime(newDate, newTime) <= new Date()) {
        return res.status(400).json({ success: false, message: 'Scheduled date and time must be in the future' });
      }
      if (scheduledDate) update.scheduledDate = scheduledDate;
      if (scheduledTime) update.scheduledTime = scheduledTime;
    }

    await inspection.update(update);
    res.json({ success: true, message: 'Inspection updated successfully', data: inspection });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Delete inspection ─────────────────────────────────────────────
/**
 * @swagger
 * /api/inspections/{id}:
 *   delete:
 *     tags: [Inspections]
 *     summary: Delete an inspection record (Admin only)
 *     description: "**Access:** Admin only — Inspectors and Users cannot delete inspection records"
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Inspection deleted
 *       403:
 *         description: Admin role required
 *       404:
 *         description: Inspection not found
 */
router.delete('/:id', authenticate, authorize('Admin'), async (req, res) => {
  try {
    const inspection = await Inspection.findByPk(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found' });
    await inspection.destroy();
    res.json({ success: true, message: 'Inspection deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
