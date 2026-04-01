const db = require("../src/config/database");

async function run() {
  const email = "2200080137aids@gmail.com";
  const code = "BDAY-9C2D3FF4";

  const user = await db.queryOne(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [email],
  );

  if (user == null) {
    console.log("USER_NOT_FOUND");
    return;
  }

  const rows = await db.query(
    `UPDATE birthday_user_offers
     SET status = 'revealed',
         valid_from = NOW()::date,
         valid_until = (NOW()::date + ((COALESCE(valid_days, 1) - 1) * INTERVAL '1 day')),
         reveal_at = COALESCE(reveal_at, NOW()),
         updated_at = NOW()
     WHERE user_id = $1
       AND coupon_code = $2
     RETURNING id, coupon_code, status, valid_from, valid_until`,
    [user.id, code],
  );

  console.log(JSON.stringify(rows, null, 2));
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
