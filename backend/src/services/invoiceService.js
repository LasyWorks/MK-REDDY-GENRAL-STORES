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
   * Get sales report
   */
  static async getSalesReport(startDate, endDate) {
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
