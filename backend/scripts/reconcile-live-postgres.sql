-- Reconcile live PostgreSQL schema drift (generated from live DB audit on 2026-04-02)
-- Run on the target database after taking a backup.

BEGIN;

-- 1) Match schema.sql expectation for admin_notifications
ALTER TABLE public.admin_notifications
  ADD COLUMN IF NOT EXISTS data JSONB;

-- 2) Bring quantity precision in line with loose/fractional quantity support
ALTER TABLE public.cart_items
  ALTER COLUMN quantity TYPE NUMERIC(10,3)
  USING quantity::NUMERIC(10,3);

ALTER TABLE public.order_items
  ALTER COLUMN quantity TYPE NUMERIC(10,3)
  USING quantity::NUMERIC(10,3);

COMMIT;

-- 3) Optional cleanup for backup table
-- Keep as archive if needed:
-- CREATE SCHEMA IF NOT EXISTS archive;
-- ALTER TABLE public.users_backup_1772465884445 SET SCHEMA archive;

-- Or delete it if confirmed unnecessary:
-- DROP TABLE IF EXISTS public.users_backup_1772465884445;

-- 4) Optional strict alignment with schema.sql (destructive)
-- WARNING: run only if your application no longer depends on these columns.
-- ALTER TABLE public.admin_notifications
--   DROP COLUMN IF EXISTS product_id,
--   DROP COLUMN IF EXISTS order_id,
--   DROP COLUMN IF EXISTS stock_at_alert,
--   DROP COLUMN IF EXISTS email_sent_at,
--   DROP COLUMN IF EXISTS resolved_at;

-- ALTER TABLE public.invoices
--   DROP COLUMN IF EXISTS sms_sent;

-- ALTER TABLE public.products
--   DROP COLUMN IF EXISTS image_urls;
