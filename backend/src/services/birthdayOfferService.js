const crypto = require("crypto");
const { query: dbQuery, queryOne: dbQueryOne } = require("../config/database");

function toDateOnly(value) {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function getBirthdayForYear(dateOfBirth, year) {
  const dob = new Date(dateOfBirth);
  const month = dob.getUTCMonth();
  const day = dob.getUTCDate();

  if (month === 1 && day === 29) {
    const isLeap = new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29;
    return new Date(Date.UTC(year, 1, isLeap ? 29 : 28));
  }

  return new Date(Date.UTC(year, month, day));
}

function dayDiffUTC(a, b) {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function generateCouponCode() {
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `BDAY-${token}`;
}

async function getOfferTemplates() {
  return dbQuery(
    `SELECT id, name, description, discount_type, discount_value, valid_days, is_active
     FROM birthday_offer_templates
     WHERE is_active = TRUE
     ORDER BY discount_value DESC, valid_days DESC, name ASC`,
  );
}

async function ensureMonthStartAssignments(today) {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  const users = await dbQuery(
    `SELECT id, date_of_birth
     FROM users
     WHERE user_type IN ('retail', 'wholesale')
       AND email IS NOT NULL
       AND email <> ''
       AND date_of_birth IS NOT NULL
       AND is_active = TRUE
       AND (is_blocked = FALSE OR is_blocked IS NULL)
       AND deleted_at IS NULL
       AND created_at <= NOW() - INTERVAL '3 months'`,
  );

  let created = 0;
  for (const user of users) {
    const birthdayDate = getBirthdayForYear(user.date_of_birth, year);
    if (birthdayDate.getUTCMonth() !== month) continue;

    const rows = await dbQuery(
      `INSERT INTO birthday_user_offers (
         user_id, campaign_year, birthday_date, status, created_at, updated_at
       ) VALUES ($1, $2, $3, 'pending_selection', NOW(), NOW())
       ON CONFLICT (user_id, campaign_year) DO NOTHING
       RETURNING id`,
      [user.id, year, birthdayDate.toISOString().slice(0, 10)],
    );

    if (rows.length > 0) created += 1;
  }

  return created;
}

async function listUpcomingForAdmin({ year, month }) {
  return dbQuery(
    `SELECT
       buo.id,
       buo.user_id,
       buo.campaign_year,
       buo.birthday_date,
       buo.status,
       buo.offer_template_id,
       buo.coupon_code,
       buo.valid_from,
       buo.valid_until,
       buo.reveal_at,
       buo.claimed_at,
       buo.claimed_order_id,
       u.name,
       u.display_name,
       u.email,
       u.phone,
       bot.name AS offer_name,
       bot.discount_type,
       bot.discount_value,
       bot.valid_days
     FROM birthday_user_offers buo
     JOIN users u ON u.id = buo.user_id
     LEFT JOIN birthday_offer_templates bot ON bot.id = buo.offer_template_id
     WHERE buo.campaign_year = $1
       AND EXTRACT(MONTH FROM buo.birthday_date) = $2
     ORDER BY buo.birthday_date ASC, COALESCE(u.display_name, u.name) ASC`,
    [year, month],
  );
}

async function assignOfferToUser({ userId, campaignYear, offerTemplateId, adminId }) {
  const template = await dbQueryOne(
    `SELECT id, discount_type, discount_value, valid_days
     FROM birthday_offer_templates
     WHERE id = $1 AND is_active = TRUE`,
    [offerTemplateId],
  );
  if (!template) return null;

  const user = await dbQueryOne(`SELECT id, date_of_birth FROM users WHERE id = $1`, [userId]);
  if (!user?.date_of_birth) return null;

  const birthdayDate = getBirthdayForYear(user.date_of_birth, campaignYear);

  await dbQuery(
    `INSERT INTO birthday_user_offers (
       user_id, campaign_year, birthday_date, status, created_at, updated_at
     ) VALUES ($1, $2, $3, 'pending_selection', NOW(), NOW())
     ON CONFLICT (user_id, campaign_year) DO NOTHING`,
    [userId, campaignYear, birthdayDate.toISOString().slice(0, 10)],
  );

  const rows = await dbQuery(
    `UPDATE birthday_user_offers
     SET offer_template_id = $1,
         discount_type = $2,
         discount_value = $3,
         valid_days = $4,
         admin_selected_by = $5,
         selected_at = NOW(),
         status = CASE
           WHEN status IN ('claimed', 'expired') THEN status
           ELSE 'selected'
         END,
         updated_at = NOW()
     WHERE user_id = $6
       AND campaign_year = $7
     RETURNING *`,
    [
      template.id,
      template.discount_type,
      template.discount_value,
      template.valid_days,
      adminId,
      userId,
      campaignYear,
    ],
  );

  return rows[0] || null;
}

async function processWeekBefore(today) {
  const rows = await dbQuery(
    `SELECT id, user_id, birthday_date, valid_days
     FROM birthday_user_offers
     WHERE offer_template_id IS NOT NULL
       AND coupon_code IS NULL
       AND status IN ('selected', 'pending_selection')`,
  );

  let generated = 0;

  for (const row of rows) {
    const bday = toDateOnly(row.birthday_date);
    if (dayDiffUTC(bday, today) !== 7) continue;

    let code = null;
    let updated = false;
    for (let i = 0; i < 6 && !updated; i += 1) {
      code = generateCouponCode();
      try {
        const res = await dbQuery(
          `UPDATE birthday_user_offers
           SET coupon_code = $1,
               valid_from = birthday_date,
               valid_until = birthday_date + (($2::int - 1) * INTERVAL '1 day'),
               status = 'ready_hidden',
               updated_at = NOW()
           WHERE id = $3
             AND coupon_code IS NULL
           RETURNING id`,
          [code, Number(row.valid_days || 1), row.id],
        );
        updated = res.length > 0;
      } catch (_error) {
        // Retry on unique coupon collision.
      }
    }

    if (updated) generated += 1;
  }

  return generated;
}

async function processBirthdayDay(today, emailService) {
  const rows = await dbQuery(
    `SELECT buo.*, u.name, u.display_name, u.email, bot.name AS offer_name
     FROM birthday_user_offers buo
     JOIN users u ON u.id = buo.user_id
     LEFT JOIN birthday_offer_templates bot ON bot.id = buo.offer_template_id
     WHERE buo.status IN ('ready_hidden', 'selected')
       AND buo.offer_template_id IS NOT NULL
       AND buo.birthday_date = $1::date`,
    [today.toISOString().slice(0, 10)],
  );

  let sent = 0;
  for (const row of rows) {
    if (!row.coupon_code) continue;

    const updated = await dbQuery(
      `UPDATE birthday_user_offers
       SET status = 'revealed',
           reveal_at = COALESCE(reveal_at, NOW()),
           updated_at = NOW()
       WHERE id = $1
         AND status <> 'claimed'
       RETURNING id`,
      [row.id],
    );
    if (!updated.length) continue;

    await emailService.sendBirthdayCampaignEmail(row, {
      stage: "birthday_day",
      discountPercent: Number(row.discount_type === "percentage" ? row.discount_value : 0),
      couponCode: row.coupon_code,
      validDays: Number(row.valid_days || 1),
      offerTitle: row.offer_name || "Birthday Special Offer",
    });
    sent += 1;
  }

  return sent;
}

async function expireOldOffers() {
  const rows = await dbQuery(
    `UPDATE birthday_user_offers
     SET status = 'expired',
         updated_at = NOW()
     WHERE status IN ('ready_hidden', 'revealed')
       AND claimed_at IS NULL
       AND valid_until < NOW()::date
     RETURNING id`,
  );
  return rows.length;
}

async function runDailyBirthdayPipeline({ now = new Date(), emailService }) {
  const today = toDateOnly(now);
  const stageStats = [];

  if (today.getUTCDate() === 1) {
    const created = await ensureMonthStartAssignments(today);
    stageStats.push({ stage: "month_start", affected: created });
  }

  const generated = await processWeekBefore(today);
  stageStats.push({ stage: "week_before", affected: generated });

  const sent = await processBirthdayDay(today, emailService);
  stageStats.push({ stage: "birthday_day", affected: sent });

  const expired = await expireOldOffers();

  return {
    stages: stageStats,
    expired,
  };
}

async function getMyBirthdayOffer(userId, now = new Date()) {
  const today = toDateOnly(now).toISOString().slice(0, 10);
  const row = await dbQueryOne(
    `SELECT buo.*, bot.name AS offer_name
     FROM birthday_user_offers buo
     LEFT JOIN birthday_offer_templates bot ON bot.id = buo.offer_template_id
     WHERE buo.user_id = $1
       AND buo.campaign_year = EXTRACT(YEAR FROM $2::date)::int
     LIMIT 1`,
    [userId, today],
  );

  if (!row) return null;

  const revealCode = row.status === "revealed" || row.status === "claimed";
  return {
    id: row.id,
    status: row.status,
    birthday_date: row.birthday_date,
    offer_name: row.offer_name,
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value || 0),
    valid_from: row.valid_from,
    valid_until: row.valid_until,
    coupon_code: revealCode ? row.coupon_code : null,
    can_claim: revealCode && !row.claimed_at,
    claimed_at: row.claimed_at,
  };
}

async function previewCouponDiscount({ userId, couponCode, cartSubtotal, now = new Date() }) {
  if (!couponCode) return null;

  const today = toDateOnly(now).toISOString().slice(0, 10);
  const row = await dbQueryOne(
    `SELECT buo.*, bot.name AS offer_name
     FROM birthday_user_offers buo
     LEFT JOIN birthday_offer_templates bot ON bot.id = buo.offer_template_id
     WHERE buo.user_id = $1
       AND buo.coupon_code = $2
       AND buo.status = 'revealed'
       AND buo.claimed_at IS NULL
       AND buo.valid_from <= $3::date
       AND buo.valid_until >= $3::date
     LIMIT 1`,
    [userId, String(couponCode).trim().toUpperCase(), today],
  );

  if (!row) return null;

  const subtotal = Number(cartSubtotal || 0);
  let discount = 0;
  if (row.discount_type === "flat") {
    discount = Math.min(Number(row.discount_value || 0), subtotal);
  } else {
    discount = Math.min((subtotal * Number(row.discount_value || 0)) / 100, subtotal);
  }

  return {
    offerId: row.id,
    couponCode: row.coupon_code,
    discountAmount: parseFloat(discount.toFixed(2)),
    offerTitle: row.offer_name || "Birthday Offer",
  };
}

async function bulkAssignOfferToUsers({ year, month, offerTemplateId, adminId }) {
  const template = await dbQueryOne(
    `SELECT id, discount_type, discount_value, valid_days
     FROM birthday_offer_templates
     WHERE id = $1 AND is_active = TRUE`,
    [offerTemplateId],
  );
  if (!template) return { assigned: 0, failed: 0 };

  const rows = await dbQuery(
    `SELECT buo.id, buo.user_id
     FROM birthday_user_offers buo
     WHERE buo.campaign_year = $1
       AND EXTRACT(MONTH FROM buo.birthday_date) = $2
       AND buo.status = 'pending_selection'
       AND buo.offer_template_id IS NULL`,
    [year, month],
  );

  let assigned = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const result = await dbQuery(
        `UPDATE birthday_user_offers
         SET offer_template_id = $1,
             discount_type = $2,
             discount_value = $3,
             valid_days = $4,
             admin_selected_by = $5,
             selected_at = NOW(),
             status = 'selected',
             updated_at = NOW()
         WHERE id = $6
           AND status = 'pending_selection'
         RETURNING id`,
        [
          template.id,
          template.discount_type,
          template.discount_value,
          template.valid_days,
          adminId,
          row.id,
        ],
      );
      if (result.length > 0) assigned += 1;
      else failed += 1;
    } catch (_error) {
      failed += 1;
    }
  }

  return { assigned, failed, total: rows.length };
}

module.exports = {
  getOfferTemplates,
  listUpcomingForAdmin,
  assignOfferToUser,
  bulkAssignOfferToUsers,
  runDailyBirthdayPipeline,
  getMyBirthdayOffer,
  previewCouponDiscount,
};
