const express = require('express');
const router = express.Router();
const { invoiceController } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateMarkAsPaid } = require('../utils/validators');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/invoices/my-invoices
 * @desc    Get current user's invoices
 * @access  Private
 */
router.get('/my-invoices', authorize('retail_customer', 'wholesale_customer'), invoiceController.getMyInvoices);

/**
 * @route   GET /api/v1/invoices/reports/revenue
 * @desc    Get revenue report
 * @access  Admin
 */
router.get('/reports/revenue', authorize('admin'), invoiceController.getRevenueReport);

/**
 * @route   GET /api/v1/invoices/reports/gst
 * @desc    Get GST report
 * @access  Admin
 */
router.get('/reports/gst', authorize('admin'), invoiceController.getGSTReport);

/**
 * @route   GET /api/v1/invoices/reports/pending
 * @desc    Get pending payments report
 * @access  Admin
 */
router.get('/reports/pending', authorize('admin'), invoiceController.getPendingPayments);

/**
 * @route   GET /api/v1/invoices
 * @desc    Get all invoices
 * @access  Admin
 */
router.get('/', authorize('admin'), invoiceController.getAllInvoices);

/**
 * @route   GET /api/v1/invoices/number/:invoiceNumber
 * @desc    Get invoice by invoice number
 * @access  Private (Owner or Admin)
 */
router.get('/number/:invoiceNumber', invoiceController.getInvoiceByNumber);

/**
 * @route   GET /api/v1/invoices/order/:orderId
 * @desc    Get invoice by order ID
 * @access  Private (Owner or Admin)
 */
router.get('/order/:orderId', invoiceController.getInvoiceByOrder);

/**
 * @route   GET /api/v1/invoices/:id
 * @desc    Get invoice by ID
 * @access  Private (Owner or Admin)
 */
router.get('/:id', invoiceController.getInvoice);

/**
 * @route   GET /api/v1/invoices/:id/download
 * @desc    Download invoice
 * @access  Private (Owner or Admin)
 */
router.get('/:id/download', invoiceController.downloadInvoice);

/**
 * @route   PUT /api/v1/invoices/:id/paid
 * @desc    Mark invoice as paid
 * @access  Admin
 */
router.put('/:id/paid', authorize('admin'), validateMarkAsPaid, invoiceController.markAsPaid);

module.exports = router;
