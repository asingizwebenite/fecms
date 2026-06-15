const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const { Extinguisher, Inspection, Maintenance, User } = require('../models');
const { authenticate, authorize } = require('../middleware/auth');

// ── Inventory Reports ─────────────────────────────────────────
/**
 * @swagger
 * /api/reports/inventory:
 *   get:
 *     tags: [Reports]
 *     summary: Inventory summary report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [daily, monthly, yearly, all] }
 *     responses:
 *       200:
 *         description: Inventory report
 */
router.get('/inventory', authenticate, async (req, res) => {
  try {
    const where = buildDateWhere(req.query.period, 'createdAt');

    const [total, byType, byStatus, bySize] = await Promise.all([
      Extinguisher.count({ where }),
      Extinguisher.findAll({ where, attributes: ['type', [fn('COUNT', col('id')), 'count']], group: ['type'], raw: true }),
      Extinguisher.findAll({ where, attributes: ['status', [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true }),
      Extinguisher.findAll({ where, attributes: ['size', [fn('COUNT', col('id')), 'count']], group: ['size'], raw: true }),
    ]);

    res.json({
      success: true,
      data: {
        period: req.query.period || 'all',
        total,
        byType: rowsToObj(byType, 'type'),
        byStatus: rowsToObj(byStatus, 'status'),
        bySize: rowsToObj(bySize, 'size'),
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Inspection Reports ────────────────────────────────────────
/**
 * @swagger
 * /api/reports/inspections:
 *   get:
 *     tags: [Reports]
 *     summary: Inspection status report
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Inspection report
 */
router.get('/inspections', authenticate, async (req, res) => {
  try {
    const [pending, completed, overdue, cancelled] = await Promise.all([
      Inspection.count({ where: { status: 'Pending' } }),
      Inspection.count({ where: { status: 'Completed' } }),
      Inspection.count({ where: { status: 'Overdue' } }),
      Inspection.count({ where: { status: 'Cancelled' } }),
    ]);

    const [recentCompleted, upcomingPending] = await Promise.all([
      Inspection.findAll({ where: { status: 'Completed' }, order: [['completedAt', 'DESC']], limit: 10, raw: true }),
      Inspection.findAll({ where: { status: 'Pending', scheduledDate: { [Op.gte]: new Date() } }, order: [['scheduledDate', 'ASC']], limit: 10, raw: true }),
    ]);

    res.json({
      success: true,
      data: {
        summary: { pending, completed, overdue, cancelled, total: pending + completed + overdue + cancelled },
        recentCompleted,
        upcomingPending,
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Compliance Reports ────────────────────────────────────────
/**
 * @swagger
 * /api/reports/compliance:
 *   get:
 *     tags: [Reports]
 *     summary: Compliance report (expired, upcoming expirations)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Compliance report
 */
router.get('/compliance', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [expired, active, total, expiring30, expiring90] = await Promise.all([
      Extinguisher.count({ where: { status: 'Expired' } }),
      Extinguisher.count({ where: { status: 'Active' } }),
      Extinguisher.count(),
      Extinguisher.findAll({ where: { expiryDate: { [Op.between]: [now, in30Days] }, status: 'Active' }, attributes: ['id', 'serialNumber', 'location', 'expiryDate'], raw: true }),
      Extinguisher.findAll({ where: { expiryDate: { [Op.between]: [in30Days, in90Days] }, status: 'Active' }, attributes: ['id', 'serialNumber', 'location', 'expiryDate'], raw: true }),
    ]);

    const complianceRate = total > 0 ? ((active / total) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        summary: { total, active, expired, complianceRate: `${complianceRate}%` },
        expiringIn30Days: { count: expiring30.length, items: expiring30 },
        expiringIn90Days: { count: expiring90.length, items: expiring90 },
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Maintenance Reports ───────────────────────────────────────
/**
 * @swagger
 * /api/reports/maintenance:
 *   get:
 *     tags: [Reports]
 *     summary: Maintenance history and frequency report
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [daily, monthly, yearly, all] }
 *     responses:
 *       200:
 *         description: Maintenance report
 */
router.get('/maintenance', authenticate, async (req, res) => {
  try {
    const where = buildDateWhere(req.query.period, 'maintenanceDate');

    const [total, byAction, recentLogs, costResult] = await Promise.all([
      Maintenance.count({ where }),
      Maintenance.findAll({ where, attributes: ['actionTaken', [fn('COUNT', col('id')), 'count']], group: ['actionTaken'], order: [[literal('count'), 'DESC']], limit: 10, raw: true }),
      Maintenance.findAll({ where, order: [['maintenanceDate', 'DESC']], limit: 10, raw: true }),
      Maintenance.findAll({ where, attributes: [[fn('SUM', col('cost')), 'totalCost']], raw: true }),
    ]);

    res.json({
      success: true,
      data: {
        period: req.query.period || 'all',
        total,
        totalCost: parseFloat(costResult[0]?.totalCost) || 0,
        byAction: byAction.map((r) => ({ action: r.actionTaken, count: Number(r.count) })),
        recentActivities: recentLogs,
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Dashboard summary ─────────────────────────────────────────
/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     tags: [Reports]
 *     summary: Dashboard summary — all key metrics at once
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalExtinguishers, activeExtinguishers, expiredExtinguishers,
      pendingInspections, overdueInspections, completedInspections,
      totalMaintenance, expiringItems, totalUsers,
    ] = await Promise.all([
      Extinguisher.count(),
      Extinguisher.count({ where: { status: 'Active' } }),
      Extinguisher.count({ where: { status: 'Expired' } }),
      Inspection.count({ where: { status: 'Pending' } }),
      Inspection.count({ where: { status: 'Overdue' } }),
      Inspection.count({ where: { status: 'Completed' } }),
      Maintenance.count(),
      Extinguisher.count({ where: { expiryDate: { [Op.between]: [now, in30Days] }, status: 'Active' } }),
      User.count(),
    ]);

    res.json({
      success: true,
      data: {
        extinguishers: { total: totalExtinguishers, active: activeExtinguishers, expired: expiredExtinguishers, expiringIn30Days: expiringItems },
        inspections: { pending: pendingInspections, overdue: overdueInspections, completed: completedInspections },
        maintenance: { total: totalMaintenance },
        users: { total: totalUsers },
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Export CSV ────────────────────────────────────────────────
/**
 * @swagger
 * /api/reports/export/csv/{type}:
 *   get:
 *     tags: [Reports]
 *     summary: Export report as CSV
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [extinguishers, inspections, maintenance] }
 *     responses:
 *       200:
 *         description: CSV file
 */
router.get('/export/csv/:type', authenticate, authorize('Admin', 'Inspector'), async (req, res) => {
  try {
    const { Parser } = require('json2csv');
    let data = [];
    let fields = [];

    if (req.params.type === 'extinguishers') {
      data = await Extinguisher.findAll({ raw: true });
      fields = ['serialNumber', 'location', 'type', 'size', 'status', 'installationDate', 'expiryDate'];
    } else if (req.params.type === 'inspections') {
      data = await Inspection.findAll({ raw: true });
      fields = ['extinguisherSerial', 'scheduledDate', 'scheduledTime', 'status', 'result', 'inspectorName', 'notes'];
    } else if (req.params.type === 'maintenance') {
      data = await Maintenance.findAll({ raw: true });
      fields = ['extinguisherSerial', 'inspectorName', 'actionTaken', 'maintenanceDate', 'issuesIdentified', 'cost'];
    } else {
      return res.status(400).json({ success: false, message: 'Invalid export type' });
    }

    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`${req.params.type}-report-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Export PDF ────────────────────────────────────────────────
/**
 * @swagger
 * /api/reports/export/pdf/{type}:
 *   get:
 *     tags: [Reports]
 *     summary: Export report as PDF
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [inventory, inspections, compliance, maintenance] }
 *     responses:
 *       200:
 *         description: PDF file
 */
router.get('/export/pdf/:type', authenticate, authorize('Admin', 'Inspector'), async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });

    res.header('Content-Type', 'application/pdf');
    res.attachment(`${req.params.type}-report-${Date.now()}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).fillColor('#C0392B').text('TWZ FEMS — Fire Extinguisher Management System', { align: 'center' });
    doc.fontSize(14).fillColor('#333').text(`${capitalize(req.params.type)} Report`, { align: 'center' });
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#C0392B');
    doc.moveDown();

    if (req.params.type === 'inventory') {
      const data = await Extinguisher.findAll({ raw: true });
      doc.fontSize(12).fillColor('#333').text(`Total Fire Extinguishers: ${data.length}`);
      doc.moveDown(0.5);
      data.slice(0, 50).forEach((e) => {
        doc.fontSize(9).fillColor('#444').text(`• [${e.serialNumber}] ${e.location} — ${e.type} ${e.size} | Status: ${e.status}`);
      });
    } else if (req.params.type === 'inspections') {
      const [pending, completed, overdue] = await Promise.all([
        Inspection.count({ where: { status: 'Pending' } }),
        Inspection.count({ where: { status: 'Completed' } }),
        Inspection.count({ where: { status: 'Overdue' } }),
      ]);
      doc.fontSize(12).fillColor('#333').text(`Pending: ${pending}  |  Completed: ${completed}  |  Overdue: ${overdue}`);
    } else if (req.params.type === 'compliance') {
      const expired = await Extinguisher.findAll({ where: { status: 'Expired' }, raw: true });
      doc.fontSize(12).fillColor('#C0392B').text(`Expired Extinguishers: ${expired.length}`);
      doc.moveDown(0.5);
      expired.slice(0, 50).forEach((e) => {
        doc.fontSize(9).fillColor('#444').text(`• [${e.serialNumber}] ${e.location} — Expired: ${e.expiryDate}`);
      });
    } else if (req.params.type === 'maintenance') {
      const logs = await Maintenance.findAll({ order: [['maintenanceDate', 'DESC']], limit: 50, raw: true });
      doc.fontSize(12).fillColor('#333').text(`Recent Maintenance Activities (${logs.length})`);
      doc.moveDown(0.5);
      logs.forEach((m) => {
        doc.fontSize(9).fillColor('#444').text(`• [${m.extinguisherSerial || 'N/A'}] ${m.actionTaken} — ${m.maintenanceDate} by ${m.inspectorName || 'N/A'}`);
      });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────
function buildDateWhere(period, field) {
  const now = new Date();
  if (period === 'daily') return { [field]: { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } };
  if (period === 'monthly') return { [field]: { [Op.gte]: new Date(now.getFullYear(), now.getMonth(), 1) } };
  if (period === 'yearly') return { [field]: { [Op.gte]: new Date(now.getFullYear(), 0, 1) } };
  return {};
}

function rowsToObj(rows, key) {
  return rows.reduce((acc, row) => ({ ...acc, [row[key] || 'Unknown']: Number(row.count) }), {});
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = router;
