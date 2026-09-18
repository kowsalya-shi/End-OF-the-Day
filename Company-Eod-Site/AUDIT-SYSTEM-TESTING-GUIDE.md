# Audit System Testing Guide

## Overview
The audit system tracks all deletions of Tasks, EOD entries, and Daily Work records across the system. It provides role-based delete permissions and a comprehensive audit log for managers.

## Features Implemented

### 1. Database
- ✅ `audit_log` table created with full audit trail
- ✅ Indexes for performance optimization
- ✅ JSONB column for storing detailed record snapshots

### 2. Backend API
- ✅ Audit logging functions for Tasks, EOD, and Daily Work
- ✅ Role-based delete permissions:
  - **Employee**: Can delete own records only
  - **TL**: Can delete own records + team members' records
  - **IT Manager**: Can delete any records
  - **Manager**: Can delete any records
  - **CEO**: Can delete any records
- ✅ `/api/audit` endpoint for retrieving audit logs
- ✅ `/api/audit/stats` endpoint for statistics
- ✅ IP address tracking for security

### 3. Frontend
- ✅ Audit Log page with filters (module, action, date range, user search)
- ✅ Statistics cards showing deletion counts by type
- ✅ Export to CSV functionality
- ✅ Available for Manager, IT Manager, and CEO roles

---

## Testing Steps

### Prerequisites
1. Backend server running on `http://localhost:8080`
2. Frontend server running on `http://localhost:23881`
3. Database tables created (run `node create-audit-table.mjs` if needed)

---

### Test 1: Employee Deleting Own Task

**Expected Behavior**: Employee can delete their own task, and it appears in audit log.

**Steps**:
1. Login as Employee (e.g., `kowsalya@arraafiinfotech.com` / `emp123`)
2. Go to **Tasks** page
3. Find a task assigned to you
4. Click the **Delete** button (trash icon)
5. Confirm deletion
6. **Expected**: Task is deleted successfully

