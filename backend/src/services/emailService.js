const nodemailer = require('nodemailer');
const config = require('../config');
const { Invoice } = require('../models');
const logger = require('../utils/logger');

// Optional test override: set FORCE_EMAIL_TO to route all emails temporarily.
const FORCED_EMAIL_RECIPIENT = process.env.FORCE_EMAIL_TO || '';

const BASE_STYLES = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #f3f6fa; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }
  .wrap { width: 100%; padding: 22px 10px; }
  .card { width: 100%; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #d9e2ec; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.08); }
  .card.tone-neutral { border-top: 4px solid #334155; }
  .card.tone-success { border-top: 4px solid #15803d; }
  .card.tone-warning { border-top: 4px solid #b45309; }
  .card.tone-danger { border-top: 4px solid #b91c1c; }
  .top { padding: 14px 20px; border-bottom: 1px solid #e2e8f0; background: #ffffff; }
  .top.tone-neutral { background: #ffffff; }
  .top.tone-success { background: #f8fdf9; }
  .top.tone-warning { background: #fffdf7; }
  .top.tone-danger { background: #fff8f8; }
  .brand-row { display: flex; align-items: center; }
  .brand { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: 0.1px; }
  .brand-sub { margin-top: 2px; color: #64748b; font-size: 11px; letter-spacing: 0.3px; text-transform: uppercase; }
  .hero { padding: 16px 20px 12px; border-bottom: 1px solid #e8eef6; }
  .hero.tone-neutral { background: #f8fafc; }
  .hero.tone-success { background: #f0fdf4; }
  .hero.tone-warning { background: #fffbeb; }
  .hero.tone-danger { background: #fff1f2; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #e2e8f0; color: #334155; margin-bottom: 8px; }
  .badge.neutral { background: #e2e8f0; color: #334155; }
  .badge.success { background: #dcfce7; color: #166534; }
  .badge.warning { background: #fef3c7; color: #92400e; }
  .badge.danger { background: #fee2e2; color: #991b1b; }
  h1 { margin: 0; font-size: 24px; line-height: 1.2; color: #0f172a; letter-spacing: -0.2px; }
  .sub { margin-top: 8px; color: #475569; font-size: 14px; line-height: 1.6; }
  .body { padding: 18px 20px 20px; }
  .box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; background: #ffffff; }
  .box.soft { background: #f8fafc; }
  .muted { color: #64748b; font-size: 13px; }
  .stat-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .stat-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #ffffff; }
  .stat-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .stat-card .value { font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.2; }
  .chip { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .chip-danger { background: #fee2e2; color: #991b1b; }
  .chip-warning { background: #fef3c7; color: #92400e; }
  .callout { border-radius: 10px; padding: 12px 14px; border: 1px solid #e2e8f0; }
  .callout-danger { background: #fff1f2; border-color: #fecdd3; }
  .callout-warning { background: #fffbeb; border-color: #fde68a; }
  .list { margin: 0; padding-left: 18px; color: #334155; font-size: 13px; line-height: 1.7; }
  .kv { margin-top: 10px; }
  .kv-item { padding: 8px 0; border-bottom: 1px dashed #dbe4ee; font-size: 14px; color: #0f172a; }
  .kv-item:last-child { border-bottom: none; }
  .kv-label { color: #64748b; font-weight: 700; }
  .pill { display: inline-block; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .pill-danger { background: #fee2e2; color: #991b1b; }
  .pill-warning { background: #fef3c7; color: #92400e; }
  .metric-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
  .metric-box { border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff; padding: 10px; }
  .metric-label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  .metric-value { margin-top: 4px; color: #0f172a; font-size: 16px; font-weight: 700; }
  .panel-danger { border: 1px solid #fecdd3; background: #fff1f2; border-radius: 10px; padding: 12px; }
  .panel-warning { border: 1px solid #fde68a; background: #fffbeb; border-radius: 10px; padding: 12px; }
  .otp { margin-top: 8px; font-size: 36px; letter-spacing: 6px; font-weight: 700; color: #0f172a; text-align: center; }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #eef2f7; font-size: 14px; }
  .row:last-child { border-bottom: none; }
  .k { color: #64748b; }
  .v { color: #0f172a; font-weight: 600; text-align: right; }
  table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  th { text-align: left; color: #475569; background: #f8fafc; font-weight: 700; }
  td.num, th.num { text-align: right; }
  .footer { padding: 14px 20px 18px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; line-height: 1.7; background: #f8fafc; }
  .section { margin-top: 14px; }
  .section:first-child { margin-top: 0; }
  .btn { display: inline-block; text-decoration: none; background: #0f172a; color: #ffffff !important; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 700; }
  .ok { color: #15803d; font-weight: 700; }
  .warn { color: #b45309; font-weight: 700; }
  .danger { color: #b91c1c; font-weight: 700; }
  @media only screen and (max-width: 640px) {
    .wrap { padding: 10px 0; }
    .card { border-radius: 0; border-left: none; border-right: none; }
    .top, .hero, .body, .footer { padding-left: 14px; padding-right: 14px; }
    h1 { font-size: 20px; }
    .otp { font-size: 30px; letter-spacing: 4px; }
    th, td { padding: 8px 8px; font-size: 12px; }
    .stat-grid { grid-template-columns: 1fr; }
    .metric-row { grid-template-columns: 1fr; }
    .stat-card .value { font-size: 16px; }
  }
`;

const toCurrency = (n) => `Rs.${parseFloat(n || 0).toFixed(2)}`;

const getInvoiceSubjectRef = (invoice, order) => {
  const ref = invoice?.invoice_number || order?.invoice_number || invoice?.id || order?.invoice_id || null;
  return ref ? ` | Invoice: ${ref}` : '';
};

function htmlToText(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|h1|h2|h3|h4|h5|h6|tr|li)>/gi, '\n')
    .replace(/<\/span>\s*<span[^>]*>/gi, ' : ')
    .replace(/<\/strong>\s*/gi, ' ')
    .replace(/<\/td>\s*<td[^>]*>/gi, ' | ')
    .replace(/<\/th>\s*<th[^>]*>/gi, ' | ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderEmail({ title, subtitle, badge = '', content = '', footerNote = '', tone = 'neutral' }) {
  const storeName = config.store.name || 'MK Kirana Stores';
  const storePhone = config.store.phone || '';
  const storeEmail = config.store.email || '';
  const storeGst = config.store.gstNumber || config.store.gst || '';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${BASE_STYLES}</style></head>
<body>
  <div class="wrap">
    <div class="card tone-${tone}">
      <div class="top tone-${tone}">
        <div class="brand-row">
          <div>
            <div class="brand">${storeName}</div>
            <div class="brand-sub">Store Communication</div>
          </div>
        </div>
      </div>
      <div class="hero tone-${tone}">${badge ? `<span class="badge ${tone}">${badge}</span>` : ''}<h1>${title}</h1>${subtitle ? `<div class="sub">${subtitle}</div>` : ''}</div>
      <div class="body">${content}</div>
      <div class="footer">
        ${storePhone ? `${storePhone}<br>` : ''}${storeEmail ? `${storeEmail}<br>` : ''}
        ${storeGst ? `GST: ${storeGst}<br>` : ''}
        ${footerNote || 'Auto-generated email. Please do not reply.'}<br>
        &copy; ${new Date().getFullYear()} ${storeName}
      </div>
    </div>
  </div>
</body></html>`;
}

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

      const effectiveTo = FORCED_EMAIL_RECIPIENT || to;
      const mailOptions = {
        from: fromAddress,
        to: effectiveTo,
        subject,
        html,
        text: text || htmlToText(html),
      };

      // Keep original recipient visible only when override is active.
      if (FORCED_EMAIL_RECIPIENT) {
        logger.info(`Email routing override active: original=${to} forced=${FORCED_EMAIL_RECIPIENT}`);
      }

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Email send failed:', error);
      throw error;
    }
  }

  async sendOTP(email, otp, userName = 'Customer') {
    if (!email) return { success: false, reason: 'No email provided' };

    const html = renderEmail({
      badge: 'LOGIN OTP',
      title: 'Your verification code',
      subtitle: `Hi ${userName}, use this code to continue login.`,
      tone: 'warning',
      content: `
        <div class="box">
          <div class="muted" style="text-align:center;">Code valid for ${config.otp.expiryMinutes} minutes</div>
          <div class="otp">${otp}</div>
        </div>
        <div class="section muted">Do not share this OTP with anyone. If you did not request it, ignore this email.</div>
      `,
    });

    return this.send(email, `Your OTP Code - ${config.store.name}`, html);
  }

  async sendOrderConfirmation(order, user) {
    const invoice = await Invoice.getFullInvoice(order.id);
    if (!invoice || !user.email) return { success: false, reason: 'No email or invoice' };

    const rows = (invoice.items || []).map((item) => `
      <tr>
        <td>${item.product_name}${item.variant ? `<div class="muted">${item.variant}</div>` : ''}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${toCurrency(item.total)}</td>
      </tr>
    `).join('');

    const total = parseFloat(invoice.total_amount || order.total_amount || 0);
    const promoDisc = parseFloat(order.discount_amount || 0);

    const html = renderEmail({
      badge: 'ORDER CONFIRMED',
      title: `Order ${order.order_number} confirmed`,
      subtitle: 'Thank you. We received your order and will notify once ready for pickup.',
      tone: 'success',
      content: `
        <div class="box">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            <div><strong>Order Date : </strong>${new Date(order.created_at).toLocaleDateString('en-IN')}</div>
            <div><strong>Status : </strong><span class="ok">Confirmed</span></div>
            <div><strong>Total : </strong>${toCurrency(total)}</div>
          </div>
        </div>
        <div class="section">
          <div class="muted" style="margin-bottom:8px;font-weight:700;color:#334155;">Items Ordered</div>
          <table>
            <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="muted">No item details</td></tr>'}</tbody>
          </table>
        </div>
        ${promoDisc > 0 ? `<div class="section muted">Discount applied: ${toCurrency(promoDisc)}</div>` : ''}
      `,
    });

    const invoiceRef = getInvoiceSubjectRef(invoice, order);
    return this.send(user.email, `Order Confirmed - ${order.order_number}${invoiceRef} | ${config.store.name}`, html);
  }

  async sendOrderReadyNotification(order, user) {
    if (!user.email) return { success: false, reason: 'No email' };
    const invoice = await Invoice.getFullInvoice(order.id).catch(() => null);
    const rows = (invoice?.items || []).map((item) => `
      <tr>
        <td>${item.product_name}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${toCurrency(item.total)}</td>
      </tr>
    `).join('');

    const html = renderEmail({
      badge: 'READY FOR PICKUP',
      title: `Order ${order.order_number} is ready`,
      subtitle: `${user.name || 'Customer'}, your order is packed and waiting at the store.`,
      tone: 'success',
      content: `
        <div class="box">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            <div><strong>Order : </strong>${order.order_number}</div>
            <div><strong>Amount : </strong>${toCurrency(order.total_amount)}</div>
          </div>
        </div>
        <div class="section">
          <div class="muted" style="margin-bottom:8px;font-weight:700;color:#334155;">Items Ordered</div>
          <table>
            <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="muted">See your order details in app</td></tr>'}</tbody>
          </table>
        </div>
      `,
    });

    const invoiceRef = getInvoiceSubjectRef(invoice, order);
    return this.send(user.email, `Your Order is Ready - ${order.order_number}${invoiceRef} | ${config.store.name}`, html);
  }

  async sendOrderPickedUpNotification(order, user) {
    if (!user?.email) return { success: false, reason: 'No email' };
    const invoice = await Invoice.getFullInvoice(order.id).catch(() => null);
    const rows = (invoice?.items || []).map((item) => `
      <tr>
        <td>${item.product_name || 'Item'}</td>
        <td class="num">${item.quantity || 0}</td>
        <td class="num">${toCurrency(item.total || 0)}</td>
      </tr>
    `).join('');

    const html = renderEmail({
      badge: 'ORDER PICKED UP',
      title: `Order ${order.order_number} completed`,
      subtitle: `Thanks ${user.name || 'Customer'}, your order has been marked as picked up.`,
      tone: 'success',
      content: `
        <div class="box">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            <div><strong>Order : </strong>${order.order_number}</div>
            <div><strong>Total : </strong>${toCurrency(order.total_amount)}</div>
            <div><strong>Status : </strong><span class="ok">Picked Up</span></div>
          </div>
        </div>
        <div class="section">
          <div class="muted" style="margin-bottom:8px;font-weight:700;color:#334155;">Picked Up Items</div>
          <table>
            <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3" class="muted">No item details available</td></tr>'}</tbody>
          </table>
        </div>
      `,
    });

    const invoiceRef = getInvoiceSubjectRef(invoice, order);
    return this.send(user.email, `Order Picked Up - ${order.order_number}${invoiceRef} | ${config.store.name}`, html);
  }

  async sendWelcomeEmail(email, userName = 'Customer') {
    if (!email) return { success: false, reason: 'No email provided' };

    const html = renderEmail({
      badge: 'WELCOME',
      title: `Welcome to ${config.store.name}`,
      subtitle: `Hi ${userName}, your account setup is complete.`,
      tone: 'success',
      content: `
        <div class="box soft">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            <div>Your account is now active and ready to use.</div>
            <div>You can start placing orders immediately.</div>
          </div>
        </div>
      `,
    });

    return this.send(email, `Welcome to ${config.store.name}`, html);
  }

  async sendEmailChangeConfirmation(newEmail, userName = 'Customer') {
    if (!newEmail) return { success: false, reason: 'No new email' };

    const html = renderEmail({
      badge: 'EMAIL UPDATED',
      title: 'Your email was updated',
      subtitle: `Hi ${userName}, your account email was changed successfully.`,
      tone: 'success',
      content: `
        <div class="box soft">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            <div><strong>New Email : </strong>${newEmail}</div>
            <div>If this was you, no action is required.</div>
          </div>
        </div>
      `,
    });

    return this.send(newEmail, `Email Updated | ${config.store.name}`, html);
  }

  async sendEmailChangeSecurityAlert(oldEmail, userName = 'Customer', newEmail = '') {
    if (!oldEmail) return { success: false, reason: 'No old email' };

    const html = renderEmail({
      badge: 'SECURITY ALERT',
      title: 'Email change detected',
      subtitle: `Hi ${userName}, your account email was changed.`,
      tone: 'warning',
      content: `
        <div class="box">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            ${newEmail ? `<div><strong>Updated To : </strong>${newEmail}</div>` : ''}
            <div>If you did not make this change, contact support immediately.</div>
          </div>
        </div>
      `,
    });

    return this.send(oldEmail, `Security Alert: Email Changed | ${config.store.name}`, html);
  }

  async sendPromotionAnnouncement(email, userName = 'Customer', promotion = null) {
    if (!email || !promotion) return { success: false, reason: 'Missing recipient or promotion' };

    const startsAt = promotion.starts_at ? new Date(promotion.starts_at).toLocaleString('en-IN') : 'Now';
    const endsAt = promotion.ends_at ? new Date(promotion.ends_at).toLocaleString('en-IN') : '-';

    const html = renderEmail({
      badge: 'NEW PROMOTION',
      title: promotion.title || 'New Offer Available',
      subtitle: `Hi ${userName}, a new promotion is now live.`,
      tone: 'success',
      content: `
        <div class="box soft">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            <div><strong>Offer : </strong>${promotion.badge_text || promotion.title || 'Special Discount'}</div>
            <div><strong>Starts : </strong>${startsAt}</div>
            <div><strong>Ends : </strong>${endsAt}</div>
          </div>
        </div>
      `,
    });

    return this.send(email, `New Promotion: ${promotion.title || 'Offer'} | ${config.store.name}`, html);
  }

  async sendBirthdayCampaignEmail(user, campaign) {
    if (!user?.email) return { success: false, reason: 'No email' };

    const stage = campaign?.stage || 'birthday_day';
    const discountPercent = Number(campaign?.discountPercent || 10);
    const couponCode = campaign?.couponCode || 'BIRTHDAY10';
    const validDays = Number(campaign?.validDays || 7);
    const offerTitle = campaign?.offerTitle || 'Birthday Special Offer';
    const userName = user.display_name || user.name || 'Customer';

    const stageMeta = {
      month_start: {
        badge: 'BIRTHDAY MONTH OFFER',
        title: `Happy Birthday Month, ${userName}!`,
        subtitle: `Your birthday month has started. Enjoy ${discountPercent}% off as our gift.`,
      },
      week_before: {
        badge: 'BIRTHDAY WEEK COUNTDOWN',
        title: `Your birthday week is coming, ${userName}!`,
        subtitle: `A special ${discountPercent}% birthday offer is unlocked early for you.`,
      },
      birthday_day: {
        badge: 'HAPPY BIRTHDAY',
        title: `Happy Birthday, ${userName}!`,
        subtitle: `Celebrate today with your exclusive ${discountPercent}% birthday discount.`,
      },
    };

    const selected = stageMeta[stage] || stageMeta.birthday_day;
    const html = renderEmail({
      badge: selected.badge,
      title: selected.title,
      subtitle: selected.subtitle,
      tone: 'success',
      content: `
        <div class="box soft">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            <div><strong>${offerTitle}</strong></div>
            <div><strong>Discount : </strong>${discountPercent}% OFF</div>
            <div><strong>Coupon Code : </strong>${couponCode}</div>
            <div><strong>Valid For : </strong>${validDays} day(s)</div>
          </div>
        </div>
        <div class="section muted">Apply the coupon code at checkout to claim your birthday benefit.</div>
      `,
    });

    const stageTag = stage === 'birthday_day'
      ? 'Today'
      : stage === 'week_before'
        ? '1 Week Before'
        : 'Month Start';

    return this.send(user.email, `${offerTitle} | ${stageTag} | ${config.store.name}`, html);
  }

  async sendPendingOrderReminder(order, user) {
    if (!user?.email) return { success: false, reason: 'No email' };
    const invoice = await Invoice.getFullInvoice(order.id).catch(() => null);

    const html = renderEmail({
      badge: 'ORDER REMINDER',
      title: `Reminder for order ${order.order_number}`,
      subtitle: `Hi ${user.name || 'Customer'}, your order is still ${order.status}.`,
      tone: 'warning',
      content: `
        <div class="box">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            <div><strong>Order : </strong>${order.order_number}</div>
            <div><strong>Status : </strong>${order.status}</div>
            <div><strong>Total : </strong>${toCurrency(order.total_amount || 0)}</div>
          </div>
        </div>
      `,
    });

    const invoiceRef = getInvoiceSubjectRef(invoice, order);
    return this.send(user.email, `Order Reminder - ${order.order_number}${invoiceRef} | ${config.store.name}`, html);
  }

  async sendAdminOrderNotification(order, user, adminEmails = null) {
    let recipients = [];
    if (Array.isArray(adminEmails) && adminEmails.length) recipients = adminEmails;
    else if (typeof adminEmails === 'string' && adminEmails) recipients = [adminEmails];
    else if (config.email.adminEmail || config.adminEmail) recipients = [config.email.adminEmail || config.adminEmail];
    if (!recipients.length) return { success: false, reason: 'No admin email' };

    const invoice = await Invoice.getFullInvoice(order.id).catch(() => null);
    const itemRows = (invoice?.items || []).map((item) => `
      <tr>
        <td>
          ${item.product_name || 'Item'}
          ${item.variant ? `<div class="muted">${item.variant}</div>` : ''}
        </td>
        <td class="num">${item.quantity || 0}</td>
        <td class="num">${toCurrency(item.unit_price || 0)}</td>
        <td class="num">${toCurrency(item.total || 0)}</td>
      </tr>
    `).join('');

    const html = renderEmail({
      badge: 'NEW ORDER',
      title: `New order ${order.order_number}`,
      subtitle: `${user.name || 'Customer'} placed an order for ${toCurrency(order.total_amount)}.`,
      tone: 'neutral',
      content: `
        <div class="box">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            <div><strong>Customer&nbsp;:&nbsp;</strong>${user.name || '-'}</div>
            <div><strong>Phone&nbsp;:&nbsp;</strong>${user.phone || '-'}</div>
            <div><strong>Total&nbsp;:&nbsp;</strong>${toCurrency(order.total_amount)}</div>
          </div>
        </div>
        <div class="section">
          <table>
            <thead>
              <tr>
                <th>Item Details</th>
                <th class="num">Qty</th>
                <th class="num">Unit</th>
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows || '<tr><td colspan="4" class="muted">No item details available</td></tr>'}</tbody>
          </table>
        </div>
      `,
    });

    const invoiceRef = getInvoiceSubjectRef(invoice, order);
    const subject = `[NEW ORDER] ${order.order_number}${invoiceRef} - ${toCurrency(order.total_amount)} | ${config.store.name}`;
    const results = await Promise.allSettled(recipients.map((to) => this.send(to, subject, html)));
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return { success: sent > 0, sent, total: recipients.length };
  }

  async sendAdminOrderCancellationNotification(order, user, reason) {
    const adminEmail = config.email.adminEmail || config.adminEmail;
    if (!adminEmail) return { success: false, reason: 'No admin email' };
    const invoice = await Invoice.getFullInvoice(order.id).catch(() => null);
    const cancelledItemRows = (invoice?.items || []).map((item) => `
      <tr>
        <td>${item.product_name || 'Item'}${item.variant ? `<div class="muted">${item.variant}</div>` : ''}</td>
        <td class="num">${item.quantity || 0}</td>
        <td class="num">${toCurrency(item.total || 0)}</td>
      </tr>
    `).join('');

    const cancelledAt = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const html = renderEmail({
      badge: 'ORDER CANCELLED',
      title: `Cancelled: ${order.order_number}`,
      subtitle: 'A customer cancelled an order. Please review inventory and billing impact.',
      tone: 'danger',
      content: `
        <div class="panel-danger">
          <div style="font-size:14px;color:#9f1239;font-weight:700;margin-bottom:6px;">Immediate Action Required</div>
          <div class="muted" style="color:#9f1239;">Order has been cancelled. Review stock allocation and payment status.</div>
        </div>
        <div class="metric-row">
          <div class="metric-box"><div class="metric-label">Order Value</div><div class="metric-value danger">${toCurrency(order.total_amount)}</div></div>
          <div class="metric-box"><div class="metric-label">Order Date</div><div class="metric-value" style="font-size:14px;">${orderDate}</div></div>
          <div class="metric-box"><div class="metric-label">Cancelled At</div><div class="metric-value" style="font-size:14px;">${cancelledAt}</div></div>
        </div>
        <div class="section box soft">
          <div class="kv">
            <div class="kv-item"><span class="kv-label">Customer :</span> ${user.name || '-'}</div>
            <div class="kv-item"><span class="kv-label">Order Number :</span> ${order.order_number}</div>
            <div class="kv-item"><span class="kv-label">Phone :</span> ${user.phone || '-'}</div>
            <div class="kv-item"><span class="kv-label">Reason :</span> <span class="pill pill-danger">${reason || 'Not provided'}</span></div>
          </div>
        </div>
        <div class="section panel-warning">
          <div class="muted" style="margin-bottom:6px;font-weight:700;color:#92400e;">Operational Checklist</div>
          <ul class="list">
            <li>Release reserved inventory back to stock.</li>
            <li>If payment captured, trigger refund workflow.</li>
            <li>Mark internal fulfillment tasks as cancelled.</li>
          </ul>
        </div>
        <div class="section">
          <div class="muted" style="margin-bottom:8px;font-weight:700;color:#334155;">Cancelled Items</div>
          <table>
            <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
            <tbody>${cancelledItemRows || '<tr><td colspan="3" class="muted">No item details available</td></tr>'}</tbody>
          </table>
        </div>
      `,
    });

    const invoiceRef = getInvoiceSubjectRef(invoice, order);
    return this.send(adminEmail, `[CANCELLED] ${order.order_number}${invoiceRef} - ${toCurrency(order.total_amount)} | ${config.store.name}`, html);
  }

  async sendCustomerOrderCancellationNotification(order, user, reason) {
    if (!user.email) return { success: false, reason: 'No email' };
    const invoice = await Invoice.getFullInvoice(order.id).catch(() => null);
    const cancelledItemRows = (invoice?.items || []).map((item) => `
      <tr>
        <td>${item.product_name || 'Item'}${item.variant ? `<div class="muted">${item.variant}</div>` : ''}</td>
        <td class="num">${item.quantity || 0}</td>
        <td class="num">${toCurrency(item.total || 0)}</td>
      </tr>
    `).join('');

    const cancelledAt = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = renderEmail({
      badge: 'CANCELLATION CONFIRMED',
      title: `Order ${order.order_number} cancelled`,
      subtitle: `Hi ${user.name || 'Customer'}, your cancellation request is confirmed.`,
      tone: 'danger',
      content: `
        <div class="panel-danger">
          <div style="font-size:14px;color:#9f1239;font-weight:700;margin-bottom:6px;">Cancellation Confirmed</div>
          <div class="muted" style="color:#9f1239;">This order will not be processed for pickup.</div>
        </div>
        <div class="metric-row">
          <div class="metric-box"><div class="metric-label">Cancelled Amount</div><div class="metric-value danger">${toCurrency(order.total_amount)}</div></div>
          <div class="metric-box"><div class="metric-label">Order Date</div><div class="metric-value" style="font-size:14px;">${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN')}</div></div>
          <div class="metric-box"><div class="metric-label">Cancelled At</div><div class="metric-value" style="font-size:14px;">${cancelledAt}</div></div>
        </div>
        <div class="section box soft">
          <div class="kv">
            <div class="kv-item"><span class="kv-label">Order Number :</span> ${order.order_number}</div>
            <div class="kv-item"><span class="kv-label">Amount :</span> ${toCurrency(order.total_amount)}</div>
            ${reason ? `<div class="kv-item"><span class="kv-label">Reason :</span> <span class="pill pill-danger">${reason}</span></div>` : ''}
          </div>
        </div>
        <div class="section panel-warning">
          <div class="muted" style="margin-bottom:6px;font-weight:700;color:#92400e;">What Happens Next</div>
          <ul class="list">
            <li>If payment was already captured, refund will be processed as per policy.</li>
            <li>Your cancelled items are removed from active fulfillment.</li>
            <li>You can place a new order anytime from the app/site.</li>
          </ul>
        </div>
        <div class="section">
          <div class="muted" style="margin-bottom:8px;font-weight:700;color:#334155;">Cancelled Items</div>
          <table>
            <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
            <tbody>${cancelledItemRows || '<tr><td colspan="3" class="muted">No item details available</td></tr>'}</tbody>
          </table>
        </div>
        <div class="section muted">Need help? Contact us at ${config.store.phone || config.store.email || 'store support'}.</div>
      `,
    });

    const invoiceRef = getInvoiceSubjectRef(invoice, order);
    return this.send(user.email, `Order Cancellation Confirmed - ${order.order_number}${invoiceRef} | ${config.store.name}`, html);
  }

  async sendMergeOTP(email, otp, userName = 'Customer', isPrimaryAccount = true) {
    if (!email) return { success: false, reason: 'No email provided' };

    const roleLabel = isPrimaryAccount ? 'New Account' : 'Existing Account';
    const context = isPrimaryAccount
      ? 'A registration request detected with an existing phone number.'
      : 'A merge request was initiated for your account.';

    const html = renderEmail({
      badge: `MERGE OTP · ${roleLabel.toUpperCase()}`,
      title: 'Verify account merge',
      subtitle: `Hi ${userName}, ${context}`,
      tone: 'warning',
      content: `
        <div class="box">
          <div class="muted" style="text-align:center;">Verification code (valid for 5 minutes)</div>
          <div class="otp">${otp}</div>
        </div>
        <div class="section muted">Do not share this code. Both account emails must verify for merge to complete.</div>
      `,
    });

    return this.send(email, `Account Merge Verification (${roleLabel}) | ${config.store.name}`, html);
  }

  async sendStockAlert(adminEmails, product, alertType = 'low') {
    if (!adminEmails || !adminEmails.length) return { success: false, reason: 'No admin emails' };

    const isOut = alertType === 'out';
    const stock = product.stock_quantity ?? 0;
    const threshold = product.low_stock_threshold ?? 10;
    const name = product.name || product.name_en || 'Unknown Product';

    const html = renderEmail({
      badge: isOut ? 'OUT OF STOCK' : 'LOW STOCK',
      title: `${name}`,
      subtitle: isOut
        ? 'Product is out of stock and needs immediate restock.'
        : `Product is below threshold (${threshold}).`,
      tone: isOut ? 'danger' : 'warning',
      content: `
        <div class="${isOut ? 'panel-danger' : 'panel-warning'}">
          <div style="font-size:14px;font-weight:700;color:${isOut ? '#9f1239' : '#92400e'};margin-bottom:6px;">
            ${isOut ? 'Restock Immediately' : 'Low Stock Warning'}
          </div>
          <div class="muted" style="color:${isOut ? '#9f1239' : '#92400e'};">${isOut ? 'This product is unavailable for new orders.' : 'Stock is running low and should be refilled soon.'}</div>
        </div>
        <div class="metric-row">
          <div class="metric-box"><div class="metric-label">Current Stock</div><div class="metric-value ${isOut ? 'danger' : 'warn'}">${stock}</div></div>
          <div class="metric-box"><div class="metric-label">Threshold</div><div class="metric-value">${threshold}</div></div>
          <div class="metric-box"><div class="metric-label">Status</div><div class="metric-value ${isOut ? 'danger' : 'warn'}">${isOut ? 'OUT' : 'LOW'}</div></div>
        </div>
        <div class="section box soft">
          <div class="kv">
            <div class="kv-item"><span class="kv-label">Product :</span> ${name}</div>
            <div class="kv-item"><span class="kv-label">SKU :</span> ${product.sku || '-'}</div>
            <div class="kv-item"><span class="kv-label">Variant :</span> ${product.variant || product.unit_pack_size || '-'}</div>
          </div>
        </div>
      `,
    });

    const subject = isOut
      ? `[OUT OF STOCK] ${name} | ${config.store.name}`
      : `[LOW STOCK] ${name} - ${stock} left | ${config.store.name}`;

    const results = await Promise.allSettled(adminEmails.map((to) => this.send(to, subject, html)));
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return { success: sent > 0, sent, total: adminEmails.length };
  }

  async sendStockDigest(adminEmails, items, slotLabel = 'scheduled') {
    if (!adminEmails || !adminEmails.length) {
      return { success: false, reason: 'No admin emails', sent: 0, total: 0 };
    }
    if (!items || !items.length) {
      return { success: false, reason: 'No stock issues', sent: 0, total: adminEmails.length };
    }

    const outItems = items.filter((i) => (i.alertType || (i.stock_quantity <= 0 ? 'out' : 'low')) === 'out');
    const lowItems = items.filter((i) => (i.alertType || (i.stock_quantity <= 0 ? 'out' : 'low')) === 'low');

    const rows = items.slice(0, 40).map((i) => `
      <tr>
        <td>${i.name || 'Unknown'}</td>
        <td>${i.unit_pack_size || i.variant || '-'}</td>
        <td class="num">${i.stock_quantity ?? 0}</td>
        <td class="num">${i.low_stock_threshold ?? 10}</td>
        <td class="num ${(i.stock_quantity ?? 0) <= 0 ? 'danger' : 'warn'}">${(i.stock_quantity ?? 0) <= 0 ? 'OUT' : 'LOW'}</td>
      </tr>
    `).join('');

    const html = renderEmail({
      badge: 'STOCK DIGEST',
      title: `Inventory summary (${slotLabel})`,
      subtitle: `Out of stock: ${outItems.length} | Low stock: ${lowItems.length} | Total: ${items.length}`,
      tone: 'warning',
      content: `
        <table>
          <thead><tr><th>Product</th><th>Unit / Pack Size</th><th class="num">Stock</th><th class="num">Threshold</th><th class="num">Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
    });

    const subject = `[STOCK DIGEST] ${config.store.name} | ${slotLabel}`;
    const results = await Promise.allSettled(adminEmails.map((to) => this.send(to, subject, html)));
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return { success: sent > 0, sent, total: adminEmails.length };
  }

  async sendDesignPreviewPack(toEmail) {
    if (!toEmail) return { success: false, reason: 'No target email' };

    const previews = [
      {
        subject: `[PREVIEW] OTP | ${config.store.name}`,
        html: renderEmail({
          badge: 'LOGIN OTP',
          title: 'Your verification code',
          subtitle: 'Preview of OTP template',
          tone: 'warning',
          content: '<div class="box"><div class="muted" style="text-align:center;">Code valid for 5 minutes</div><div class="otp">482913</div></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Welcome | ${config.store.name}`,
        html: renderEmail({
          badge: 'WELCOME',
          title: `Welcome to ${config.store.name}`,
          subtitle: 'Preview of welcome email',
          tone: 'success',
          content: '<div class="box soft"><div style="font-size:14px; line-height:1.8; color:#0f172a;"><div>Your account is now active and ready to use.</div><div>You can start placing orders immediately.</div></div></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Email Updated | ${config.store.name}`,
        html: renderEmail({
          badge: 'EMAIL UPDATED',
          title: 'Your email was updated',
          subtitle: 'Preview of email-change confirmation',
          tone: 'success',
          content: '<div class="box soft"><div style="font-size:14px; line-height:1.8; color:#0f172a;"><div><strong>New Email : </strong>demo.new@example.com</div><div>If this was you, no action is required.</div></div></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Security Alert Email Change | ${config.store.name}`,
        html: renderEmail({
          badge: 'SECURITY ALERT',
          title: 'Email change detected',
          subtitle: 'Preview of email-change security alert',
          tone: 'warning',
          content: '<div class="box"><div style="font-size:14px; line-height:1.8; color:#0f172a;"><div><strong>Updated To : </strong>demo.new@example.com</div><div>If you did not make this change, contact support immediately.</div></div></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Order Confirmed | Invoice: INV-2026-001 | ${config.store.name}`,
        html: renderEmail({
          badge: 'ORDER CONFIRMED',
          title: 'Order MK-2026-001 confirmed',
          subtitle: 'Preview of customer confirmation email',
          tone: 'success',
          content: '<div class="box"><div style="font-size:14px; line-height:1.8; color:#0f172a;"><div><strong>Order Date : </strong>01 Apr 2026</div><div><strong>Status : </strong><span class="ok">Confirmed</span></div><div><strong>Total : </strong>Rs.1450.00</div></div></div><div class="section"><div class="muted" style="margin-bottom:8px;font-weight:700;color:#334155;">Items Ordered</div><table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody><tr><td>Toor Dal 1kg</td><td class="num">2</td><td class="num">Rs.360.00</td></tr><tr><td>Sunflower Oil 1L</td><td class="num">4</td><td class="num">Rs.620.00</td></tr><tr><td>Basmati Rice 5kg</td><td class="num">1</td><td class="num">Rs.1700.00</td></tr></tbody></table></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Order Picked Up | Invoice: INV-2026-001 | ${config.store.name}`,
        html: renderEmail({
          badge: 'ORDER PICKED UP',
          title: 'Order MK-2026-001 completed',
          subtitle: 'Preview of picked-up confirmation email',
          tone: 'success',
          content: '<div class="box"><div style="font-size:14px; line-height:1.8; color:#0f172a;"><div><strong>Order : </strong>MK-2026-001</div><div><strong>Total : </strong>Rs.1450.00</div><div><strong>Status : </strong><span class="ok">Picked Up</span></div></div></div><div class="section"><div class="muted" style="margin-bottom:8px;font-weight:700;color:#334155;">Picked Up Items</div><table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody><tr><td>Toor Dal 1kg</td><td class="num">2</td><td class="num">Rs.360.00</td></tr><tr><td>Sunflower Oil 1L</td><td class="num">4</td><td class="num">Rs.620.00</td></tr></tbody></table></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Order Ready | Invoice: INV-2026-001 | ${config.store.name}`,
        html: renderEmail({
          badge: 'READY FOR PICKUP',
          title: 'Order MK-2026-001 is ready',
          subtitle: 'Preview of ready-for-pickup email',
          tone: 'success',
          content: '<div class="box"><div style="font-size:14px; line-height:1.8; color:#0f172a;"><div><strong>Order : </strong>MK-2026-001</div><div><strong>Amount : </strong>Rs.1450.00</div></div></div><div class="section"><div class="muted" style="margin-bottom:8px;font-weight:700;color:#334155;">Items Ordered</div><table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody><tr><td>Toor Dal 1kg</td><td class="num">2</td><td class="num">Rs.360.00</td></tr><tr><td>Sunflower Oil 1L</td><td class="num">4</td><td class="num">Rs.620.00</td></tr><tr><td>Basmati Rice 5kg</td><td class="num">1</td><td class="num">Rs.1700.00</td></tr></tbody></table></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] New Order Admin | Invoice: INV-2026-002 | ${config.store.name}`,
        html: renderEmail({
          badge: 'NEW ORDER',
          title: 'New order MK-2026-002',
          subtitle: 'Preview of admin new-order email',
          tone: 'neutral',
          content: '<div class="box"><div style="font-size:14px; line-height:1.8; color:#0f172a;"><div><strong>Customer&nbsp;:&nbsp;</strong>Demo Customer</div><div><strong>Phone&nbsp;:&nbsp;</strong>9999999999</div><div><strong>Total&nbsp;:&nbsp;</strong>Rs.2680.00</div></div></div><div class="section"><table><thead><tr><th>Item Details</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead><tbody><tr><td>Toor Dal 1kg<div class="muted">Premium</div></td><td class="num">2</td><td class="num">Rs.180.00</td><td class="num">Rs.360.00</td></tr><tr><td>Sunflower Oil 1L</td><td class="num">4</td><td class="num">Rs.155.00</td><td class="num">Rs.620.00</td></tr><tr><td>Basmati Rice 5kg</td><td class="num">1</td><td class="num">Rs.1700.00</td><td class="num">Rs.1700.00</td></tr></tbody></table></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Cancellation Admin | Invoice: INV-2026-003 | ${config.store.name}`,
        html: renderEmail({
          badge: 'ORDER CANCELLED',
          title: 'Cancelled: MK-2026-003',
          subtitle: 'Preview of admin cancellation email style',
          tone: 'danger',
          content: '<div class="panel-danger"><div style="font-size:14px;color:#9f1239;font-weight:700;margin-bottom:6px;">Immediate Action Required</div><div class="muted" style="color:#9f1239;">Order has been cancelled. Review stock allocation and payment status.</div></div><div class="metric-row"><div class="metric-box"><div class="metric-label">Order Value</div><div class="metric-value danger">Rs.899.00</div></div><div class="metric-box"><div class="metric-label">Order Date</div><div class="metric-value" style="font-size:14px;">01 Apr 2026</div></div><div class="metric-box"><div class="metric-label">Cancelled At</div><div class="metric-value" style="font-size:14px;">01 Apr 2026, 07:40 PM</div></div></div><div class="section box soft"><div class="kv"><div class="kv-item"><span class="kv-label">Customer :</span> Demo Customer</div><div class="kv-item"><span class="kv-label">Order Number :</span> MK-2026-003</div><div class="kv-item"><span class="kv-label">Phone :</span> 9999999999</div><div class="kv-item"><span class="kv-label">Reason :</span> <span class="pill pill-danger">Customer request</span></div></div></div><div class="section panel-warning"><div class="muted" style="margin-bottom:6px;font-weight:700;color:#92400e;">Operational Checklist</div><ul class="list"><li>Release reserved inventory back to stock.</li><li>If payment captured, trigger refund workflow.</li><li>Mark internal fulfillment tasks as cancelled.</li></ul></div><div class="section"><div class="muted" style="margin-bottom:8px;font-weight:700;color:#334155;">Cancelled Items</div><table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody><tr><td>Toor Dal 1kg</td><td class="num">2</td><td class="num">Rs.360.00</td></tr><tr><td>Sunflower Oil 1L</td><td class="num">4</td><td class="num">Rs.620.00</td></tr></tbody></table></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Cancellation Customer | Invoice: INV-2026-003 | ${config.store.name}`,
        html: renderEmail({
          badge: 'CANCELLATION CONFIRMED',
          title: 'Order MK-2026-003 cancelled',
          subtitle: 'Preview of customer cancellation email style',
          tone: 'danger',
          content: '<div class="panel-danger"><div style="font-size:14px;color:#9f1239;font-weight:700;margin-bottom:6px;">Cancellation Confirmed</div><div class="muted" style="color:#9f1239;">This order will not be processed for pickup.</div></div><div class="metric-row"><div class="metric-box"><div class="metric-label">Cancelled Amount</div><div class="metric-value danger">Rs.899.00</div></div><div class="metric-box"><div class="metric-label">Order Date</div><div class="metric-value" style="font-size:14px;">01 Apr 2026</div></div><div class="metric-box"><div class="metric-label">Cancelled At</div><div class="metric-value" style="font-size:14px;">01 Apr 2026, 07:40 PM</div></div></div><div class="section box soft"><div class="kv"><div class="kv-item"><span class="kv-label">Order Number :</span> MK-2026-003</div><div class="kv-item"><span class="kv-label">Amount :</span> Rs.899.00</div><div class="kv-item"><span class="kv-label">Reason :</span> <span class="pill pill-danger">Customer request</span></div></div></div><div class="section panel-warning"><div class="muted" style="margin-bottom:6px;font-weight:700;color:#92400e;">What Happens Next</div><ul class="list"><li>If payment was already captured, refund will be processed as per policy.</li><li>Your cancelled items are removed from active fulfillment.</li><li>You can place a new order anytime from the app/site.</li></ul></div><div class="section"><div class="muted" style="margin-bottom:8px;font-weight:700;color:#334155;">Cancelled Items</div><table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead><tbody><tr><td>Toor Dal 1kg</td><td class="num">2</td><td class="num">Rs.360.00</td></tr><tr><td>Sunflower Oil 1L</td><td class="num">4</td><td class="num">Rs.620.00</td></tr></tbody></table></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Stock Alert | ${config.store.name}`,
        html: renderEmail({
          badge: 'LOW STOCK',
          title: 'Sunflower Oil 1L',
          subtitle: 'Preview of stock alert email style',
          tone: 'warning',
          content: '<div class="panel-warning"><div style="font-size:14px;font-weight:700;color:#92400e;margin-bottom:6px;">Low Stock Warning</div><div class="muted" style="color:#92400e;">Stock is running low and should be refilled soon.</div></div><div class="metric-row"><div class="metric-box"><div class="metric-label">Current Stock</div><div class="metric-value warn">3</div></div><div class="metric-box"><div class="metric-label">Threshold</div><div class="metric-value">10</div></div><div class="metric-box"><div class="metric-label">Status</div><div class="metric-value warn">LOW</div></div></div><div class="section box soft"><div class="kv"><div class="kv-item"><span class="kv-label">Product :</span> Sunflower Oil 1L</div><div class="kv-item"><span class="kv-label">SKU :</span> SUN-1L</div><div class="kv-item"><span class="kv-label">Variant :</span> 1 Liter</div></div></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Pending Order Reminder | Invoice: INV-2026-005 | ${config.store.name}`,
        html: renderEmail({
          badge: 'ORDER REMINDER',
          title: 'Reminder for order MK-2026-005',
          subtitle: 'Preview of pending order reminder email',
          tone: 'warning',
          content: '<div class="box"><div style="font-size:14px; line-height:1.8; color:#0f172a;"><div><strong>Order : </strong>MK-2026-005</div><div><strong>Status : </strong>pending</div><div><strong>Total : </strong>Rs.980.00</div></div></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Promotion Announcement | ${config.store.name}`,
        html: renderEmail({
          badge: 'NEW PROMOTION',
          title: 'Summer Offer 2026',
          subtitle: 'Preview of promotion announcement email',
          tone: 'success',
          content: '<div class="box soft"><div style="font-size:14px; line-height:1.8; color:#0f172a;"><div><strong>Offer : </strong>Extra 10% off on groceries</div><div><strong>Starts : </strong>01 Apr 2026, 09:00 AM</div><div><strong>Ends : </strong>15 Apr 2026, 11:59 PM</div></div></div>',
          footerNote: 'Preview email - template design only',
        }),
      },
      {
        subject: `[PREVIEW] Birthday Campaign | ${config.store.name}`,
        html: renderEmail({
          badge: 'HAPPY BIRTHDAY',
          title: 'Happy Birthday, Demo Customer!',
          subtitle: 'Preview of birthday campaign email',
          tone: 'success',
          content: '<div class="box soft"><div style="font-size:14px; line-height:1.8; color:#0f172a;"><div><strong>Birthday Special Offer</strong></div><div><strong>Discount : </strong>10% OFF</div><div><strong>Coupon Code : </strong>BIRTHDAY10</div><div><strong>Valid For : </strong>7 day(s)</div></div></div><div class="section muted">Apply the coupon code at checkout to claim your birthday benefit.</div>',
          footerNote: 'Preview email - template design only',
        }),
      },
    ];

    const results = await Promise.allSettled(
      previews.map((p) => this.send(toEmail, p.subject, p.html, 'Template preview email')),
    );
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return { success: sent > 0, sent, total: previews.length };
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
