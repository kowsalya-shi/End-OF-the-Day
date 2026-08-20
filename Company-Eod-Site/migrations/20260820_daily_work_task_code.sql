-- Show Daily Work records in the Task module with normal task codes.
-- The numeric part remains the Daily Work record ID, so synchronization stays deterministic.
UPDATE internal_tasks
SET task_code = 'TASK-' || substring(task_code FROM 'DAILY-WORK-(.+)$')
WHERE task_code LIKE 'DAILY-WORK-%';
