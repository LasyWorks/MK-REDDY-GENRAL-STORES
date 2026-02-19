const { InvoiceService } = require('../services');
const { asyncHandler } = require('../middlewares');
const ApiResponse = require('../utils/ApiResponse');
const { getPaginationParams } = require('../utils/helpers');

/**
 * @desc    Get invoice by ID
 * @route   GET /api/v1/invoices/:id
 * @access  Private (Owner or Admin)
 */
const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getById(req.params.id);

  // Check authorization
  if (invoice.user_id !== req.user.id && req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Not authorized', 403);
  }

  ApiResponse.success(res, invoice);
});

/**
 * @desc    Get invoice by invoice number
 * @route   GET /api/v1/invoices/number/:invoiceNumber
 * @access  Private (Owner or Admin)
 */
const getInvoiceByNumber = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getByInvoiceNumber(req.params.invoiceNumber);

  // Check authorization
  if (invoice.user_id !== req.user.id && req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Not authorized', 403);
  }

  ApiResponse.success(res, invoice);
});

/**
 * @desc    Get invoice by order ID
 * @route   GET /api/v1/invoices/order/:orderId
 * @access  Private (Owner or Admin)
 */
const getInvoiceByOrder = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getByOrderId(req.params.orderId);

  // Check authorization
  if (invoice.user_id !== req.user.id && req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Not authorized', 403);
  }

  ApiResponse.success(res, invoice);
});

/**
 * @desc    Get all invoices
 * @route   GET /api/v1/invoices
 * @access  Admin
 */
const getAllInvoices = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { user_id, payment_status, start_date, end_date } = req.query;

  const result = await InvoiceService.getAll({
    page,
    limit,
    userId: user_id,
    paymentStatus: payment_status,
    startDate: start_date,
    endDate: end_date,
  });

  ApiResponse.paginated(res, result.invoices, {
    page,
    limit,
    totalItems: result.total,
  });
});

/**
 * @desc    Get my invoices
 * @route   GET /api/v1/invoices/my-invoices
 * @access  Private
 */
const getMyInvoices = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const { payment_status, start_date, end_date } = req.query;

  const result = await InvoiceService.getAll({
    page,
    limit,
    userId: req.user.id,
    paymentStatus: payment_status,
    startDate: start_date,
    endDate: end_date,
  });

  ApiResponse.paginated(res, result.invoices, {
    page,
    limit,
    totalItems: result.total,
  });
});

/**
 * @desc    Mark invoice as paid
 * @route   PUT /api/v1/invoices/:id/paid
 * @access  Admin
 */
const markAsPaid = asyncHandler(async (req, res) => {
  const { payment_method, payment_reference, notes } = req.body;

  const invoice = await InvoiceService.markPaid(req.params.id, payment_method, req.user.id);

  ApiResponse.success(res, invoice, 'Invoice marked as paid');
});

/**
 * @desc    Get invoice PDF (generate download link)
 * @route   GET /api/v1/invoices/:id/download
 * @access  Private (Owner or Admin)
 */
const downloadInvoice = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getById(req.params.id);

  // Check authorization
  if (invoice.user_id !== req.user.id && req.user.role !== 'admin') {
    return ApiResponse.error(res, 'Not authorized', 403);
  }

  // Generate invoice HTML for download
  const invoiceHtml = await InvoiceService.generateInvoiceHtml(invoice);

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_number}.html"`);
  res.send(invoiceHtml);
});

/**
 * @desc    Get revenue report
 * @route   GET /api/v1/invoices/reports/revenue
 * @access  Admin
 */
const getRevenueReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, group_by } = req.query;
  const report = await InvoiceService.getRevenueReport(start_date, end_date, group_by || 'day');
  ApiResponse.success(res, report);
});

/**
 * @desc    Get GST report
 * @route   GET /api/v1/invoices/reports/gst
 * @access  Admin
 */
const getGSTReport = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const report = await InvoiceService.getGSTReport(start_date, end_date);
  ApiResponse.success(res, report);
});

/**
 * @desc    Get pending payments
 * @route   GET /api/v1/invoices/reports/pending
 * @access  Admin
 */
const getPendingPayments = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);

  const result = await InvoiceService.getAll({
    page,
    limit,
    paymentStatus: 'pending',
  });

  ApiResponse.paginated(res, result.invoices, {
    page,
    limit,
    totalItems: result.total,
  });
});

module.exports = {
  getInvoice,
  getInvoiceByNumber,
  getInvoiceByOrder,
  getAllInvoices,
  getMyInvoices,
  markAsPaid,
  downloadInvoice,
  getRevenueReport,
  getGSTReport,
  getPendingPayments,
};
