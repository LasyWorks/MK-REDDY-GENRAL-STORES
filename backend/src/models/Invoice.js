const { query, queryOne, insert, modify } = require('../config/database');
const { generateInvoiceNumber } = require('../utils/helpers');
const config = require('../config');

class Invoice {
  /**
   * Find invoice by ID
   */
  static async findById(id) {
    return queryOne('SELECT * FROM invoices WHERE id = ?', [id]);
  }

  /**
   * Find invoice by order ID
   */
  static async findByOrderId(orderId) {
    return queryOne('SELECT * FROM invoices WHERE order_id = ?', [orderId]);
  }

  /**
   * Find invoice by invoice number
   */
  static async findByInvoiceNumber(invoiceNumber) {
    return queryOne('SELECT * FROM invoices WHERE invoice_number = ?', [invoiceNumber]);
  }

  /**
   * Create invoice
   */
  static async create(order, customer) {
    const invoiceNumber = generateInvoiceNumber();
    
    // Calculate CGST and SGST (split equally)
    const cgst = parseFloat((order.total_gst / 2).toFixed(2));
    const sgst = parseFloat((order.total_gst / 2).toFixed(2));

    return insert(
      `INSERT INTO invoices (
        order_id, invoice_number,
        store_name, store_gst_number, store_address, store_phone,
        customer_name, customer_phone, customer_address,
        subtotal, cgst, sgst, total_gst, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id, invoiceNumber,
        config.store.name, config.store.gstNumber, config.store.address, config.store.phone,
        customer.name, customer.phone, customer.address || '',
        order.subtotal, cgst, sgst, order.total_gst, order.total_amount
      ]
    );
  }

  /**
   * Get all invoices
   */
  static async findAll(options = {}) {
    const { page = 1, limit = 10, startDate = null, endDate = null, isPaid = null, customerId = null } = options;
    const offset = (page - 1) * limit;

    let whereConditions = ['1=1'];
    let params = [];

    if (startDate) {
      whereConditions.push('DATE(i.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('DATE(i.created_at) <= ?');
      params.push(endDate);
    }

    if (isPaid !== null) {
      whereConditions.push('i.is_paid = ?');
      params.push(isPaid);
    }

    if (customerId) {
      whereConditions.push('o.user_id = ?');
      params.push(customerId);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await queryOne(
      `SELECT COUNT(*) as total 
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       WHERE ${whereClause}`,
      params
    );

    // Get invoices (use inline LIMIT/OFFSET to avoid MySQL2 parameter issues)
    const safeLimit = parseInt(limit) || 10;
    const safeOffset = parseInt(offset) || 0;
    const invoices = await query(
      `SELECT i.*, o.order_number, o.status as order_status
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       WHERE ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      params
    );

    return {
      invoices: invoices.map(inv => this.formatInvoice(inv)),
      total: countResult.total,
    };
  }

  /**
   * Get full invoice with items
   */
  static async getFullInvoice(orderId, lang = 'en') {
    const invoice = await queryOne(
      `SELECT i.*, o.order_number, o.status as order_status, o.created_at as order_date
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       WHERE i.order_id = ?`,
      [orderId]
    );

    if (!invoice) return null;

    // Get order items
    const items = await query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [orderId]
    );

    const formattedItems = items.map(item => ({
      product_name: lang === 'te' && item.product_name_te ? item.product_name_te : item.product_name_en,
      quantity: item.quantity,
      unit_type: item.unit_type,
      unit_price: parseFloat(item.unit_price),
      gst_percentage: parseFloat(item.gst_percentage),
      gst_amount: parseFloat(item.gst_amount),
      subtotal: parseFloat(item.subtotal),
      total: parseFloat(item.total),
    }));

    return {
      ...this.formatInvoice(invoice),
      order_number: invoice.order_number,
      order_status: invoice.order_status,
      order_date: invoice.order_date,
      items: formattedItems,
    };
  }

  /**
   * Mark invoice as paid
   */
  static async markPaid(id, paymentMethod = 'cash') {
    return modify(
      'UPDATE invoices SET is_paid = TRUE, paid_at = NOW(), payment_method = ? WHERE id = ?',
      [paymentMethod, id]
    );
  }

  /**
   * Update email sent status
   */
  static async updateEmailStatus(id, sent, error = null) {
    if (sent) {
      return modify(
        'UPDATE invoices SET email_sent = TRUE, email_sent_at = NOW(), email_attempts = email_attempts + 1 WHERE id = ?',
        [id]
      );
    } else {
      return modify(
        'UPDATE invoices SET email_attempts = email_attempts + 1 WHERE id = ?',
        [id]
      );
    }
  }

  /**
   * Get GST report
   */
  static async getGSTReport(startDate, endDate) {
    const summary = await queryOne(
      `SELECT 
        COUNT(*) as total_invoices,
        SUM(subtotal) as total_taxable_amount,
        SUM(cgst) as total_cgst,
        SUM(sgst) as total_sgst,
        SUM(total_gst) as total_gst,
        SUM(total_amount) as total_amount
       FROM invoices
       WHERE DATE(created_at) BETWEEN ? AND ? AND is_paid = TRUE`,
      [startDate, endDate]
    );

    // Get GST breakdown by rate
    const breakdown = await query(
      `SELECT 
        oi.gst_percentage,
        SUM(oi.subtotal) as taxable_amount,
        SUM(oi.gst_amount) as gst_amount,
        COUNT(DISTINCT i.id) as invoice_count
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN invoices i ON o.id = i.order_id
       WHERE DATE(i.created_at) BETWEEN ? AND ? AND i.is_paid = TRUE
       GROUP BY oi.gst_percentage
       ORDER BY oi.gst_percentage`,
      [startDate, endDate]
    );

    return {
      period: { startDate, endDate },
      summary: {
        totalInvoices: summary.total_invoices || 0,
        totalTaxableAmount: parseFloat(summary.total_taxable_amount || 0),
        totalCGST: parseFloat(summary.total_cgst || 0),
        totalSGST: parseFloat(summary.total_sgst || 0),
        totalGST: parseFloat(summary.total_gst || 0),
        totalAmount: parseFloat(summary.total_amount || 0),
      },
      breakdown: breakdown.map(item => ({
        gstPercentage: parseFloat(item.gst_percentage),
        taxableAmount: parseFloat(item.taxable_amount),
        gstAmount: parseFloat(item.gst_amount),
        invoiceCount: item.invoice_count,
      })),
    };
  }

  /**
   * Format invoice object
   */
  static formatInvoice(invoice) {
    return {
      id: invoice.id,
      order_id: invoice.order_id,
      invoice_number: invoice.invoice_number,
      store: {
        name: invoice.store_name,
        gst_number: invoice.store_gst_number,
        address: invoice.store_address,
        phone: invoice.store_phone,
      },
      customer: {
        name: invoice.customer_name,
        phone: invoice.customer_phone,
        address: invoice.customer_address,
      },
      subtotal: parseFloat(invoice.subtotal),
      cgst: parseFloat(invoice.cgst),
      sgst: parseFloat(invoice.sgst),
      total_gst: parseFloat(invoice.total_gst),
      total_amount: parseFloat(invoice.total_amount),
      is_paid: invoice.is_paid,
      paid_at: invoice.paid_at,
      payment_method: invoice.payment_method,
      email_sent: invoice.email_sent,
      email_sent_at: invoice.email_sent_at,
      created_at: invoice.created_at,
    };
  }
}

module.exports = Invoice;
