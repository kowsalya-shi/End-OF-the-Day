CREATE TABLE IF NOT EXISTS task_reassignments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  reassigned_by_user_id INTEGER NOT NULL,
  from_user_id INTEGER,
  to_user_id INTEGER NOT NULL,
  from_team_id INTEGER,
  to_team_id INTEGER,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_reassignments_task_created_idx
  ON task_reassignments (task_id, created_at DESC);
