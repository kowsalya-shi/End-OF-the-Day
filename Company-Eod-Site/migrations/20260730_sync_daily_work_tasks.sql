-- Keeps Daily Work and the Task module on the same current schema.
-- Each Daily Work record owns one task identified by task_code = TASK-<daily_work.id>.

ALTER TABLE daily_work ADD COLUMN IF NOT EXISTS how TEXT;
ALTER TABLE daily_work ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE daily_work ADD COLUMN IF NOT EXISTS completion_date DATE;
ALTER TABLE daily_work ADD COLUMN IF NOT EXISTS completion_pct INTEGER DEFAULT 0;
ALTER TABLE daily_work ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE daily_work ADD COLUMN IF NOT EXISTS team_id INTEGER;
ALTER TABLE daily_work ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL;

CREATE TABLE IF NOT EXISTS internal_tasks (
  id SERIAL PRIMARY KEY,
  task_code TEXT,
  task_name TEXT NOT NULL,
  how TEXT,
  who TEXT,
  assigned_by TEXT,
  priority TEXT DEFAULT 'medium',
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  status TEXT NOT NULL DEFAULT 'yts',
  completion_pct INTEGER DEFAULT 0,
  dependency TEXT,
  remarks TEXT,
  etc TEXT,
  user_id INTEGER,
  team_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS internal_tasks_task_code_index
  ON internal_tasks (task_code);
