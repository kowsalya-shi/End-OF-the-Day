-- Link Daily Work records that were automatically created from a Task.
-- This is additive and preserves all existing Daily Work entries.
ALTER TABLE daily_work ADD COLUMN IF NOT EXISTS source_task_id INTEGER;

CREATE INDEX IF NOT EXISTS daily_work_source_task_id_idx
  ON daily_work (source_task_id)
  WHERE source_task_id IS NOT NULL;
