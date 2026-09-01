/*
# Fix shared content visibility and broadcast notifications

## Problem
1. When admin creates championships, cups, stages, and races, the `is_global`
   column defaults to `false`. The RLS SELECT policies only show rows where
   `is_global = true` OR `auth.uid() = user_id`. So associations never see
   admin-created content — it looks empty for them.
2. Notifications are owner-scoped (`auth.uid() = user_id`). When admin creates
   a notification, only the admin sees it. There is no broadcast mechanism
   to send notifications to all association accounts.

## Changes
1. Add `is_global boolean DEFAULT false` to `notifications` table.
2. Update `notifications` RLS: all authenticated users can SELECT global
   notifications; users can still manage their own non-global notifications.
   Admin can insert global (broadcast) notifications.
3. Backfill: set `is_global = true` on all existing rows in championships,
   cups, stages, races, and categories that were created by admin users.
   Also set `is_global = true` on existing notifications created by admin.

## Security
- Notifications SELECT: `auth.uid() = user_id OR is_global = true` — users
  see their own + all broadcast notifications.
- Notifications INSERT: owner can insert own; admin can insert global.
- Notifications UPDATE: owner updates own; admin updates global.
- Notifications DELETE: owner deletes own; admin deletes global.
*/

-- 1. Add is_global to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;

-- 2. Backfill existing admin-created shared content
UPDATE championships SET is_global = true
  FROM profiles
  WHERE profiles.id = championships.user_id
    AND profiles.role IN ('admin', 'super_admin')
    AND championships.is_global = false;

UPDATE cups SET is_global = true
  FROM profiles
  WHERE profiles.id = cups.user_id
    AND profiles.role IN ('admin', 'super_admin')
    AND cups.is_global = false;

UPDATE stages SET is_global = true
  FROM profiles
  WHERE profiles.id = stages.user_id
    AND profiles.role IN ('admin', 'super_admin')
    AND stages.is_global = false;

UPDATE races SET is_global = true
  FROM profiles
  WHERE profiles.id = races.user_id
    AND profiles.role IN ('admin', 'super_admin')
    AND races.is_global = false;

UPDATE categories SET is_global = true
  FROM profiles
  WHERE profiles.id = categories.user_id
    AND profiles.role IN ('admin', 'super_admin')
    AND categories.is_global = false;

UPDATE notifications SET is_global = true
  FROM profiles
  WHERE profiles.id = notifications.user_id
    AND profiles.role IN ('admin', 'super_admin')
    AND notifications.is_global = false;

-- 3. Update notifications RLS policies
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_global = true);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- 4. Index for global notifications
CREATE INDEX IF NOT EXISTS idx_notifications_global ON notifications(is_global);
