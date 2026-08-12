const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/export/pdf', authenticate, authorize('OWNER'), reportController.exportPdf);
router.get('/export/excel', authenticate, authorize('OWNER'), reportController.exportExcel);

module.exports = router;
