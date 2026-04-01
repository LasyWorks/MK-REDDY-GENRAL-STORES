const { queryOne, query } = require("../src/config/database");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function generateCouponCode() {
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `BDAY-${token}`;
}

function renderEmail({ badge, title, subtitle, tone = "success", content = "" }) {
  const storeName = "MK Reddy General Stores";
  const baseColor =
    tone === "warning"
      ? "#F59E0B"
      : tone === "error"
        ? "#EF4444"
        : tone === "success"
          ? "#10B981"
          : "#6366F1";

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: ${baseColor}; color: white; padding: 40px 20px; text-align: center; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 1px; margin-bottom: 16px; }
    .title { font-size: 28px; font-weight: 700; margin: 16px 0; }
    .subtitle { font-size: 16px; opacity: 0.9; margin-bottom: 0; }
    .body { padding: 40px 20px; }
    .box { background: #f9fafb; border-left: 4px solid ${baseColor}; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .box div { margin: 8px 0; }
    .section { padding: 20px 0; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
    .muted { color: #9ca3af; font-size: 14px; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .otp { font-size: 32px; font-weight: 700; letter-spacing: 4px; text-align: center; padding: 20px; background: ${baseColor}; color: white; border-radius: 8px; font-family: 'Courier New', monospace; }
    a { color: ${baseColor}; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">${badge}</div>
      <div class="title">${title}</div>
      <div class="subtitle">${subtitle}</div>
    </div>
    <div class="body">
      ${content}
      <div class="section">
        <p>Thank you for shopping with us!</p>
        <p><a href="https://mkreddy.local">Visit Our Store</a></p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${storeName}</p>
    </div>
  </div>
</body>
</html>`;
}

async function simulateBirthdayEmail() {
  try {
    // Get the last assigned birthday offer for the demo user
    const offer = await queryOne(
      `SELECT buo.*, u.id as user_id, u.name, u.display_name, u.email, bot.name AS offer_name, 
              bot.discount_type, bot.discount_value, bot.valid_days
       FROM birthday_user_offers buo
       JOIN users u ON u.id = buo.user_id
       LEFT JOIN birthday_offer_templates bot ON bot.id = buo.offer_template_id
       WHERE u.email = $1
         AND buo.offer_template_id IS NOT NULL
       ORDER BY buo.created_at DESC
       LIMIT 1`,
      ["2200080137aids@gmail.com"],
    );

    if (!offer) {
      console.log("No birthday offer found for the demo user");
      process.exit(0);
    }

    console.log("\n=== BIRTHDAY CAMPAIGN SIMULATION ===\n");
    console.log("Found Birthday Offer:");
    console.log(`  User: ${offer.display_name || offer.name}`);
    console.log(`  Email: ${offer.email}`);
    console.log(`  Offer: ${offer.offer_name}`);
    console.log(`  Discount: ${offer.discount_value}% OFF`);
    console.log(`  Valid Days: ${offer.valid_days}`);
    console.log(`  Current Status: ${offer.status}`);

    // Generate coupon code if missing
    let couponCode = offer.coupon_code;
    if (!couponCode) {
      couponCode = generateCouponCode();
      console.log(`\nGenerating Coupon Code: ${couponCode}`);

      const updateResult = await query(
        `UPDATE birthday_user_offers SET coupon_code = $1 WHERE id = $2 RETURNING coupon_code`,
        [couponCode, offer.id],
      );
      console.log("✓ Coupon code saved to database");
    } else {
      console.log(`\nCoupon Code: ${couponCode}`);
    }

    // Update status to 'revealed' if not already
    if (offer.status !== "revealed") {
      await query(
        `UPDATE birthday_user_offers
         SET status = 'revealed',
             reveal_at = COALESCE(reveal_at, NOW()),
             updated_at = NOW()
         WHERE id = $1`,
        [offer.id],
      );
      console.log("✓ Updated offer status to 'revealed'");
    }

    // Generate email HTML
    console.log("\n=== BIRTHDAY EMAIL PREVIEW ===\n");
    const emailHtml = renderEmail({
      badge: "HAPPY BIRTHDAY",
      title: `Happy Birthday, ${offer.display_name || offer.name}!`,
      subtitle: `Celebrate today with your exclusive ${offer.discount_value}% birthday discount.`,
      tone: "success",
      content: `
        <div class="box soft">
          <div style="font-size:14px; line-height:1.8; color:#0f172a;">
            <div><strong>${offer.offer_name}</strong></div>
            <div><strong>Discount:</strong> ${offer.discount_value}% OFF</div>
            <div><strong>Coupon Code:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 3px; font-family: monospace; font-weight: bold;">${couponCode}</code></div>
            <div><strong>Valid For:</strong> ${offer.valid_days} day(s)</div>
          </div>
        </div>
        <div class="section muted">Apply the coupon code at checkout to claim your birthday benefit.</div>
      `,
    });

    // Save email preview
    const previewPath = path.join(
      __dirname,
      "..",
      "..",
      "email-preview-birthday.html",
    );
    fs.writeFileSync(previewPath, emailHtml);
    console.log(`✓ Email preview saved to: email-preview-birthday.html`);

    // Log the campaign action
    const currentYear = new Date().getUTCFullYear();
    const logResult = await query(
      `INSERT INTO birthday_campaign_logs (user_id, campaign_year, stage, metadata, sent_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, campaign_year, stage) DO UPDATE SET metadata = $4, sent_at = NOW()
       RETURNING id, sent_at`,
      [
        offer.user_id,
        currentYear,
        "birthday_day",
        JSON.stringify({
          userEmail: offer.email,
          couponCode: couponCode,
          simulatedAt: new Date().toISOString(),
        }),
      ],
    );

    console.log(`\n✓ Campaign log created (ID: ${logResult[0]?.id})`);
    console.log(`  Timestamp: ${logResult[0]?.sent_at}`);

    console.log("\n=== EMAIL DETAILS ===");
    console.log(`To: ${offer.email}`);
    console.log(
      `Subject: ${offer.offer_name} | Today | MK Reddy General Stores`,
    );
    console.log(
      `\n✓ Birthday email simulation complete! Preview saved to email-preview-birthday.html\n`,
    );

    process.exit(0);
  } catch (err) {
    console.error("Simulation error:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

simulateBirthdayEmail();
