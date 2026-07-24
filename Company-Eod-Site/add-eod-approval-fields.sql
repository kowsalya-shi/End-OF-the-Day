-- Migration: Add EOD Approval Fields
-- Date: 2026-01-10
-- Description: Adds approval workflow fields to eod_submissions table

-- Add approval fields to eod_submissions table
ALTER TABLE eod_submissions 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by INTEGER,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS tl_comments TEXT;

-- Add index for faster approval status queries
CREATE INDEX IF NOT EXISTS idx_eod_approval_status ON eod_submissions(approval_status);
CREATE INDEX IF NOT EXISTS idx_eod_team_approval ON eod_submissions(team_id, approval_status);

-- Create EOD approval history table for audit trail
CREATE TABLE IF NOT EXISTS eod_approval_history (
  id SERIAL PRIMARY KEY,
  eod_id INTEGER NOT NULL REFERENCES eod_submissions(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'approved', 'rejected', 'sent_back'
  performed_by INTEGER NOT NULL,
  performed_by_name TEXT,
  performed_by_role TEXT, -- 'tl', 'manager', 'ceo'
  reason TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for approval history queries
CREATE INDEX IF NOT EXISTS idx_approval_history_eod ON eod_approval_history(eod_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_performer ON eod_approval_history(performed_by);

-- Update existing records to have 'pending' status if null
UPDATE eod_submissions 
SET approval_status = 'pending' 
WHERE approval_status IS NULL;

-- Add comment
COMMENT ON COLUMN eod_submissions.approval_status IS 'EOD approval status: pending, approved, rejected, sent_back';
COMMENT ON COLUMN eod_submissions.approved_by IS 'User ID of the person who approved/rejected the EOD';
COMMENT ON COLUMN eod_submissions.approved_at IS 'Timestamp when the EOD was approved/rejected';
COMMENT ON COLUMN eod_submissions.rejection_reason IS 'Reason for rejection (required when status is rejected)';
COMMENT ON COLUMN eod_submissions.tl_comments IS 'Comments from Team Leader';
COMMENT ON TABLE eod_approval_history IS 'Audit trail for all EOD approval actions';

-- Success message
SELECT 'EOD approval fields added successfully!' AS message;
