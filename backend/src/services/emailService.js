const nodemailer = require('nodemailer');
const config = require('../config');
const { Invoice } = require('../models');
const logger = require('../utils/logger');

// Email colors and fonts
const BASE_STYLES = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;}
  .em-outer{width:100%;background:#f1f5f9;padding:32px 0;}
  .em-wrap{max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(13,27,62,0.10);}
  .em-accent{height:5px;background:linear-gradient(90deg,#0d1b3e 0%,#c8972a 100%);}
  .em-brand{background:#0d1b3e;padding:22px 36px;text-align:center;}
  .em-brand h2{color:#c8972a;font-size:22px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;}
  .em-brand p{color:#94a3b8;font-size:12px;letter-spacing:0.5px;}
  .em-status{padding:28px 36px 22px;text-align:center;}
  .em-status .status-icon{width:56px;height:56px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:14px;}
  .em-status h1{font-size:24px;font-weight:700;margin-bottom:6px;letter-spacing:-0.3px;}
  .em-status p{font-size:14px;color:#64748b;max-width:380px;margin:0 auto;}
  .em-body{padding:0 36px 28px;}
  .em-divider{height:1px;background:#e2e8f0;margin:24px 0;}
  .meta-grid{display:table;width:100%;border-collapse:collapse;}
  .meta-cell{display:table-cell;width:50%;padding:12px 16px;vertical-align:top;}
  .meta-cell:first-child{border-right:1px solid #e2e8f0;}
  .meta-label{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
  .meta-value{font-size:14px;font-weight:600;color:#1e293b;}
  .em-table{width:100%;border-collapse:collapse;font-size:13px;}
  .totals-block{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:16px;}
  .totals-row{display:flex;justify-content:space-between;align-items:center;padding:10px 18px;font-size:13px;border-bottom:1px solid #e2e8f0;}
  .totals-row:last-child{border-bottom:none;}
  .totals-row.grand{background:#0d1b3e;}
  .t-label{color:#64748b;font-weight:500;}
  .t-value{font-weight:600;color:#1e293b;font-variant-numeric:tabular-nums;}
  .t-value.discount{color:#16a34a;}
  .info-box{border-radius:8px;padding:18px 20px;margin-top:16px;}
  .info-box.blue{background:#eff6ff;border:1px solid #bfdbfe;}
  .info-box.amber{background:#fffbeb;border:1px solid #fde68a;}
  .info-box.red{background:#fef2f2;border:1px solid #fecaca;}
  .info-box.green{background:#f0fdf4;border:1px solid #bbf7d0;}
  .info-box-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;}
  .info-row{display:flex;font-size:13px;margin-bottom:8px;gap:8px;}
  .info-row:last-child{margin-bottom:0;}
  .info-key{color:#64748b;min-width:120px;font-weight:500;}
  .info-val{color:#1e293b;font-weight:600;}
  .em-footer{background:#0d1b3e;padding:22px 36px;}
  .em-footer-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;}
  .em-footer-brand{color:#c8972a;font-size:13px;font-weight:700;letter-spacing:1px;}
  .em-footer-contact{color:#94a3b8;font-size:12px;line-height:1.7;text-align:right;}
  .em-footer-legal{border-top:1px solid #1e3a6e;padding-top:14px;color:#475569;font-size:11px;text-align:center;line-height:1.7;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.5px;}
  .badge.green{background:#dcfce7;color:#166534;}
  .badge.red{background:#fee2e2;color:#991b1b;}
  .badge.blue{background:#dbeafe;color:#1e40af;}
  .badge.amber{background:#fef3c7;color:#92400e;}
  .section-heading{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#94a3b8;margin-bottom:14px;}
`;

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  async send(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: config.email.from || `"${config.store.name}" <${config.email.user}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      };
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Email send failed:', error);
      throw error;
    }
  }

  // Send OTP code email to user
  async sendOTP(email, otp, userName = 'Customer') {
    if (!email) return { success: false, reason: 'No email provided' };

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your OTP Code</title><style>${BASE_STYLES}</style></head>
<body><div class="em-outer"><div class="em-wrap">
  <div class="em-accent"></div>
  <div class="em-brand"><h2>${config.store.name}</h2><p>Secure Login Verification</p></div>
  <div class="em-status" style="background:#eff6ff;border-bottom:1px solid #bfdbfe;">
    <div class="status-icon" style="width:56px;height:56px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#dbeafe;margin-bottom:14px;">
      <span style="font-size:26px;color:#1e40af;">&#128274;</span></div>
    <h1 style="color:#1e3a8a;">Your OTP Code</h1>
    <p>Hi <strong>${userName}</strong>, use this code to complete your login.</p>
  </div>
  <div class="em-body" style="padding-top:24px;text-align:center;">
    <div style="background:#f8fafc;border:2px solid #0d1b3e;border-radius:12px;padding:24px;margin:20px 0;">
      <div class="meta-label" style="margin-bottom:8px;">Your OTP Code</div>
      <div style="font-size:42px;font-weight:700;color:#0d1b3e;letter-spacing:8px;font-family:monospace;">${otp}</div>
    </div>
    <div class="info-box amber" style="background:#fffbeb;border:1px solid #fde68a;text-align:left;">
      <div class="info-box-title" style="color:#92400e;">Security Information</div>
      <ul style="font-size:13px;color:#78350f;line-height:1.9;margin:0;padding-left:20px;">
        <li>This OTP is valid for <strong>${config.otp.expiryMinutes} minutes</strong></li>
        <li>Do not share this code with anyone</li>
        <li>If you didn't request this, please ignore this email</li>
      </ul>
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">This is an auto-generated email. Please do not reply.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.</div>
  </div>
</div></div></body></html>`;

    return this.send(email, `Your OTP Code - ${config.store.name}`, html);
  }

  // Send order confirmation email to customer
  async sendOrderConfirmation(order, user) {
    const invoice = await Invoice.getFullInvoice(order.id);
    if (!invoice || !user.email) return { success: false, reason: 'No email or invoice' };

    const itemsHtml = invoice.items.map((item, idx) => `
      <tr>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};font-weight:500;color:#1e293b;">${item.product_name}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:center;color:#374151;">${item.quantity} ${item.unit_type}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;color:#374151;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.unit_price).toFixed(2)}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-weight:600;color:#14532d;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.total).toFixed(2)}</td>
      </tr>
    `).join('');

    const subtotal  = parseFloat(invoice.subtotal || 0).toFixed(2);
    const cgst      = parseFloat(invoice.cgst || 0).toFixed(2);
    const sgst      = parseFloat(invoice.sgst || 0).toFixed(2);
    const total     = parseFloat(invoice.total_amount || order.total_amount || 0).toFixed(2);
    const promoDisc = parseFloat(order.discount_amount || 0).toFixed(2);
    const hasPromo  = parseFloat(promoDisc) > 0;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Confirmation</title><style>${BASE_STYLES}</style></head>
<body><div class="em-outer"><div class="em-wrap">
  <div class="em-accent"></div>
  <div class="em-brand"><h2>${config.store.name}</h2><p>Official Order Confirmation</p></div>
  <div class="em-status" style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;">
    <div class="status-icon" style="width:56px;height:56px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#dcfce7;margin-bottom:14px;">
      <span style="font-size:26px;color:#16a34a;">&#10003;</span></div>
    <h1 style="color:#14532d;">Order Confirmed</h1>
    <p>Thank you, <strong>${user.name}</strong>. Your order has been received and is being processed.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Order Number</div><div class="meta-value">${order.order_number}</div></div>
        <div class="meta-cell"><div class="meta-label">Invoice Number</div><div class="meta-value">${invoice.invoice_number}</div></div>
      </div>
      <div style="border-top:1px solid #e2e8f0;" class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Order Date</div><div class="meta-value">${new Date(order.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
        <div class="meta-cell"><div class="meta-label">Status</div><div class="meta-value"><span class="badge green">Confirmed</span></div></div>
      </div>
    </div>
    <div class="em-divider"></div>
    <div class="section-heading">Order Items</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:13px;">
      <thead><tr>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:left;">Product</th>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:center;">Qty</th>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:right;">Unit Price</th>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:right;">Amount</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals-block">
      <div class="totals-row"><span class="t-label">Subtotal</span><span class="t-value">&#8377;${subtotal}</span></div>
      <div class="totals-row"><span class="t-label">CGST</span><span class="t-value">&#8377;${cgst}</span></div>
      <div class="totals-row"><span class="t-label">SGST</span><span class="t-value">&#8377;${sgst}</span></div>
      ${hasPromo ? `<div class="totals-row"><span class="t-label">Promotional Discount</span><span class="t-value discount">- &#8377;${promoDisc}</span></div>` : ''}
      <div class="totals-row grand"><span class="t-label" style="color:#e2e8f0;font-weight:700;">Grand Total</span><span class="t-value" style="font-size:18px;font-weight:700;color:#c8972a;">&#8377;${total}</span></div>
    </div>
    <div class="em-divider"></div>
    <div class="info-box blue" style="background:#eff6ff;border:1px solid #bfdbfe;">
      <div class="info-box-title" style="color:#1d4ed8;">Pickup Information</div>
      <div class="info-row"><span class="info-key">Store</span><span class="info-val">${config.store.name}</span></div>
      ${config.store.address ? `<div class="info-row"><span class="info-key">Address</span><span class="info-val">${config.store.address}</span></div>` : ''}
      ${config.store.phone ? `<div class="info-row"><span class="info-key">Contact</span><span class="info-val">${config.store.phone}</span></div>` : ''}
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">This is an auto-generated confirmation. Please do not reply to this email.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.</div>
  </div>
</div></div></body></html>`;

    return this.send(user.email, `Order Confirmed - ${order.order_number} | ${config.store.name}`, html);
  }

  // Send "order is ready for pickup" email to customer
  async sendOrderReadyNotification(order, user) {
    if (!user.email) return { success: false, reason: 'No email' };

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Ready</title><style>${BASE_STYLES}</style></head>
<body><div class="em-outer"><div class="em-wrap">
  <div class="em-accent" style="background:linear-gradient(90deg,#0d1b3e 0%,#0369a1 100%);"></div>
  <div class="em-brand"><h2>${config.store.name}</h2><p>Order Status Update</p></div>
  <div class="em-status" style="background:#eff6ff;border-bottom:1px solid #bfdbfe;">
    <div class="status-icon" style="width:56px;height:56px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#dbeafe;margin-bottom:14px;">
      <span style="font-size:26px;color:#1d4ed8;">&#128230;</span></div>
    <h1 style="color:#1e40af;">Ready for Pickup</h1>
    <p>Hello <strong>${user.name}</strong>, your order is packed and ready to collect from our store.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Order Number</div><div class="meta-value">${order.order_number}</div></div>
        <div class="meta-cell"><div class="meta-label">Order Total</div><div class="meta-value">&#8377;${parseFloat(order.total_amount||0).toFixed(2)}</div></div>
      </div>
    </div>
    <div class="em-divider"></div>
    <div class="info-box blue" style="background:#eff6ff;border:1px solid #bfdbfe;">
      <div class="info-box-title" style="color:#1d4ed8;">Pickup Details</div>
      <div class="info-row"><span class="info-key">Store</span><span class="info-val">${config.store.name}</span></div>
      ${config.store.address ? `<div class="info-row"><span class="info-key">Address</span><span class="info-val">${config.store.address}</span></div>` : ''}
      ${config.store.phone ? `<div class="info-row"><span class="info-key">Phone</span><span class="info-val">${config.store.phone}</span></div>` : ''}
      <div class="info-row" style="margin-top:12px;padding-top:12px;border-top:1px solid #bfdbfe;">
        <span class="info-key" style="color:#1d4ed8;">Note</span>
        <span class="info-val" style="color:#1e40af;">Please present this email or your order number at the counter.</span>
      </div>
    </div>
    <div class="em-divider"></div>
    <p style="font-size:13px;color:#64748b;text-align:center;line-height:1.7;">
      For any queries, please contact us at <strong style="color:#1e293b;">${config.store.phone || config.store.email || 'the store'}</strong>.
    </p>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">This is an auto-generated notification. Please do not reply to this email.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.</div>
  </div>
</div></div></body></html>`;

    return this.send(user.email, `Your Order is Ready - ${order.order_number} | ${config.store.name}`, html);
  }

  // Send new order email to store admin
  async sendAdminOrderNotification(order, user) {
    const adminEmail = config.email.adminEmail || config.adminEmail;
    if (!adminEmail) return { success: false, reason: 'No admin email' };

    const invoice = await Invoice.getFullInvoice(order.id);
    const itemsHtml = invoice && invoice.items
      ? invoice.items.map((item, idx) => `
          <tr>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};font-weight:500;color:#1e293b;">${item.product_name}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:center;color:#374151;">${item.quantity} ${item.unit_type}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.unit_price).toFixed(2)}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-variant-numeric:tabular-nums;">&#8377;${(parseFloat(item.cgst_amount||0)+parseFloat(item.sgst_amount||0)).toFixed(2)}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-weight:600;color:#1e293b;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.total).toFixed(2)}</td>
          </tr>`).join('')
      : `<tr><td colspan="5" style="padding:16px;text-align:center;color:#94a3b8;">Item details unavailable</td></tr>`;

    const subtotal  = parseFloat(invoice?.subtotal || order.total_amount || 0);
    const cgst      = parseFloat(invoice?.cgst || 0);
    const sgst      = parseFloat(invoice?.sgst || 0);
    const total     = parseFloat(invoice?.total_amount || order.total_amount || 0);
    const promoDisc = parseFloat(order.discount_amount || 0);
    const hasPromo  = promoDisc > 0;
    const invNum    = invoice?.invoice_number || 'N/A';
    const custType  = user.user_type || user.customer_type || 'Regular';
    const orderDate = new Date(order.created_at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Order Received</title><style>${BASE_STYLES}</style></head>
<body><div class="em-outer"><div class="em-wrap">
  <div class="em-accent"></div>
  <div class="em-brand"><h2>${config.store.name}</h2><p>Admin - Order Management Panel</p></div>
  <div class="em-status" style="background:#fefce8;border-bottom:1px solid #fde68a;">
    <div class="status-icon" style="width:56px;height:56px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#fef3c7;margin-bottom:14px;">
      <span style="font-size:24px;color:#92400e;">&#128203;</span></div>
    <h1 style="color:#78350f;">New Order Received</h1>
    <p>A new order has been placed and requires your attention. Invoice has been generated.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Order Number</div><div class="meta-value" style="color:#c8972a;">${order.order_number}</div></div>
        <div class="meta-cell"><div class="meta-label">Invoice Number</div><div class="meta-value">${invNum}</div></div>
      </div>
      <div style="border-top:1px solid #e2e8f0;" class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Date &amp; Time</div><div class="meta-value">${orderDate}</div></div>
        <div class="meta-cell"><div class="meta-label">Status</div><div class="meta-value"><span class="badge amber">Pending</span></div></div>
      </div>
    </div>
    <div class="em-divider"></div>
    <div class="section-heading">Customer Information</div>
    <div class="info-box blue" style="background:#eff6ff;border:1px solid #bfdbfe;">
      <div class="info-box-title" style="color:#1d4ed8;">Customer Details</div>
      <div class="info-row"><span class="info-key">Full Name</span><span class="info-val">${user.name}</span></div>
      ${user.email ? `<div class="info-row"><span class="info-key">Email</span><span class="info-val">${user.email}</span></div>` : ''}
      ${user.phone ? `<div class="info-row"><span class="info-key">Phone</span><span class="info-val">${user.phone}</span></div>` : ''}
      <div class="info-row"><span class="info-key">Customer Type</span><span class="info-val"><span class="badge blue">${custType}</span></span></div>
    </div>
    <div class="em-divider"></div>
    <div class="section-heading">Itemised Bill</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:13px;">
      <thead><tr>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:left;">Product</th>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:center;">Qty</th>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:right;">Unit Price</th>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:right;">GST</th>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:right;">Total</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals-block">
      <div class="totals-row"><span class="t-label">Subtotal (before GST)</span><span class="t-value">&#8377;${subtotal.toFixed(2)}</span></div>
      <div class="totals-row"><span class="t-label">CGST</span><span class="t-value">&#8377;${cgst.toFixed(2)}</span></div>
      <div class="totals-row"><span class="t-label">SGST</span><span class="t-value">&#8377;${sgst.toFixed(2)}</span></div>
      ${hasPromo ? `<div class="totals-row"><span class="t-label">Promotional Discount</span><span class="t-value discount">- &#8377;${promoDisc.toFixed(2)}</span></div>` : ''}
      <div class="totals-row grand"><span class="t-label" style="color:#e2e8f0;font-weight:700;">Grand Total</span><span class="t-value" style="font-size:18px;font-weight:700;color:#c8972a;">&#8377;${total.toFixed(2)}</span></div>
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">Auto-generated admin notification. Generated at ${new Date().toLocaleString('en-IN')}.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. Confidential - for internal use only.</div>
  </div>
</div></div></body></html>`;

    return this.send(adminEmail, `[NEW ORDER] ${order.order_number} - Rs.${total.toFixed(2)} | ${config.store.name}`, html);
  }

  // Send order cancellation email to store admin
  async sendAdminOrderCancellationNotification(order, user, reason) {
    const adminEmail = config.email.adminEmail || config.adminEmail;
    if (!adminEmail) return { success: false, reason: 'No admin email' };

    const items     = order.items || order.order_items || [];
    const total     = parseFloat(order.total_amount || 0);
    const custType  = user.user_type || user.customer_type || 'Regular';
    const orderDate = new Date(order.created_at || Date.now()).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

    const itemsHtml = items.length
      ? items.map((item, idx) => `
          <tr>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};font-weight:500;color:#1e293b;">${item.product_name || item.name || 'Product'}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:center;color:#374151;">${item.quantity}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.total||item.subtotal||0).toFixed(2)}</td>
          </tr>`).join('')
      : `<tr><td colspan="3" style="padding:16px;text-align:center;color:#94a3b8;">Item details unavailable</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Cancelled</title><style>${BASE_STYLES}</style></head>
<body><div class="em-outer"><div class="em-wrap">
  <div class="em-accent" style="background:linear-gradient(90deg,#7f1d1d 0%,#dc2626 100%);"></div>
  <div class="em-brand"><h2>${config.store.name}</h2><p>Admin - Order Management Panel</p></div>
  <div class="em-status" style="background:#fef2f2;border-bottom:1px solid #fecaca;">
    <div class="status-icon" style="width:56px;height:56px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#fee2e2;margin-bottom:14px;">
      <span style="font-size:22px;color:#dc2626;">&#10005;</span></div>
    <h1 style="color:#7f1d1d;">Order Cancelled</h1>
    <p>An order has been cancelled by the customer. Please review the details below.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Order Number</div><div class="meta-value" style="color:#dc2626;">${order.order_number}</div></div>
        <div class="meta-cell"><div class="meta-label">Order Total</div><div class="meta-value">&#8377;${total.toFixed(2)}</div></div>
      </div>
      <div style="border-top:1px solid #e2e8f0;" class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Original Order Date</div><div class="meta-value">${orderDate}</div></div>
        <div class="meta-cell"><div class="meta-label">Cancellation Time</div><div class="meta-value">${new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div></div>
      </div>
    </div>
    ${reason ? `<div class="em-divider"></div>
    <div class="info-box red" style="background:#fef2f2;border:1px solid #fecaca;">
      <div class="info-box-title" style="color:#991b1b;">Cancellation Reason</div>
      <p style="font-size:14px;color:#7f1d1d;line-height:1.7;">${reason}</p>
    </div>` : ''}
    <div class="em-divider"></div>
    <div class="section-heading">Customer Information</div>
    <div class="info-box blue" style="background:#eff6ff;border:1px solid #bfdbfe;">
      <div class="info-box-title" style="color:#1d4ed8;">Customer Details</div>
      <div class="info-row"><span class="info-key">Full Name</span><span class="info-val">${user.name}</span></div>
      ${user.email ? `<div class="info-row"><span class="info-key">Email</span><span class="info-val">${user.email}</span></div>` : ''}
      ${user.phone ? `<div class="info-row"><span class="info-key">Phone</span><span class="info-val">${user.phone}</span></div>` : ''}
      <div class="info-row"><span class="info-key">Customer Type</span><span class="info-val"><span class="badge blue">${custType}</span></span></div>
    </div>
    <div class="em-divider"></div>
    <div class="section-heading">Cancelled Order Items</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:13px;">
      <thead><tr>
        <th style="background:#7f1d1d;color:#fca5a5;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:left;">Product</th>
        <th style="background:#7f1d1d;color:#fca5a5;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:center;">Qty</th>
        <th style="background:#7f1d1d;color:#fca5a5;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:right;">Amount</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div class="totals-block">
      <div class="totals-row" style="background:#7f1d1d;">
        <span class="t-label" style="color:#fca5a5;font-weight:700;">Cancelled Order Value</span>
        <span class="t-value" style="font-size:18px;font-weight:700;color:#fca5a5;">&#8377;${total.toFixed(2)}</span>
      </div>
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">Auto-generated admin alert. Generated at ${new Date().toLocaleString('en-IN')}.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. Confidential - for internal use only.</div>
  </div>
</div></div></body></html>`;

    return this.send(adminEmail, `[CANCELLED] ${order.order_number} - Rs.${total.toFixed(2)} | ${config.store.name}`, html);
  }

  // Send order cancellation email to customer
  async sendCustomerOrderCancellationNotification(order, user, reason) {
    if (!user.email) return { success: false, reason: 'No email' };

    const total     = parseFloat(order.total_amount || 0);
    const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Cancellation Confirmed</title><style>${BASE_STYLES}</style></head>
<body><div class="em-outer"><div class="em-wrap">
  <div class="em-accent" style="background:linear-gradient(90deg,#1c1917 0%,#dc2626 100%);"></div>
  <div class="em-brand"><h2>${config.store.name}</h2><p>Order Update</p></div>
  <div class="em-status" style="background:#fef2f2;border-bottom:1px solid #fecaca;">
    <div class="status-icon" style="width:56px;height:56px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#fee2e2;margin-bottom:14px;">
      <span style="font-size:22px;color:#dc2626;">&#10005;</span></div>
    <h1 style="color:#7f1d1d;">Order Cancelled</h1>
    <p>Dear <strong>${user.name}</strong>, your order has been successfully cancelled as requested.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Order Number</div><div class="meta-value" style="color:#dc2626;">${order.order_number}</div></div>
        <div class="meta-cell"><div class="meta-label">Order Date</div><div class="meta-value">${orderDate}</div></div>
      </div>
      <div style="border-top:1px solid #e2e8f0;" class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Order Total</div><div class="meta-value">&#8377;${total.toFixed(2)}</div></div>
        <div class="meta-cell"><div class="meta-label">Status</div><div class="meta-value"><span class="badge red">Cancelled</span></div></div>
      </div>
    </div>
    ${reason ? `<div class="em-divider"></div>
    <div class="info-box red" style="background:#fef2f2;border:1px solid #fecaca;">
      <div class="info-box-title" style="color:#991b1b;">Reason for Cancellation</div>
      <p style="font-size:14px;color:#7f1d1d;line-height:1.7;">${reason}</p>
    </div>` : ''}
    <div class="em-divider"></div>
    <div class="info-box blue" style="background:#eff6ff;border:1px solid #bfdbfe;">
      <div class="info-box-title" style="color:#1d4ed8;">Need Help?</div>
      <p style="font-size:13px;color:#1e40af;line-height:1.7;">If you have questions or wish to place a new order, please reach out to us.</p>
      <div class="info-row" style="margin-top:10px;"><span class="info-key">Store</span><span class="info-val">${config.store.name}</span></div>
      ${config.store.phone ? `<div class="info-row"><span class="info-key">Phone</span><span class="info-val">${config.store.phone}</span></div>` : ''}
      ${config.store.address ? `<div class="info-row"><span class="info-key">Address</span><span class="info-val">${config.store.address}</span></div>` : ''}
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">This is an auto-generated confirmation. Please do not reply to this email.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.</div>
  </div>
</div></div></body></html>`;

    return this.send(user.email, `Order Cancellation Confirmed - ${order.order_number} | ${config.store.name}`, html);
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connected successfully');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
