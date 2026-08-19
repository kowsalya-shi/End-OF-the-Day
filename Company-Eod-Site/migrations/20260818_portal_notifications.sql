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
