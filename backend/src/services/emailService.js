const nodemailer = require('nodemailer');
const config = require('../config');
const { Invoice } = require('../models');
const logger = require('../utils/logger');
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
        from: `"${config.store.name}" <${config.email.user}>`,
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
  async sendOrderConfirmation(order, user) {
    const invoice = await Invoice.getFullInvoice(order.id);
    if (!invoice || !user.email) {
      return { success: false, reason: 'No email or invoice' };
    }
    const itemsHtml = invoice.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} ${item.unit_type}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.unit_price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.total.toFixed(2)}</td>
      </tr>
    `).join('');
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .invoice-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .invoice-table th { background: #4CAF50; color: white; padding: 10px; text-align: left; }
          .total-row { font-weight: bold; background: #f0f0f0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .store-info { margin-top: 20px; padding: 15px; background: #fff; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Thank you for your order</p>
          </div>
          <div class="content">
            <h2>Order Details</h2>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString('en-IN')}</p>
            <table class="invoice-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr class="total-row">
                  <td colspan="3" style="padding: 10px; text-align: right;">Subtotal:</td>
                  <td style="padding: 10px; text-align: right;">₹${invoice.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right;">CGST:</td>
                  <td style="padding: 10px; text-align: right;">₹${invoice.cgst.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="padding: 10px; text-align: right;">SGST:</td>
                  <td style="padding: 10px; text-align: right;">₹${invoice.sgst.toFixed(2)}</td>
                </tr>
                <tr class="total-row" style="font-size: 18px;">
                  <td colspan="3" style="padding: 10px; text-align: right;">Grand Total:</td>
                  <td style="padding: 10px; text-align: right;">₹${invoice.total_amount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div class="store-info">
              <h3>Pickup Location</h3>
              <p><strong>${config.store.name}</strong></p>
              <p>${config.store.address}</p>
              <p>Phone: ${config.store.phone}</p>
              <p>GST: ${config.store.gstNumber}</p>
            </div>
            <p style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
              <strong>Note:</strong> This is a pickup-only order. We will notify you when your order is ready for pickup.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} ${config.store.name}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    try {
      const result = await this.send(
        user.email,
        `Order Confirmed - ${order.order_number}`,
        html
      );
      await Invoice.updateEmailStatus(invoice.id, true);
      return result;
    } catch (error) {
      await Invoice.updateEmailStatus(invoice.id, false);
      throw error;
    }
  }
  async sendOrderReadyNotification(order, user) {
    if (!user.email) {
      return { success: false, reason: 'No email' };
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .store-info { margin-top: 20px; padding: 15px; background: #fff; border: 1px solid #ddd; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Order is Ready!</h1>
          </div>
          <div class="content">
            <p>Dear ${user.name},</p>
            <p>Great news! Your order <strong>${order.order_number}</strong> is ready for pickup.</p>
            <div class="store-info">
              <h3>Pickup Location</h3>
              <p><strong>${config.store.name}</strong></p>
              <p>${config.store.address}</p>
              <p>Phone: ${config.store.phone}</p>
            </div>
            <p style="margin-top: 20px;">
              Please bring this email or your order number when you come to pick up your order.
            </p>
            <p><strong>Total Amount:</strong> ₹${order.total_amount.toFixed(2)}</p>
          </div>
          <div class="footer">
            <p>Thank you for shopping with us!</p>
            <p>&copy; ${new Date().getFullYear()} ${config.store.name}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return this.send(
      user.email,
      `Order Ready for Pickup - ${order.order_number}`,
      html
    );
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