const { Invoice, Order, AdminLog } = require('../models');
const ApiError = require('../utils/ApiError');

class InvoiceService {
  /**
   * Get invoice by ID
   */
  static async getById(invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found');
    }
    return invoice;
  }

  /**
   * Get invoice by order ID
   */
  static async getByOrderId(orderId, lang = 'en') {
    const invoice = await Invoice.getFullInvoice(orderId, lang);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found');
    }
    return invoice;
  }

  /**
   * Get invoice by invoice number
   */
  static async getByInvoiceNumber(invoiceNumber) {
    const invoice = await Invoice.findByInvoiceNumber(invoiceNumber);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found');
    }
    return invoice;
  }

  /**
   * Get all invoices (admin)
   */
  static async getAll(options = {}) {
    return Invoice.findAll(options);
  }

  /**
   * Mark invoice as paid
   */
  static async markPaid(invoiceId, paymentMethod = 'cash', adminId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw ApiError.notFound('Invoice not found');
    }

    if (invoice.is_paid) {
      // Return the invoice as it is (Idempotent - same success)
      return invoice;
    }

    await Invoice.markPaid(invoiceId, paymentMethod);

    // Log admin action
    await AdminLog.create({
      adminId,
      action: 'MARK_INVOICE_PAID',
      entityType: 'invoice',
      entityId: invoiceId,
      newValue: { payment_method: paymentMethod },
    });

    return Invoice.findById(invoiceId);
  }

  /**
   * Get GST report
   */
  static async getGSTReport(startDate, endDate) {
    return Invoice.getGSTReport(startDate, endDate);
  }

  /**
   * Generate invoice HTML for download
   */
  static async generateInvoiceHtml(invoice) {
    const items = invoice.items || [];
    const itemRows = items.map(item => `
      <tr>
        <td>${item.product_name || item.name || '-'}</td>
        <td>${item.unit_type || '-'}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">₹${parseFloat(item.unit_price || item.price || 0).toFixed(2)}</td>
        <td style="text-align:right">${item.gst_percentage || 0}%</td>
        <td style="text-align:right">₹${parseFloat(item.gst_amount || 0).toFixed(2)}</td>
        <td style="text-align:right">₹${parseFloat(item.total_price || item.subtotal || 0).toFixed(2)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; margin: 40px; }
  h1 { color: #1F3A8A; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #1F3A8A; color: #fff; padding: 6px 10px; text-align: left; }
  td { padding: 5px 10px; border-bottom: 1px solid #eee; }
  .total-row td { font-weight: bold; border-top: 2px solid #1F3A8A; }
  .meta { margin-bottom: 20px; }
  .meta td { padding: 3px 8px; }
</style>
</head>
<body>
<h1>MK Reddy General Stores</h1>
<h2>Invoice</h2>
<table class="meta">
  <tr><td><b>Invoice #:</b></td><td>${invoice.invoice_number}</td><td><b>Date:</b></td><td>${new Date(invoice.created_at).toLocaleDateString('en-IN')}</td></tr>
  <tr><td><b>Order #:</b></td><td>${invoice.order_number || '-'}</td><td><b>Payment:</b></td><td>${invoice.is_paid ? 'Paid' : 'Pending'}</td></tr>
</table>
<table>
  <thead><tr><th>Product</th><th>Unit</th><th>Qty</th><th>Price</th><th>GST%</th><th>GST Amt</th><th>Total</th></tr></thead>
  <tbody>${itemRows}</tbody>
  <tfoot>
    <tr class="total-row"><td colspan="6" style="text-align:right">Subtotal:</td><td style="text-align:right">₹${parseFloat(invoice.subtotal || 0).toFixed(2)}</td></tr>
    <tr class="total-row"><td colspan="6" style="text-align:right">Total GST:</td><td style="text-align:right">₹${parseFloat(invoice.total_gst || 0).toFixed(2)}</td></tr>
    <tr class="total-row"><td colspan="6" style="text-align:right"><b>Grand Total:</b></td><td style="text-align:right"><b>₹${parseFloat(invoice.total_amount || 0).toFixed(2)}</b></td></tr>
  </tfoot>
</table>
</body></html>`;
  }

  /**
   * Get revenue report (alias for revenue/sales report used by controller)
   */
  static async getRevenueReport(startDate, endDate, groupBy = 'day') {
    return this.getSalesReport(startDate, endDate, groupBy);
  }

  /**
   * Get pending payments
   */
  static async getPendingPayments(options = {}) {
    return this.getAll({ ...options, paymentStatus: 'pending' });
  }

  /**
   * Get sales report
   */
  static async getSalesReport(startDate, endDate, groupBy = 'day') {
    const invoices = await Invoice.findAll({
      startDate,
      endDate,
      isPaid: true,
      limit: 10000, // Get all
    });

    const dailySales = {};
    let totalSales = 0;
    let totalGst = 0;

    invoices.invoices.forEach(invoice => {
      const date = new Date(invoice.created_at).toISOString().split('T')[0];
      
      if (!dailySales[date]) {
        dailySales[date] = {
          date,
          count: 0,
          subtotal: 0,
          gst: 0,
          total: 0,
        };
      }

      dailySales[date].count++;
      dailySales[date].subtotal += invoice.subtotal;
      dailySales[date].gst += invoice.total_gst;
      dailySales[date].total += invoice.total_amount;

      totalSales += invoice.subtotal;
      totalGst += invoice.total_gst;
    });

    return {
      period: { startDate, endDate },
      summary: {
        totalInvoices: invoices.total,
        totalSales: parseFloat(totalSales.toFixed(2)),
        totalGst: parseFloat(totalGst.toFixed(2)),
        totalRevenue: parseFloat((totalSales + totalGst).toFixed(2)),
      },
      dailySales: Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}

module.exports = InvoiceService;
