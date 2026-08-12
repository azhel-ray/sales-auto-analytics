const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, dashboardController.getSummary);
router.get('/sales-chart', authenticate, dashboardController.getSalesChart);
router.get('/profit-chart', authenticate, dashboardController.getProfitChart);
router.get('/top-products', authenticate, dashboardController.getTopProducts);
router.get('/peak-hours', authenticate, dashboardController.getPeakHours);
router.get('/member-summary', authenticate, dashboardController.getMemberSummary);
router.get('/sidebar-notifications', authenticate, dashboardController.getSidebarNotifications);

module.exports = router;
