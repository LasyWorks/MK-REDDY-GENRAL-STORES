const { InvoiceService } = require("../services");
const { asyncHandler } = require("../middlewares");
const ApiResponse = require("../utils/ApiResponse");
const { getPaginationParams } = require("../utils/helpers");
const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getById(req.params.id);
  if (invoice.user_id !== req.user.id && req.user.role !== "admin") {
    return ApiResponse.error(res, "Not authorized", 403);
  }
  ApiResponse.success(res, invoice);
});
const getInvoiceByNumber = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getByInvoiceNumber(
    req.params.invoiceNumber,
  );
  if (invoice.user_id !== req.user.id && req.user.role !== "admin") {
    return ApiResponse.error(res, "Not authorized", 403);
  }
  ApiResponse.success(res, invoice);
});
const getInvoiceByOrder = asyncHandler(async (req, res) => {
  let invoice = null;
  try {
    invoice = await InvoiceService.getByOrderId(req.params.orderId);
  } catch (err) {
    // Return 200 with null when no invoice exists yet for the order
    if (err.statusCode === 404 || err.status === 404) {
      return ApiResponse.success(res, null);
    }
    throw err;
  }
  if (invoice && invoice.user_id !== req.user.id && req.user.role !== "admin") {
    return ApiResponse.error(res, "Not authorized", 403);
  }
  ApiResponse.success(res, invoice);
});
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
const markAsPaid = asyncHandler(async (req, res) => {
  const { payment_method, payment_reference, notes } = req.body;
  const invoice = await InvoiceService.markPaid(
    req.params.id,
    payment_method,
    req.user.id,
  );
  ApiResponse.success(res, invoice, "Invoice marked as paid");
});
const downloadInvoice = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.getById(req.params.id);
  if (invoice.user_id !== req.user.id && req.user.role !== "admin") {
    return ApiResponse.error(res, "Not authorized", 403);
  }
  const invoiceHtml = await InvoiceService.generateInvoiceHtml(invoice);
  res.setHeader("Content-Type", "text/html");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${invoice.invoice_number}.html"`,
  );
  res.send(invoiceHtml);
});
const getRevenueReport = asyncHandler(async (req, res) => {
  const { start_date, end_date, group_by } = req.query;
  const report = await InvoiceService.getRevenueReport(
    start_date,
    end_date,
    group_by || "day",
  );
  ApiResponse.success(res, report);
});
const getGSTReport = asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const report = await InvoiceService.getGSTReport(start_date, end_date);
  ApiResponse.success(res, report);
});
const generateInvoice = asyncHandler(async (req, res) => {
  const invoice = await InvoiceService.generateForOrder(
    req.params.orderId,
    req.user.id,
  );
  ApiResponse.success(res, invoice, "Invoice generated successfully");
});

const getPendingPayments = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query.page, req.query.limit);
  const result = await InvoiceService.getAll({
    page,
    limit,
    paymentStatus: "pending",
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
  generateInvoice,
  getPendingPayments,
};
