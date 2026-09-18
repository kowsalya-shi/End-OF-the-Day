-- Create audit_log table for tracking deletions
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id INTEGER NOT NULL,
  record_title TEXT,
  record_details JSONB,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT
);

-- Create indexes for faster queries
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_module ON audit_log(module);
CREATE INDEX idx_audit_log_deleted_at ON audit_log(deleted_at DESC);

-- Add comments
COMMENT ON TABLE audit_log IS 'Audit trail for tracking deletions and other critical actions';
COMMENT ON COLUMN audit_log.action IS 'Action type: DELETE, UPDATE, etc.';
COMMENT ON COLUMN audit_log.module IS 'Module: TASK, EOD, DAILY_WORK, TRAINING';
COMMENT ON COLUMN audit_log.record_details IS 'JSON snapshot of the deleted record';