**Verify**:
1. Logout and login as Manager (`manager@arraafi.com` / `manager123`)
2. Go to **Audit Log** page
3. **Expected**: See a deletion record with:
   - User: Kowsalya (or the employee's name)
   - Action: DELETE
   - Module: Task
   - Record Title: The task name
   - Timestamp and IP address

---

### Test 2: Employee Cannot Delete Other's Task

**Expected Behavior**: Employee cannot delete another employee's task.

**Steps**:
1. Login as Employee (e.g., `kowsalya@arraafiinfotech.com` / `emp123`)
2. Check if employee can see other employee's tasks
3. **Expected**: Employee should only see their own tasks in the Tasks page
4. If they somehow try to delete via API, they should get a 403 Forbidden error

---

### Test 3: Team Leader Deleting Team Member's Task

**Expected Behavior**: TL can delete tasks of their team members.

**Steps**:
1. Login as Team Leader (e.g., `rajshekar@arraafiinfotech.com` / `tl123`)
2. Go to **Tasks** → **Team Tasks** tab
3. Find a task assigned to a team member
4. Click **Delete** button
5. **Expected**: Task is deleted successfully

**Verify**:
1. Login as Manager
2. Go to **Audit Log** page
3. **Expected**: See deletion record with TL's name as the user

---

### Test 4: Manager Deleting Any Task

**Expected Behavior**: Manager can delete any task in the system.

**Steps**:
1. Login as Manager (`manager@arraafi.com` / `manager123`)
2. Go to **Tasks** page
3. Select any task (from any employee)
4. Click **Delete** button
5. **Expected**: Task is deleted successfully

**Verify**:
1. Go to **Audit Log** page
2. **Expected**: See deletion record with Manager as the user

---

### Test 5: EOD Deletion Audit

**Expected Behavior**: EOD deletions are tracked in audit log.

**Steps**:
1. Login as Employee
2. Go to **EOD History** or **Dashboard**
3. Find an EOD submission
4. Delete the EOD entry (if delete button exists)
5. **Expected**: EOD is deleted

**Verify**:
1. Login as Manager
2. Go to **Audit Log** page
3. Filter by Module: **EOD**
4. **Expected**: See the deleted EOD record

---

### Test 6: Daily Work Deletion Audit

**Expected Behavior**: Daily Work deletions are tracked in audit log.

**Steps**:
1. Login as Employee
2. Go to **Daily Work** page
3. Find a daily work entry
4. Click **Delete** button
5. **Expected**: Entry is deleted

**Verify**:
1. Login as Manager
2. Go to **Audit Log** page
3. Filter by Module: **Daily Work**
4. **Expected**: See the deleted daily work record

---

### Test 7: Audit Log Filtering

**Expected Behavior**: Filters work correctly to narrow down audit records.

**Steps**:
1. Login as Manager
2. Go to **Audit Log** page
3. Test each filter:
   - **Module**: Select "Tasks" → See only task deletions
   - **Action**: Select "Delete" → See only delete actions
   - **Start Date**: Set to today → See today's deletions
   - **End Date**: Set to today → See today's deletions
   - **Search User**: Type employee name → See that user's deletions

**Expected**: Filters work correctly and update the table

---

### Test 8: Audit Log Statistics

**Expected Behavior**: Statistics cards show correct counts.

**Steps**:
1. Login as Manager
2. Go to **Audit Log** page
3. Check the statistics cards at the top:
   - Total Deletions
   - Task Deletions
   - EOD Deletions
   - Daily Work Deletions

**Expected**: Numbers match the actual deletion counts

---

### Test 9: Export Audit Log to CSV

**Expected Behavior**: Export button generates CSV file.

**Steps**:
1. Login as Manager
2. Go to **Audit Log** page
3. Click **Export CSV** button
4. **Expected**: CSV file downloads with all audit records

**Verify**: Open CSV file and check:
- Columns: Date, User, Action, Module, Record ID, Title, IP Address
- Data matches what's shown in the table

---

### Test 10: Permission Check - IT Manager and CEO

**Expected Behavior**: IT Manager and CEO can also access Audit Log.

**Steps**:
1. Login as IT Manager (if you have one)
2. Check sidebar → **Audit Log** link should be visible
3. Go to **Audit Log** page
4. **Expected**: Page loads with audit records

5. Logout and login as CEO (`hr@arraafi.com` / `hr123`)
6. Check sidebar → **Audit Log** link should be visible
7. Go to **Audit Log** page
8. **Expected**: Page loads with audit records

---

## Verification Checklist

- [ ] Employee can delete own tasks
- [ ] Employee cannot delete other's tasks
- [ ] TL can delete team members' tasks
- [ ] Manager can delete any tasks
- [ ] IT Manager can delete any tasks
- [ ] CEO can delete any tasks
- [ ] Task deletions are logged in audit_log table
- [ ] EOD deletions are logged in audit_log table
- [ ] Daily Work deletions are logged in audit_log table
- [ ] Audit Log page shows all deletions
- [ ] Filters work correctly (module, action, date, user)
- [ ] Statistics cards show correct counts
- [ ] Export to CSV works
- [ ] IP addresses are captured
- [ ] Deletion records persist even after original record is deleted
- [ ] Only Manager, IT Manager, and CEO can access Audit Log page

---

## Database Queries for Verification

### Check all audit records:
```sql
SELECT * FROM audit_log ORDER BY deleted_at DESC LIMIT 10;
```

### Count deletions by module:
```sql
SELECT module, COUNT(*) 
FROM audit_log 
GROUP BY module;
```

### Find deletions by specific user:
```sql
SELECT * FROM audit_log 
WHERE user_name = 'Kowsalya' 
ORDER BY deleted_at DESC;
```

### Check recent deletions (last 24 hours):
```sql
SELECT * FROM audit_log 
WHERE deleted_at > NOW() - INTERVAL '24 hours' 
ORDER BY deleted_at DESC;
```

---

## Troubleshooting

### Issue: Audit records not appearing

**Solution**:
1. Check if audit_log table exists: `SELECT * FROM audit_log;`
2. Check backend logs for errors
3. Verify backend server was restarted after code changes
4. Try deleting a task and check database directly

### Issue: Permission denied when deleting

**Solution**:
1. Check user role in database
2. Verify delete endpoint has correct permission logic
3. Check browser console for error messages
4. Verify auth token is valid

### Issue: Audit Log page not accessible

**Solution**:
1. Check if user role is manager, it_manager, or ceo
2. Verify route is added in App.tsx
3. Check navigation link in MainLayout.tsx
4. Clear browser cache and refresh

---

## Success Criteria

✅ **All features working**:
1. Deletions are recorded in database
2. Role-based permissions enforced
3. Audit Log page displays records correctly
4. Filters and search work
5. Export to CSV works
6. All three roles (Manager, IT Manager, CEO) can access the page

---

## Next Steps (Optional Enhancements)

1. **Add soft delete** instead of hard delete (mark as deleted but keep in DB)
2. **Email notifications** for sensitive deletions
3. **Audit for CREATE and UPDATE** actions (not just DELETE)
4. **Restore functionality** to un-delete records
5. **Advanced filters** (date range picker, multi-select modules)
6. **Pagination** for large audit logs
7. **Real-time updates** using WebSockets

---

## Files Modified

### Backend:
- `lib/db/src/schema/audit.ts` - Audit log table schema
- `artifacts/api-server/src/lib/audit.ts` - Audit logging functions
- `artifacts/api-server/src/routes/audit.ts` - Audit API endpoints
- `artifacts/api-server/src/routes/tasks.ts` - Task delete with audit
- `artifacts/api-server/src/routes/eod.ts` - EOD delete with audit
- `artifacts/api-server/src/routes/dailyWork.ts` - Daily work delete with audit

### Frontend:
- `artifacts/eod-portal/src/pages/manager/audit.tsx` - Audit Log page
- `artifacts/eod-portal/src/App.tsx` - Audit routes
- `artifacts/eod-portal/src/components/layout/MainLayout.tsx` - Navigation link

---

**End of Testing Guide**
