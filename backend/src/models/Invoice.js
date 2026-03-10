const { query, queryOne, insert, modify } = require('../config/database');
const { generateInvoiceNumber } = require('../utils/helpers');
const config = require('../config');
class Invoice {
  static async findById(id) {
    return queryOne('SELECT * FROM invoices WHERE id = $1', [id]);
  }
  static async findByOrderId(orderId) {
    return queryOne('SELECT * FROM invoices WHERE order_id = $1', [orderId]);
  }
  static async findByInvoiceNumber(invoiceNumber) {
    return queryOne('SELECT * FROM invoices WHERE invoice_number = $1', [invoiceNumber]);
  }
  static async create(order, customer) {
    const invoiceNumber = generateInvoiceNumber();
    const cgst = parseFloat((order.total_gst / 2).toFixed(2));
    const sgst = parseFloat((order.total_gst / 2).toFixed(2));
    return insert(
      `INSERT INTO invoices (
         order_id, invoice_number,
         store_name, store_gst_number, store_address, store_phone,
         customer_name, customer_phone, customer_address,
         subtotal, cgst, sgst, total_gst, total_amount
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [
        order.id, invoiceNumber,
        config.store.name, config.store.gstNumber, config.store.address, config.store.phone,
        customer.name, customer.phone, customer.address || '',
        order.subtotal, cgst, sgst, order.total_gst, order.total_amount,
      ]
    );
  }
  static async findAll(options = {}) {
    const { page = 1, limit = 10, startDate = null, endDate = null, isPaid = null, customerId = null } = options;
    const offset = (page - 1) * limit;
    const conds = ['1=1']; const params = []; let idx = 1;
    if (startDate)    { conds.push(`i.created_at::date >= $${idx++}`); params.push(startDate); }
    if (endDate)      { conds.push(`i.created_at::date <= $${idx++}`); params.push(endDate); }
    if (isPaid !== null) { conds.push(`i.is_paid = $${idx++}`);        params.push(isPaid); }
    if (customerId)   { conds.push(`o.user_id = $${idx++}`);           params.push(customerId); }
    const where = conds.join(' AND ');
    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM invoices i JOIN orders o ON i.order_id = o.id WHERE ${where}`, params
    );
    const rows = await query(
      `SELECT i.*, o.order_number, o.status AS order_status
       FROM invoices i JOIN orders o ON i.order_id = o.id
       WHERE ${where} ORDER BY i.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );
    return { invoices: rows.map(inv => this.formatInvoice(inv)), total: parseInt(countRow.total, 10) };
  }
  static async getFullInvoice(orderId, lang = 'en') {
    const invoice = await queryOne(
      `SELECT i.*, o.order_number, o.status AS order_status, o.created_at AS order_date
       FROM invoices i JOIN orders o ON i.order_id = o.id WHERE i.order_id = $1`,
      [orderId]
    );
    if (!invoice) return null;
    const items = await query(
      `SELECT oi.*, p.image_url,
              COALESCE(oi.product_variant, p.variant, p.unit_pack_size) AS variant,
              COALESCE(pt_req.name, oi.product_name_en) AS product_name
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_translations pt_req ON oi.product_id = pt_req.product_id AND pt_req.lang_code = $2
       WHERE oi.order_id = $1`,
      [orderId, lang]
    );
    return {
      ...this.formatInvoice(invoice),
      order_number: invoice.order_number,
      order_status: invoice.order_status,
      order_date: invoice.order_date,
      items: items.map(item => ({
        product_name: item.product_name,
        variant: item.variant || null,
        quantity: item.quantity, unit_type: item.unit_type,
        unit_price: parseFloat(item.unit_price),
        gst_percentage: parseFloat(item.gst_percentage),
        gst_amount: parseFloat(item.gst_amount),
        subtotal: parseFloat(item.subtotal),
        total: parseFloat(item.total),
        image_url: item.image_url || null,
      })),
    };
  }
  static async markPaid(id, paymentMethod = 'cash') {
    return modify(
      'UPDATE invoices SET is_paid = TRUE, paid_at = NOW(), payment_method = $1 WHERE id = $2',
      [paymentMethod, id]
    );
  }

  static async updateEmailStatus(id, sent) {
    if (sent) {
      return modify(
        'UPDATE invoices SET email_sent = TRUE, email_sent_at = NOW(), email_attempts = email_attempts + 1 WHERE id = $1',
        [id]
      );
    }
    return modify('UPDATE invoices SET email_attempts = email_attempts + 1 WHERE id = $1', [id]);
  }
  static async getGSTReport(startDate, endDate) {
    const summary = await queryOne(
      `SELECT COUNT(*) AS total_invoices,
              SUM(subtotal)    AS total_taxable_amount,
              SUM(cgst)        AS total_cgst,
              SUM(sgst)        AS total_sgst,
              SUM(total_gst)   AS total_gst,
              SUM(total_amount) AS total_amount
       FROM invoices
       WHERE created_at::date BETWEEN $1 AND $2 AND is_paid = TRUE`,
      [startDate, endDate]
    );
    const breakdown = await query(
      `SELECT oi.gst_percentage,
              SUM(oi.subtotal)  AS taxable_amount,
              SUM(oi.gst_amount) AS gst_amount,
              COUNT(DISTINCT i.id) AS invoice_count
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN invoices i ON o.id = i.order_id
       WHERE i.created_at::date BETWEEN $1 AND $2 AND i.is_paid = TRUE
       GROUP BY oi.gst_percentage ORDER BY oi.gst_percentage`,
      [startDate, endDate]
    );
    return {
      period: { startDate, endDate },
      summary: {
        totalInvoices:      parseInt(summary.total_invoices || 0, 10),
        totalTaxableAmount: parseFloat(summary.total_taxable_amount || 0),
        totalCGST:          parseFloat(summary.total_cgst || 0),
        totalSGST:          parseFloat(summary.total_sgst || 0),
        totalGST:           parseFloat(summary.total_gst || 0),
        totalAmount:        parseFloat(summary.total_amount || 0),
      },
      breakdown: breakdown.map(item => ({
        gstPercentage: parseFloat(item.gst_percentage),
        taxableAmount: parseFloat(item.taxable_amount),
        gstAmount:     parseFloat(item.gst_amount),
        invoiceCount:  parseInt(item.invoice_count, 10),
      })),
    };
  }
  static formatInvoice(invoice) {
    return {
      id: invoice.id, order_id: invoice.order_id,
      invoice_number: invoice.invoice_number,
      store: {
        name: invoice.store_name, gst_number: invoice.store_gst_number,
        address: invoice.store_address, phone: invoice.store_phone,
      },
      customer: {
        name: invoice.customer_name, phone: invoice.customer_phone,
        address: invoice.customer_address,
      },
      subtotal:     parseFloat(invoice.subtotal),
      cgst:         parseFloat(invoice.cgst),
      sgst:         parseFloat(invoice.sgst),
      total_gst:    parseFloat(invoice.total_gst),
      total_amount: parseFloat(invoice.total_amount),
      is_paid:      invoice.is_paid,
      paid_at:      invoice.paid_at,
      payment_method: invoice.payment_method,
      email_sent:   invoice.email_sent,
      email_sent_at: invoice.email_sent_at,
      created_at:   invoice.created_at,
    };
  }
}
module.exports = Invoice;
