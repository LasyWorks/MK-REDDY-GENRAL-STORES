const { query, queryOne } = require("../src/config/database");
const logger = require("../src/utils/logger");

async function seedBirthdayEligibleUser() {
  const email = "2200080137aids@gmail.com";
  const phone = "9000009999";

  const role = await queryOne(
    "SELECT id FROM roles WHERE name = 'retail_customer' LIMIT 1",
  );

  if (!role?.id) {
    throw new Error("retail_customer role not found");
  }

  const existing = await queryOne(
    "SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1",
    [email, phone],
  );

  const dob = "1996-04-15";

  if (existing?.id) {
    const rows = await query(
      `UPDATE users
       SET role_id = $2,
           name = $3,
           display_name = $4,
           phone = $5,
           email = $6,
           user_type = 'retail',
           address = $7,
           date_of_birth = $8::date,
           email_verified = TRUE,
           is_active = TRUE,
           is_blocked = FALSE,
           deleted_at = NULL,
           created_at = NOW() - INTERVAL '6 months',
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, phone, date_of_birth, user_type, created_at`,
      [
        existing.id,
        role.id,
        "Birthday Demo User",
        "Birthday Demo",
        phone,
        email,
        "MK Reddy Demo Address",
        dob,
      ],
    );

    logger.info("[seed-birthday-test-user] Updated existing user", rows[0]);
    return rows[0];
  }

  const rows = await query(
    `INSERT INTO users (
       role_id,
       name,
       display_name,
       phone,
       email,
       user_type,
       address,
       date_of_birth,
       email_verified,
       is_active,
       is_blocked,
       created_at,
       updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, 'retail', $6, $7::date, TRUE, TRUE, FALSE,
       NOW() - INTERVAL '6 months', NOW()
     )
     RETURNING id, name, email, phone, date_of_birth, user_type, created_at`,
    [
      role.id,
      "Birthday Demo User",
      "Birthday Demo",
      phone,
      email,
      "MK Reddy Demo Address",
      dob,
    ],
  );

  logger.info("[seed-birthday-test-user] Created user", rows[0]);
  return rows[0];
}

seedBirthdayEligibleUser()
  .then((user) => {
    console.log("Birthday eligible dummy user ready:", user);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to seed birthday eligible dummy user:", error.message);
    process.exit(1);
  });
