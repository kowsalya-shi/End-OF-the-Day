-- Bring installations created before the Daily Work-to-Task sync migration
-- up to the task and notification schema used by the current API.
ALTER TABLE internal_tasks
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS portal_notifications (
  id SERIAL PRIMARY KEY,
  recipient_user_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_date DATE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS portal_notifications_daily_recipient_type_idx
  ON portal_notifications (recipient_user_id, employee_id, type, target_date);

CREATE INDEX IF NOT EXISTS portal_notifications_recipient_created_idx
  ON portal_notifications (recipient_user_id, created_at DESC);

-- Notifications belong to one recipient. These fields preserve the recipient's
-- role at delivery time and link task-related alerts without changing existing
-- notification records.
ALTER TABLE portal_notifications
  ADD COLUMN IF NOT EXISTS recipient_role TEXT;
ALTER TABLE portal_notifications
  ADD COLUMN IF NOT EXISTS related_task_id INTEGER;
UPDATE portal_notifications pn
SET recipient_role = u.role
FROM users u
WHERE pn.recipient_user_id = u.id AND pn.recipient_role IS NULL;
ALTER TABLE portal_notifications
  ALTER COLUMN recipient_role SET NOT NULL;
