const nodemailer = require('nodemailer');
const config = require('../config');
const { Invoice } = require('../models');
const logger = require('../utils/logger');

// Email colors and fonts
const BASE_STYLES = `
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#f1f5f9 !important;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#1e293b !important;-webkit-font-smoothing:antialiased;}
  .em-outer{width:100%;background:#f1f5f9 !important;padding:32px 0;}
  .em-wrap{max-width:620px;margin:0 auto;background:#ffffff !important;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(13,27,62,0.10);}
  .em-accent{height:5px;background:linear-gradient(90deg,#0d1b3e 0%,#c8972a 100%) !important;}
  .em-brand{background:#0d1b3e !important;padding:22px 36px;text-align:center;}
  .em-brand h2{color:#c8972a !important;font-size:22px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3px;}
  .em-brand p{color:#94a3b8 !important;font-size:12px;letter-spacing:0.5px;}
  .em-status{padding:28px 36px 22px;text-align:center;background:#0d1b3e !important;border-bottom:none;}
  .em-status .status-icon{display:inline-block;padding:12px 20px;font-size:13px;margin-bottom:14px;font-weight:700;letter-spacing:1px;border-radius:4px;background:#c8972a !important;color:#0d1b3e !important;}
  .em-status h1{font-size:24px;font-weight:700;margin-bottom:6px;letter-spacing:-0.3px;color:#c8972a !important;}
  .em-status p{font-size:14px;color:#ffffff !important;max-width:380px;margin:0 auto;}
  .em-body{padding:0 36px 28px;background:#ffffff !important;}
  .em-divider{height:1px;background:#e2e8f0;margin:24px 0;}
  .meta-grid{display:table;width:100%;border-collapse:collapse;}
  .meta-cell{display:table-cell;width:50%;padding:12px 16px;vertical-align:top;background:#ffffff !important;}
  .meta-cell:first-child{border-right:1px solid #e2e8f0;}
  .meta-label{font-size:10px;font-weight:600;color:#94a3b8 !important;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
  .meta-value{font-size:14px;font-weight:600;color:#1e293b !important;}
  .em-table{width:100%;border-collapse:collapse;font-size:13px;}
  th,td{color:#1e293b !important;background:#ffffff !important;}
  .totals-block{background:#f8fafc !important;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:16px;}
  .totals-row{display:flex;justify-content:space-between;align-items:center;padding:10px 18px;font-size:13px;border-bottom:1px solid #e2e8f0;background:#f8fafc !important;}
  .totals-row:last-child{border-bottom:none;}
  .totals-row.grand{background:#0d1b3e !important;color:#c8972a !important;}
  .t-label{color:#64748b !important;font-weight:500;}
  .t-value{font-weight:600;color:#1e293b !important;font-variant-numeric:tabular-nums;}
  .t-value.discount{color:#16a34a !important;}
  .info-box{border-radius:8px;padding:18px 20px;margin-top:16px;}
  .info-box.blue{background:#eff6ff !important;border:1px solid #bfdbfe;color:#1e3a8a !important;}
  .info-box.amber{background:#fffbeb !important;border:1px solid #fde68a;color:#92400e !important;}
  .info-box.red{background:#fef2f2 !important;border:1px solid #fecaca;color:#991b1b !important;}
  .info-box.green{background:#f0fdf4 !important;border:1px solid #bbf7d0;color:#166534 !important;}
  .info-box-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;color:inherit !important;}
  .info-row{display:flex;font-size:13px;margin-bottom:8px;gap:8px;}
  .info-row:last-child{margin-bottom:0;}
  .info-key{color:#64748b !important;min-width:120px;font-weight:500;}
  .info-val{color:#1e293b !important;font-weight:600;}
  .em-footer{background:#0d1b3e !important;padding:22px 36px;color:#94a3b8 !important;}
  .em-footer-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;}
  .em-footer-brand{color:#c8972a !important;font-size:13px;font-weight:700;letter-spacing:1px;}
  .em-footer-contact{color:#94a3b8 !important;font-size:12px;line-height:1.7;text-align:right;}
  .em-footer-legal{border-top:1px solid #1e3a6e;padding-top:14px;color:#475569 !important;font-size:11px;text-align:center;line-height:1.7;}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.5px;}
  .badge.green{background:#dcfce7 !important;color:#166534 !important;}
  .badge.red{background:#fee2e2 !important;color:#991b1b !important;}
  .badge.blue{background:#dbeafe !important;color:#1e40af !important;}
  .badge.amber{background:#fef3c7 !important;color:#92400e !important;}
  .section-heading{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#94a3b8 !important;margin-bottom:14px;}
  @media only screen and (max-width:640px){
    .em-outer{padding:12px 0 !important;}
    .em-wrap{border-radius:0 !important;box-shadow:none !important;}
    .em-accent{height:3px !important;}
    .em-brand{padding:12px 16px !important;display:block !important;text-align:left !important;}
    .em-brand h2{font-size:14px !important;letter-spacing:0.4px !important;}
    .em-status{padding:20px 16px !important;background:#0d1b3e !important;}
    .em-status .status-icon{display:inline-block !important;padding:10px 16px !important;font-size:12px !important;margin-bottom:12px !important;}
    .em-status h1{font-size:18px !important;line-height:1.3 !important;}
    .em-status p{font-size:13px !important;max-width:none !important;}
    .em-body{padding:0 16px 20px !important;background:#ffffff !important;}
    .em-divider{margin:16px 0 !important;}
    .meta-grid,.meta-cell{display:block !important;width:100% !important;}
    .meta-cell{border-right:none !important;border-bottom:1px solid #e2e8f0 !important;padding:10px 12px !important;}
    .info-row{display:block !important;}
    .info-key{display:block !important;min-width:0 !important;margin-bottom:2px !important;}
    .totals-row{padding:10px 12px !important;font-size:12px !important;}
    th,td{padding:8px 6px !important;font-size:11px !important;}
    .em-footer{padding:16px 12px !important;background:#0d1b3e !important;}
    .em-footer-row{display:block !important;}
    .em-footer-contact{text-align:left !important;margin-top:8px !important;}
  }
`;

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure || config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  async send(to, subject, html, text = null) {
    try {
      const fromAddress = config.email.from || (config.email.user ? `"${config.store.name}" <${config.email.user}>` : null);
      if (!fromAddress) {
        throw new Error('Email sender not configured: set EMAIL_FROM or SMTP_USER');
      }

      const mailOptions = {
        from: fromAddress,
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
  <div class="em-brand" style="background:#ffffff !important;padding:16px 36px;text-align:left;border-bottom:2px solid #0d1b3e;display:flex;align-items:center;gap:12px;">
    <div style="background:#0d1b3e !important;color:#c8972a !important;font-size:20px;font-weight:700;padding:8px 12px;border-radius:4px;min-width:40px;text-align:center;">MK</div>
    <h2 style="color:#0d1b3e !important;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;">${config.store.name}</h2>
  </div>
  <div class="em-status" style="background:#eff6ff !important;border-bottom:1px solid #bfdbfe;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px;">
    <h1 style="color:#1e3a8a !important;text-align:center;margin:0 0 8px 0;">Your OTP Code</h1>
    <p style="text-align:center;color:#0d1b3e !important;margin:0;">Hi <strong>${userName}</strong>, use this code to complete your login.</p>
  </div>
  <div class="em-body" style="padding-top:24px;text-align:center;">
    <div style="background:#fff !important;border:2px solid #0d1b3e;border-radius:12px;padding:24px;margin:20px auto;max-width:340px;">
      <div class="meta-label" style="margin-bottom:8px;color:#64748b !important;font-size:14px;letter-spacing:2px;text-align:center;">YOUR OTP CODE</div>
      <div style="font-size:42px;font-weight:700;color:#0d1b3e !important;letter-spacing:8px;font-family:monospace;text-align:center;">${otp}</div>
    </div>
    <div class="info-box amber" style="background:#fffbeb !important;border:1px solid #fde68a;text-align:left;padding:16px 20px;border-radius:8px;margin-top:16px;">
      <div class="info-box-title" style="color:#92400e !important;font-weight:600;margin-bottom:6px;text-align:center;">SECURITY INFORMATION</div>
      <ul style="font-size:15px;color:#78350f !important;line-height:1.9;margin:0 auto;padding-left:20px;max-width:340px;text-align:left;">
        <li>This OTP is valid for <strong>${config.otp.expiryMinutes} minutes</strong></li>
        <li>Do not share this code with anyone</li>
        <li>If you didn't request this, please ignore this email</li>
      </ul>
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand" style="color:#c8972a !important;">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b !important;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact" style="color:#94a3b8 !important;">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal" style="color:#475569 !important;">This is an auto-generated email. Please do not reply.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.</div>
  </div>
  </div></div></body></html>`;
    // Removed stray HTML tags outside template string

    return this.send(email, `Your OTP Code - ${config.store.name}`, html);
  }

  // Send order confirmation email to customer
  async sendOrderConfirmation(order, user) {
    const invoice = await Invoice.getFullInvoice(order.id);
    if (!invoice || !user.email) return { success: false, reason: 'No email or invoice' };

    const itemsHtml = invoice.items.map((item, idx) => `
      <tr>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};">
          <span style="font-weight:500;color:#1e293b !important;display:block;">${item.product_name}</span>
          ${item.variant ? `<span style="display:inline-block;margin-top:3px;padding:1px 7px;background:#e0e7ff !important;color:#3730a3 !important;font-size:11px;font-weight:600;border-radius:4px;">${item.variant}</span>` : ''}
        </td>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:center;color:#374151 !important;">${item.quantity} ${item.unit_type}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;color:#374151 !important;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.unit_price).toFixed(2)}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-weight:600;color:#14532d !important;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.total).toFixed(2)}</td>
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
  <div class="em-brand" style="background:#ffffff !important;padding:16px 36px;text-align:left;border-bottom:2px solid #0d1b3e;display:flex;align-items:center;gap:12px;">
    <div style="background:#0d1b3e;color:#c8972a !important;font-size:20px;font-weight:700;padding:8px 12px;border-radius:4px;min-width:40px;text-align:center;">MK</div>
    <h2 style="color:#0d1b3e !important;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;">${config.store.name}</h2>
  </div>
  <div class="em-status" style="background:#f8fafc !important;border-bottom:none;padding:28px 36px;text-align:center;">
    <h1 style="color:#0d1b3e !important;font-size:24px;font-weight:700;margin-bottom:8px;letter-spacing:-0.5px;">Your Order is Confirmed</h1>
    <p style="color:#64748b !important;font-size:14px;margin-bottom:0;line-height:1.6;">Thank you for your order! We've received it and will notify you when it's ready for pickup.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div class="section-heading">YOUR DETAILS</div>
    <div style="background:#ffffff !important;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div class="meta-grid">
        <div class="meta-cell" style="border-bottom:1px solid #e2e8f0;"><div class="meta-label">Order Number</div><div class="meta-value" style="font-size:15px;font-weight:700;color:#c8972a !important;">${order.order_number}</div></div>
        <div class="meta-cell" style="border-bottom:1px solid #e2e8f0;"><div class="meta-label">Delivery Method</div><div class="meta-value" style="font-size:15px;">Store Pickup</div></div>
      </div>
      <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Order Date</div><div class="meta-value">${new Date(order.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
        <div class="meta-cell"><div class="meta-label">Status</div><div class="meta-value"><span class="badge green">Confirmed</span></div></div>
      </div>
    </div>
    <div class="em-divider" style="margin:24px 0;"></div>
    <div class="section-heading">ORDER SUMMARY</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:13px;">
      <thead><tr>
        <th style="background:#0d1b3e !important;color:#c8b88a !important;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:12px 14px;text-align:left;">Product</th>
        <th style="background:#0d1b3e !important;color:#c8b88a !important;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:12px 14px;text-align:center;">Qty</th>
        <th style="background:#0d1b3e !important;color:#c8b88a !important;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:12px 14px;text-align:right;">Price</th>
        <th style="background:#0d1b3e !important;color:#c8b88a !important;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:12px 14px;text-align:right;">Total</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top:16px;border:1px solid #e2e8f0;border-radius:8px;padding:20px;background:#f8fafc !important;">
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;background:transparent;">
        <span style="color:#475569 !important;font-weight:500;">Subtotal</span>
        <span style="color:#1e293b !important;font-weight:600;font-variant-numeric:tabular-nums;">&#8377;${subtotal}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;background:transparent;">
        <span style="color:#475569 !important;font-weight:500;">CGST (9%)</span>
        <span style="color:#1e293b !important;font-weight:600;font-variant-numeric:tabular-nums;">&#8377;${cgst}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;background:transparent;">
        <span style="color:#475569 !important;font-weight:500;">SGST (9%)</span>
        <span style="color:#1e293b !important;font-weight:600;font-variant-numeric:tabular-nums;">&#8377;${sgst}</span>
      </div>
      ${hasPromo ? `<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;background:transparent;">
        <span style="color:#475569 !important;font-weight:500;">Discount</span>
        <span style="color:#16a34a !important;font-weight:700;font-variant-numeric:tabular-nums;">- &#8377;${promoDisc}</span>
      </div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:14px 0;margin-top:6px;background:transparent;border:none;">
        <span style="color:#1e293b !important;font-weight:700;font-size:15px;">Total Amount</span>
        <span style="font-size:18px;font-weight:700;color:#0d1b3e !important;font-variant-numeric:tabular-nums;">&#8377;${total}</span>
      </div>
    </div>
    <div class="em-divider" style="margin:24px 0;"></div>
    <div class="info-box blue" style="background:#eff6ff !important;border:1px solid #bfdbfe;border-radius:8px;padding:20px;">
      <div class="info-box-title" style="color:#1d4ed8 !important;text-transform:uppercase;font-size:11px;margin-bottom:12px;">Pickup Information</div>
      <div class="info-row"><span class="info-key" style="color:#64748b !important;font-weight:600;">Store</span><span class="info-val" style="color:#1e293b !important;font-weight:600;">${config.store.name}</span></div>
      ${config.store.address ? `<div class="info-row"><span class="info-key" style="color:#64748b !important;font-weight:600;">Address</span><span class="info-val" style="color:#1e293b !important;font-weight:600;">${config.store.address}</span></div>` : ''}
      ${config.store.phone ? `<div class="info-row"><span class="info-key" style="color:#64748b !important;font-weight:600;">Phone</span><span class="info-val" style="color:#0d1b3e !important;font-weight:700;">${config.store.phone}</span></div>` : ''}
      <div class="info-row" style="margin-top:12px;padding-top:12px;border-top:1px solid #bfdbfe;"><span class="info-key" style="color:#1d4ed8 !important;font-weight:600;min-width:auto;">Note:</span><span class="info-val" style="color:#1e40af !important;">Keep your order number handy. Present it or this email at the counter.</span></div>
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b !important;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
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

    // Fetch full invoice with items so we can list them in the email
    const invoice = await Invoice.getFullInvoice(order.id).catch(() => null);
    const readyItemsHtml = invoice && invoice.items && invoice.items.length > 0
      ? invoice.items.map((item, idx) => `
      <tr>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};">
          <span style="font-weight:500;color:#1e293b !important;display:block;">${item.product_name}</span>
          ${item.variant ? `<span style="display:inline-block;margin-top:3px;padding:1px 7px;background:#dbeafe !important;color:#1d4ed8 !important;font-size:11px;font-weight:600;border-radius:4px;">${item.variant}</span>` : ''}
        </td>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:center;color:#374151 !important;">x${item.quantity}</td>
        <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-weight:600;color:#14532d !important;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.total).toFixed(2)}</td>
      </tr>`).join('')
      : `<tr><td colspan="3" style="padding:14px;text-align:center;color:#94a3b8 !important;font-size:13px;">See order confirmation for item details</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Ready</title><style>${BASE_STYLES}</style></head>
<body><div class="em-outer"><div class="em-wrap">
  <div class="em-accent"></div>
  <div class="em-brand" style="background:#ffffff !important;padding:16px 36px;text-align:left;border-bottom:2px solid #0d1b3e;display:flex;align-items:center;gap:12px;">
    <div style="background:#0d1b3e;color:#c8972a !important;font-size:20px;font-weight:700;padding:8px 12px;border-radius:4px;min-width:40px;text-align:center;">MK</div>
    <h2 style="color:#0d1b3e !important;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;">${config.store.name}</h2>
  </div>
  <div class="em-status">
    <div class="status-icon">ORDER READY</div>
    <h1>Your Order Awaits</h1>
    <p>Hello <strong>${user.name}</strong>, your order is packed and ready to collect from our store.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div style="background:#f8fafc !important;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Order Number</div><div class="meta-value">${order.order_number}</div></div>
        <div class="meta-cell"><div class="meta-label">Order Total</div><div class="meta-value">&#8377;${parseFloat(order.total_amount||0).toFixed(2)}</div></div>
      </div>
    </div>
    <div class="em-divider"></div>
    <div class="section-heading">Your Items</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:13px;">
      <thead><tr>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:left;">Product</th>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:center;">Qty</th>
        <th style="background:#0d1b3e;color:#c8b88a;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;padding:11px 14px;text-align:right;">Amount</th>
      </tr></thead>
      <tbody>${readyItemsHtml}</tbody>
    </table>
    <div class="em-divider"></div>
    <div class="info-box blue" style="background:#eff6ff !important;border:1px solid #bfdbfe;">
      <div class="info-box-title" style="color:#1d4ed8 !important;">Pickup Details</div>
      <div class="info-row"><span class="info-key">Store</span><span class="info-val">${config.store.name}</span></div>
      ${config.store.address ? `<div class="info-row"><span class="info-key">Address</span><span class="info-val">${config.store.address}</span></div>` : ''}
      ${config.store.phone ? `<div class="info-row"><span class="info-key">Phone</span><span class="info-val">${config.store.phone}</span></div>` : ''}
      <div class="info-row" style="margin-top:12px;padding-top:12px;border-top:1px solid #bfdbfe;">
        <span class="info-key" style="color:#1d4ed8 !important;">Note</span>
        <span class="info-val" style="color:#1e40af !important;">Please present this email or your order number at the counter.</span>
      </div>
    </div>
    <div class="em-divider"></div>
    <p style="font-size:13px;color:#64748b !important;text-align:center;line-height:1.7;">
      For any queries, please contact us at <strong style="color:#1e293b !important;">${config.store.phone || config.store.email || 'the store'}</strong>.
    </p>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b !important;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">This is an auto-generated notification. Please do not reply to this email.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.</div>
  </div>
</div></div></body></html>`;

    return this.send(user.email, `Your Order is Ready - ${order.order_number} | ${config.store.name}`, html);
  }

  // Send new order email to store admin
  // adminEmails: string | string[] — pass all admin emails; falls back to ADMIN_EMAIL env
  async sendAdminOrderNotification(order, user, adminEmails = null) {
    // Resolve recipient list
    let recipients = [];
    if (Array.isArray(adminEmails) && adminEmails.length) {
      recipients = adminEmails;
    } else if (typeof adminEmails === 'string' && adminEmails) {
      recipients = [adminEmails];
    } else {
      const fallback = config.email.adminEmail || config.adminEmail;
      if (fallback) recipients = [fallback];
    }
    if (!recipients.length) return { success: false, reason: 'No admin email' };

    const invoice = await Invoice.getFullInvoice(order.id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Helper: resolve product image to an absolute URL usable in emails
    const resolveImgUrl = (url) => {
      if (!url) return null;
      if (/^https?:\/\//.test(url)) return url;
      return `${frontendUrl}/api/img?url=${encodeURIComponent(url)}`;
    };

    // Packing list — large visual cards showing what to pack
    const packingListHtml = invoice && invoice.items
      ? invoice.items.map((item) => {
          const imgUrl = resolveImgUrl(item.image_url);
          const imgBlock = imgUrl
            ? `<img src="${imgUrl}" alt="${item.product_name}" width="72" height="72"
                    style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;display:block;">`
            : `<div style="width:72px;height:72px;border-radius:8px;border:1px solid #e2e8f0;background:#f1f5f9;
                           display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#64748b !important;letter-spacing:0.6px;">NO IMAGE</div>`;
          return `
            <div style="display:flex;align-items:center;gap:16px;padding:12px 16px;border-bottom:1px solid #f1f5f9;background:#ffffff !important;">
              ${imgBlock}
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:14px;color:#1e293b !important;line-height:1.3;margin-bottom:4px;">${item.product_name}</div>
                <div style="font-size:12px;color:#64748b !important;">${item.unit_type}</div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-size:22px;font-weight:800;color:#0d1b3e !important;line-height:1;">${item.quantity}</div>
                <div style="font-size:11px;color:#94a3b8 !important;margin-top:2px;">to pack</div>
              </div>
            </div>`;
        }).join('')
      : `<div style="padding:16px;text-align:center;color:#94a3b8 !important;">Item details unavailable</div>`;

    const itemsHtml = invoice && invoice.items
      ? invoice.items.map((item, idx) => `
          <tr>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};font-weight:500;color:#1e293b !important;">${item.product_name}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:center;color:#374151 !important;">${item.quantity} ${item.unit_type}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.unit_price).toFixed(2)}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-variant-numeric:tabular-nums;">&#8377;${(parseFloat(item.cgst_amount||0)+parseFloat(item.sgst_amount||0)).toFixed(2)}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-weight:600;color:#1e293b !important;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.total).toFixed(2)}</td>
          </tr>`).join('')
      : `<tr><td colspan="5" style="padding:16px;text-align:center;color:#94a3b8 !important;">Item details unavailable</td></tr>`;

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
  <div class="em-brand" style="background:#ffffff !important;padding:16px 36px;text-align:left;border-bottom:2px solid #0d1b3e;display:flex;align-items:center;gap:12px;">
    <div style="background:#0d1b3e;color:#c8972a !important;font-size:20px;font-weight:700;padding:8px 12px;border-radius:4px;min-width:40px;text-align:center;">MK</div>
    <h2 style="color:#0d1b3e !important;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;">${config.store.name}</h2>
  </div>
  <div class="em-status">
    <div class="status-icon">NEW ORDER</div>
    <h1>Order Received</h1>
    <p>A new order has been placed and requires your immediate attention.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div style="background:#f8fafc !important;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Order Number</div><div class="meta-value" style="color:#c8972a !important;">${order.order_number}</div></div>
        <div class="meta-cell"><div class="meta-label">Invoice Number</div><div class="meta-value">${invNum}</div></div>
      </div>
      <div style="border-top:1px solid #e2e8f0;" class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Date &amp; Time</div><div class="meta-value">${orderDate}</div></div>
        <div class="meta-cell"><div class="meta-label">Status</div><div class="meta-value"><span class="badge amber">Pending</span></div></div>
      </div>
    </div>
    <div class="em-divider"></div>
    <div class="section-heading">Customer Information</div>
    <div class="info-box blue" style="background:#eff6ff !important;border:1px solid #bfdbfe;">
      <div class="info-box-title" style="color:#1d4ed8 !important;">Customer Details</div>
      <div class="info-row"><span class="info-key">Full Name</span><span class="info-val">${user.name}</span></div>
      ${user.email ? `<div class="info-row"><span class="info-key">Email</span><span class="info-val">${user.email}</span></div>` : ''}
      ${user.phone ? `<div class="info-row"><span class="info-key">Phone</span><span class="info-val">${user.phone}</span></div>` : ''}
      <div class="info-row"><span class="info-key">Customer Type</span><span class="info-val"><span class="badge blue">${custType}</span></span></div>
    </div>
    <div class="em-divider"></div>
    <div class="section-heading">Packing List</div>
    <div style="border:2px solid #0d1b3e;border-radius:10px;overflow:hidden;">
      <div style="background:#0d1b3e;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
        <span style="color:#c8b88a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Product</span>
        <span style="color:#c8b88a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Qty to Pack</span>
      </div>
      ${packingListHtml}
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
      <div class="totals-row grand"><span class="t-label" style="color:#e2e8f0;font-weight:700;">Grand Total</span><span class="t-value" style="font-size:18px;font-weight:700;color:#c8972a !important;">&#8377;${total.toFixed(2)}</span></div>
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b !important;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">Auto-generated admin notification. Generated at ${new Date().toLocaleString('en-IN')}.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. Confidential - for internal use only.</div>
  </div>
</div></div></body></html>`;

    // Send to every admin — fire all in parallel, resolve even if some fail
    const subject = `[NEW ORDER] ${order.order_number} - Rs.${total.toFixed(2)} | ${config.store.name}`;
    const results = await Promise.allSettled(recipients.map(to => this.send(to, subject, html)));
    const sent = results.filter(r => r.status === 'fulfilled').length;
    return { success: sent > 0, sent, total: recipients.length };
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
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};font-weight:500;color:#1e293b !important;">${item.product_name || item.name || 'Product'}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:center;color:#374151 !important;">${item.quantity}</td>
            <td style="padding:11px 14px;border-bottom:1px solid #f1f5f9;background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'};text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">&#8377;${parseFloat(item.total||item.subtotal||0).toFixed(2)}</td>
          </tr>`).join('')
      : `<tr><td colspan="3" style="padding:16px;text-align:center;color:#94a3b8 !important;">Item details unavailable</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Cancelled</title><style>${BASE_STYLES}</style></head>
<body><div class="em-outer"><div class="em-wrap">
  <div class="em-accent"></div>
  <div class="em-brand" style="background:#ffffff !important;padding:16px 36px;text-align:left;border-bottom:2px solid #0d1b3e;display:flex;align-items:center;gap:12px;">
    <div style="background:#0d1b3e;color:#c8972a !important;font-size:20px;font-weight:700;padding:8px 12px;border-radius:4px;min-width:40px;text-align:center;">MK</div>
    <h2 style="color:#0d1b3e !important;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;">${config.store.name}</h2>
  </div>
  <div class="em-status">
    <div class="status-icon">CANCELLED</div>
    <h1>Order Cancelled</h1>
    <p>An order has been cancelled by the customer. Please review the details below.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div style="background:#f8fafc !important;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
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
    <div class="info-box blue" style="background:#eff6ff !important;border:1px solid #bfdbfe;">
      <div class="info-box-title" style="color:#1d4ed8 !important;">Customer Details</div>
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
      ${config.store.gst ? `<div style="color:#64748b !important;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
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
  <div class="em-accent"></div>
  <div class="em-brand" style="background:#ffffff !important;padding:16px 36px;text-align:left;border-bottom:2px solid #0d1b3e;display:flex;align-items:center;gap:12px;">
    <div style="background:#0d1b3e;color:#c8972a !important;font-size:20px;font-weight:700;padding:8px 12px;border-radius:4px;min-width:40px;text-align:center;">MK</div>
    <h2 style="color:#0d1b3e !important;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;">${config.store.name}</h2>
  </div>
  <div class="em-status">
    <div class="status-icon">CANCELLED</div>
    <h1>Cancellation Confirmed</h1>
    <p>Dear <strong>${user.name}</strong>, your order has been successfully cancelled as requested.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div style="background:#f8fafc !important;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
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
    <div class="info-box blue" style="background:#eff6ff !important;border:1px solid #bfdbfe;">
      <div class="info-box-title" style="color:#1d4ed8 !important;">Need Help?</div>
      <p style="font-size:13px;color:#1e40af !important;line-height:1.7;">If you have questions or wish to place a new order, please reach out to us.</p>
      <div class="info-row" style="margin-top:10px;"><span class="info-key">Store</span><span class="info-val">${config.store.name}</span></div>
      ${config.store.phone ? `<div class="info-row"><span class="info-key">Phone</span><span class="info-val">${config.store.phone}</span></div>` : ''}
      ${config.store.address ? `<div class="info-row"><span class="info-key">Address</span><span class="info-val">${config.store.address}</span></div>` : ''}
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b !important;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">This is an auto-generated confirmation. Please do not reply to this email.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.</div>
  </div>
</div></div></body></html>`;

    return this.send(user.email, `Order Cancellation Confirmed - ${order.order_number} | ${config.store.name}`, html);
  }

  /**
   * Send an account-merge verification OTP.
   * @param {string}  email           – recipient address
   * @param {string}  otp             – plain 6-digit code
   * @param {string}  userName        – display name
   * @param {boolean} isPrimaryAccount – true = this is the NEW account email; false = EXISTING account
   */
  async sendMergeOTP(email, otp, userName = 'Customer', isPrimaryAccount = true) {
    if (!email) return { success: false, reason: 'No email provided' };

    const roleLabel = isPrimaryAccount ? 'New Account' : 'Existing Account';
    const context   = isPrimaryAccount
      ? 'You attempted to register with a phone number that is already linked to another account.'
      : 'Someone is attempting to merge a new sign-in into your existing account.';
    const warningHtml = !isPrimaryAccount ? `
      <div class="info-box amber" style="margin-bottom:12px;">
        <div class="info-box-title" style="color:#92400e !important;">Security Notice</div>
        <p style="font-size:13px;color:#78350f !important;line-height:1.7;">
          If you did <strong>not</strong> initiate this request, please ignore this email.
          Do NOT share this code with anyone. The code expires in 5 minutes.
        </p>
      </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Account Merge Verification</title><style>${BASE_STYLES}</style></head>
<body><div class="em-outer"><div class="em-wrap">
  <div class="em-accent"></div>
  <div class="em-brand" style="background:#ffffff !important;padding:16px 36px;text-align:left;border-bottom:2px solid #0d1b3e;display:flex;align-items:center;gap:12px;">
    <div style="background:#0d1b3e;color:#c8972a !important;font-size:20px;font-weight:700;padding:8px 12px;border-radius:4px;min-width:40px;text-align:center;">MK</div>
    <h2 style="color:#0d1b3e !important;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;">${config.store.name}</h2>
  </div>
  <div class="em-status">
    <div class="status-icon">MERGE</div>
    <h1>Verify Your ${roleLabel}</h1>
    <p>Hi <strong>${userName}</strong>, use the code below to authorise the account merge.</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    ${warningHtml}
    <p style="font-size:14px;color:#475569 !important;margin-bottom:16px;">${context}</p>
    <div style="background:#eff6ff !important;border:2px dashed #93c5fd;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#3b82f6;margin-bottom:8px;">
        Verification Code (${roleLabel})
      </div>
      <div style="font-size:40px;font-weight:900;letter-spacing:8px;color:#1e3a8a !important;font-family:monospace;">
        ${otp}
      </div>
      <div style="font-size:12px;color:#64748b !important;margin-top:8px;">Expires in 5 minutes · Single use only</div>
    </div>
    <div class="info-box red" style="margin-top:0;">
      <div class="info-box-title" style="color:#991b1b;">Both accounts must confirm</div>
      <p style="font-size:13px;color:#7f1d1d;line-height:1.7;">
        The merge will only proceed if verification codes for <strong>both</strong> email addresses are entered correctly.
        If only one code is confirmed, no merge will happen.
      </p>
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div></div>
      <div class="em-footer-contact">${config.store.phone || ''}${config.store.email ? `<br>${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">This is an auto-generated security email. Do not reply.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.</div>
  </div>
</div></div></body></html>`;

    return this.send(email, `Account Merge Verification (${roleLabel}) | ${config.store.name}`, html);
  }

  /**
   * Send a stock alert email to admin(s).
   * @param {string[]} adminEmails  – list of admin email addresses
   * @param {object}   product      – product row containing id, name, stock_quantity, low_stock_threshold, sku, variant
   * @param {'low'|'out'} alertType – 'low' = below threshold, 'out' = zero stock
   */
  async sendStockAlert(adminEmails, product, alertType = 'low') {
    if (!adminEmails || !adminEmails.length) return { success: false, reason: 'No admin emails' };

    const isOut    = alertType === 'out';
    const stock    = product.stock_quantity ?? 0;
    const thresh   = product.low_stock_threshold ?? 10;
    const name     = product.name || product.name_en || 'Unknown Product';
    const variant  = product.variant || product.unit_pack_size || product.unit || '';
    const sku      = product.sku || '';
    const label    = isOut ? 'Out of Stock' : 'Low Stock Alert';
    const accentBg = 'background:linear-gradient(90deg,#0d1b3e 0%,#c8972a 100%);';
    const statusBg = 'background:#0d1b3e !important;border-bottom:none;';
    const iconBg   = 'background:#ffffff !important;';
    const iconColor= 'color:#c8972a !important;';
    const icon     = isOut ? 'ALERT' : 'LOW';
    const h1Color  = 'color:#c8972a !important;';
    const badge    = `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#c8972a !important;color:#0d1b3e !important;">${isOut ? 'OUT OF STOCK' : 'LOW STOCK'}</span>`;
    const bodyNote = isOut
      ? 'This product has run out of stock and is no longer visible to customers. Please restock immediately.'
      : `This product has fallen below its minimum stock threshold of <strong>${thresh} units</strong>. Please arrange restocking soon.`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const dashboardUrl = `${frontendUrl}/admin/dashboard`;

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${label} - ${config.store.name}</title><style>${BASE_STYLES}</style></head>
<body><div class="em-outer"><div class="em-wrap">
  <div class="em-accent" style="${accentBg}"></div>
  <div class="em-brand" style="background:#ffffff !important;padding:16px 36px;text-align:left;border-bottom:2px solid #0d1b3e;display:flex;align-items:center;gap:12px;">
    <div style="background:#0d1b3e;color:#c8972a !important;font-size:20px;font-weight:700;padding:8px 12px;border-radius:4px;min-width:40px;text-align:center;">MK</div>
    <h2 style="color:#0d1b3e !important;font-size:18px;font-weight:700;letter-spacing:1px;margin:0;">${config.store.name}</h2>
  </div>
  <div class="em-status">
    <div class="status-icon">${icon} STOCK</div>
    <h1>${label}</h1>
    <p>${bodyNote}</p>
  </div>
  <div class="em-body" style="padding-top:24px;">
    <div style="background:#f8fafc !important;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Product Name</div><div class="meta-value">${name}</div></div>
        <div class="meta-cell"><div class="meta-label">Status</div><div class="meta-value">${badge}</div></div>
      </div>
      <div style="border-top:1px solid #e2e8f0;" class="meta-grid">
        <div class="meta-cell"><div class="meta-label">Current Stock</div><div class="meta-value" style="${isOut ? 'color:#dc2626;' : 'color:#d97706;'}font-size:22px;font-weight:800;">${stock} units</div></div>
        <div class="meta-cell"><div class="meta-label">Min. Threshold</div><div class="meta-value">${thresh} units</div></div>
      </div>
      ${variant || sku ? `<div style="border-top:1px solid #e2e8f0;" class="meta-grid">
        ${variant ? `<div class="meta-cell"><div class="meta-label">Variant / Size</div><div class="meta-value">${variant}</div></div>` : '<div class="meta-cell"></div>'}
        ${sku ? `<div class="meta-cell"><div class="meta-label">SKU</div><div class="meta-value" style="font-family:monospace;font-size:12px;">${sku}</div></div>` : '<div class="meta-cell"></div>'}
      </div>` : ''}
    </div>
    <div class="em-divider"></div>
    <div style="text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#0d1b3e;color:#c8972a !important;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;">
        Go to Admin Dashboard
      </a>
      <p style="font-size:12px;color:#94a3b8 !important;margin-top:10px;">Update stock from Products tab</p>
    </div>
  </div>
  <div class="em-footer">
    <div class="em-footer-row">
      <div><div class="em-footer-brand">${config.store.name}</div>
      ${config.store.gst ? `<div style="color:#64748b !important;font-size:12px;margin-top:3px;">GSTIN: ${config.store.gst}</div>` : ''}</div>
      <div class="em-footer-contact">${config.store.phone ? `${config.store.phone}<br>` : ''}${config.store.email ? `${config.store.email}` : ''}</div>
    </div>
    <div class="em-footer-legal">Auto-generated inventory alert. Sent at ${new Date().toLocaleString('en-IN')}.<br>&copy; ${new Date().getFullYear()} ${config.store.name}. Confidential - for internal use only.</div>
  </div>
</div></div></body></html>`;

    const subject = isOut
      ? `[OUT OF STOCK] ${name}${variant ? ' - ' + variant : ''} | ${config.store.name}`
      : `[LOW STOCK] ${name}${variant ? ' - ' + variant : ''} - ${stock} units left | ${config.store.name}`;

    const results = await Promise.allSettled(adminEmails.map(to => this.send(to, subject, html)));
    const sent = results.filter(r => r.status === 'fulfilled').length;
    return { success: sent > 0, sent, total: adminEmails.length };
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
