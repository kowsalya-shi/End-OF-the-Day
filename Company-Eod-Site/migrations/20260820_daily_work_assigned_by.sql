ALTER TABLE daily_work ADD COLUMN IF NOT EXISTS assigned_by TEXT;

-- Existing self-entered Daily Work has no separate assigner, so show the worker's name.
UPDATE daily_work AS work
SET assigned_by = users.name
FROM users
WHERE work.user_id = users.id
  AND work.assigned_by IS NULL;
