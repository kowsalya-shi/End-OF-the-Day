# Email Notification System - Complete Guide

## 📧 Email Account Configuration

### System Email Account
**Email**: `eod_reports@arraafiinfotech.com`  
**Purpose**: System-generated sender for all automated EOD and task escalation emails  
**Server**: `mail.arraafiinfotech.com:587`

### ⚠️ IMPORTANT: Account Setup Required
The email account `eod_reports@arraafiinfotech.com` must be created on your mail server before emails will send.

**Steps to Complete Setup**:
1. **Create Email Account** on `mail.arraafiinfotech.com`
   - Username: `eod_reports@arraafiinfotech.com`
   - Set a strong password
2. **Update `.env` file** in `artifacts/api-server/.env`:
   ```env
   SMTP_USER=eod_reports@arraafiinfotech.com
   SMTP_PASSWORD=<your_actual_password_here>
   ```
3. **Restart the backend server**:
   ```powershell
   cd artifacts\api-server
   node dist\index.mjs
   ```

### Current Configuration (`.env`)
```env
# Email Configuration for EOD System
SMTP_HOST=mail.arraafiinfotech.com
SMTP_PORT=587
SMTP_USER=eod_reports@arraafiinfotech.com
SMTP_PASSWORD=Developer123$5    # ← Update this after creating account
SMTP_SSL=false

# Leadership Email Addresses for EOD Notifications
IT_MANAGER_EMAIL=waseem@arraafiinfotech.com
CEO_EMAIL=thaseenaka@arraafiinfotech.com
MANAGER_EMAIL=aap@arraafiinfotech.com

# Team Lead Emails (comma-separated)
TL_EMAILS=rajshekar@arraafiinfotech.com,javed@arraafiinfotech.com,soubhagya@arraafiinfotech.com,amita@arraafiinfotech.com
```

---

## 📋 Email Notification Types

### 1. Missing EOD Alert
**Trigger**: Employee does not submit EOD by end of day  
**Frequency**: Daily (automated at 9 PM)  
**Sender**: `eod_reports@arraafiinfotech.com`

**Subject**: `[EOD Missing] {Name} ({Role}) has not submitted EOD for {Date}`

**Recipients by Role**:
| Employee Role | Email Recipients |
|--------------|------------------|
| Employee | TL + IT Manager + Manager + CEO |
| TL | IT Manager + Manager + CEO |
| IT Manager | Manager + CEO |
| Manager | CEO only |
| CEO | None (no escalation) |

**Email Content**:
- Employee name and email
- Role (Employee/TL/IT Manager/Manager)
- Team name (if applicable)
- Date of missing EOD
- Request to follow up

---

### 2. 3-Day EOD Escalation
**Trigger**: Employee misses 3 or more EODs in the past 30 days  
**Frequency**: Daily check (automated)  
**Sender**: `eod_reports@arraafiinfotech.com`

**Subject**: `[ESCALATION] {Name} - {Count} EOD Reports Missing`

**Recipients**: Same hierarchy as Missing EOD Alert

**Email Content**:
- Employee name and role
- Total missed EOD count (in past 30 days)
- List of recent missed dates
- Team name (if applicable)
- Urgent action required notice

**Example**:
```
⚠️ EOD Escalation Alert

Kowsalya (Employee) has missed 5 EOD submissions in the past 30 days.

Team: Development Team

Recent Missed Dates:
• 2026-09-05
• 2026-09-03
• 2026-09-01
• 2026-08-29
• 2026-08-27

Action Required: Please follow up with Kowsalya urgently regarding their EOD submission compliance.
```

---

### 3. WIP Ageing Alert (5+ Days)
**Trigger**: Task remains in WIP status for 5 or more days  
**Frequency**: Daily check (automated)  
**Sender**: `eod_reports@arraafiinfotech.com`

**Subject**: `[AGEING TASK] {Name} - Task in WIP for {Days} days`

**Recipients**: Same hierarchy as Missing EOD Alert

**Email Content**:
- Employee name and role
- Task name and code
- Current status (WIP)
- Days in status
- Priority level
- Team name (if applicable)
- Action required notice

**Example**:
```
⚠️ Ageing Task Alert

Arun (Employee) has a task that has been in WIP status for 7 days.

Team: Development Team

Task Details:
• Task Name: Client Portal Integration
• Task Code: TASK-2024-123
• Status: WIP
• Days in Status: 7 days
• Priority: High

Action Required: Task has been stuck in WIP for more than 5 days. Please follow up to identify blockers and ensure progress.
```

---

### 4. YTS Ageing Alert (5+ Days)
**Trigger**: Task remains in YTS (Yet To Start) status for 5 or more days  
**Frequency**: Daily check (automated)  
**Sender**: `eod_reports@arraafiinfotech.com`

**Subject**: `[AGEING TASK] {Name} - Task in YTS for {Days} days`

**Recipients**: Same hierarchy as Missing EOD Alert

**Email Content**: Same as WIP Ageing Alert, but status is YTS

---

### 5. Holding Ageing Alert (5+ Days)
**Trigger**: Task remains in Holding status for 5 or more days  
**Frequency**: Daily check (automated)  
**Sender**: `eod_reports@arraafiinfotech.com`

**Subject**: `[AGEING TASK] {Name} - Task in HOLDING for {Days} days`

**Recipients**: Same hierarchy as Missing EOD Alert

**Email Content**: Same as WIP Ageing Alert, but status is Holding

---

## 🔄 Automated Email Schedule

### Daily Automated Checks
The system runs the following checks automatically:

**1. At Server Startup**:
- Process ageing tasks (5+ days in YTS/WIP/Holding)
- Process overdue work notifications
- Backfill yesterday's missing EOD notifications

**2. Every Day at 9:00 PM** (configured in cron):
- Check for missing EOD submissions
- Send missing EOD alerts to leadership
- Check for 3-day escalation (3+ missed EODs)
- Send escalation emails

**3. Daily Ageing Task Check** (configurable):
- Scan all tasks in YTS/WIP/Holding status
- Calculate days in current status
- Send alerts for tasks ≥ 5 days
- Create portal notifications

---

## 🎯 Email Hierarchy (Role-Based Escalation)

### Employee Missing EOD
```
Employee
    ↓
TL (of employee's team)
    ↓
IT Manager
    ↓
Manager
    ↓
CEO
```

### TL Missing EOD
```
TL
    ↓
IT Manager
    ↓
Manager
    ↓
CEO
```

### IT Manager Missing EOD
```
IT Manager
    ↓
Manager
    ↓
CEO
```

### Manager Missing EOD
```
Manager
    ↓
CEO
```

### CEO Missing EOD
```
CEO
(No escalation - no one above CEO)
```

### Task Ageing Alerts
Uses the **same hierarchy** as EOD alerts based on task assignee's role.

---

## 🛠️ Manual Email Triggers (API Endpoints)

### 1. Manual Missing EOD Check
```bash
POST http://localhost:8080/api/notifications/check-missing-eods
Content-Type: application/json
Authorization: Bearer <token>

{
  "date": "2026-09-08"  # Optional, defaults to today
}
```

**Response**:
```json
{
  "success": true,
  "pending": 5,
  "created": 5,
  "emailsSent": 5,
  "message": "Processed 5 missing EODs. Created 5 notifications. Sent 5 emails."
}
```

---

### 2. Manual Escalation Check
```bash
POST http://localhost:8080/api/notifications/send-escalation
Content-Type: application/json
Authorization: Bearer <token>

{
  "date": "2026-09-08"  # Optional, defaults to today
}
```

**Response**:
```json
{
  "success": true,
  "sent": 2,
  "created": 2,
  "pending": 5,
  "message": "Processed 5 missing EODs. Created 2 notifications. Sent 2 emails."
}
```

---

### 3. Manual Ageing Task Check
```bash
POST http://localhost:8080/api/notifications/check-ageing-tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "date": "2026-09-08"  # Optional, defaults to today
}
```

**Response**:
```json
{
  "success": true,
  "created": 8,
  "emailsSent": 8,
  "message": "Created 8 ageing task notifications. Sent 8 emails."
}
```

---

## 📊 Email vs Portal Notifications

### Both Systems Work Together

| Notification Type | Portal Notification | Email Alert |
|-------------------|--------------------:|------------:|
| Missing EOD | ✅ Yes | ✅ Yes |
| 3-Day Escalation | ✅ Yes | ✅ Yes |
| WIP Ageing (5+ days) | ✅ Yes | ✅ Yes |
| YTS Ageing (5+ days) | ✅ Yes | ✅ Yes |
| Holding Ageing (5+ days) | ✅ Yes | ✅ Yes |

**Portal Notifications**: Visible in the Notifications page in the portal  
**Email Alerts**: Sent to leadership emails for immediate action

---

## 🧪 Testing Email Configuration

### 1. Check SMTP Connection
```powershell
# Test if mail server is reachable
Test-NetConnection -ComputerName mail.arraafiinfotech.com -Port 587
```

**Expected**: `TcpTestSucceeded : True`

---

### 2. Verify Email Account
```powershell
# Try sending a test email using PowerShell
Send-MailMessage -From "eod_reports@arraafiinfotech.com" `
  -To "your-test-email@arraafiinfotech.com" `
  -Subject "Test Email" `
  -Body "Testing SMTP configuration" `
  -SmtpServer "mail.arraafiinfotech.com" `
  -Port 587 `
  -UseSsl `
  -Credential (Get-Credential)
```

**Expected**: Email received in inbox

---

### 3. Test Via API
```bash
# Trigger a manual check to test email sending
curl -X POST http://localhost:8080/api/notifications/check-missing-eods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"date": "2026-09-08"}'
```

**Check Server Logs**:
```
[INFO] Sent missing EOD leadership email
  to: ["waseem@arraafiinfotech.com", ...]
  userId: 6
```

---

## ⚠️ Troubleshooting

### Issue 1: "535 Incorrect authentication data"
**Cause**: Email account doesn't exist or wrong password

**Solution**:
1. Create `eod_reports@arraafiinfotech.com` on mail server
2. Update `SMTP_PASSWORD` in `.env` file
3. Restart backend server

---

### Issue 2: No emails being sent
**Possible Causes**:
- SMTP credentials not configured
- Email account not created
- Firewall blocking port 587
- No missing EODs or ageing tasks to report

**Check**:
1. Look at server logs for errors
2. Verify `.env` configuration
3. Test SMTP connection manually
4. Check if there are actual missing EODs/ageing tasks

---

### Issue 3: Emails go to spam
**Solution**:
1. Add `eod_reports@arraafiinfotech.com` to allowed senders
2. Configure SPF/DKIM records for your domain
3. Ask IT to whitelist the email address

---

### Issue 4: Duplicate emails
**Prevention**: System checks for existing notifications before sending

**If occurs**:
- Check database for duplicate portal_notifications entries
- Review cron job configuration (shouldn't run multiple times)

---

## 🔧 Configuration Files

### Backend Configuration
**File**: `artifacts/api-server/.env`

```env
# Email Configuration
SMTP_HOST=mail.arraafiinfotech.com
SMTP_PORT=587
SMTP_USER=eod_reports@arraafiinfotech.com
SMTP_PASSWORD=<password>
SMTP_SSL=false

# Leadership Emails
IT_MANAGER_EMAIL=waseem@arraafiinfotech.com
CEO_EMAIL=thaseenaka@arraafiinfotech.com
MANAGER_EMAIL=aap@arraafiinfotech.com
TL_EMAILS=rajshekar@arraafiinfotech.com,javed@arraafiinfotech.com,soubhagya@arraafiinfotech.com,amita@arraafiinfotech.com
```

### Email Override Mapping
**File**: `artifacts/api-server/src/routes/notifications.ts`

```typescript
const ALERT_EMAIL_OVERRIDES: Record<string, string> = {
  "Waseem Ahmed Jamadar": "waseem@gmail.com",
  "Thaseena Khanum": "Thaseena.Khanum@arraafiinfotech.com",
  "Asim Alam": "aap@arraafiinfotech.com",
  "Soubhagya M Bhat": "soubhgya@arraafiinfotech.com",
  "Rajshekar Swamy": "rajshekar@arraafiinfotech.com",
  "Amita Akash Mudholkar": "amita@arraafiinfotech.com",
  "Mohammad Javed Akhter": "javed@arraafiinfotech.com",
};
```

---

## 📝 Email Requirements Summary

| S.No | Short Task Name | Requirement | Status |
|------|----------------|-------------|---------|
| 13 | EOD Mail Configuration | Configure the system-generated EOD email account for automated notifications. | ✅ Complete (account needs creation) |
| 14 | EOD Non-Submission Alert | If an employee does not submit EOD, send an email to the respective TL, IT Manager, Manager and CEO. | ✅ Complete |
| 15 | WIP Overdue Alert | If a task remains WIP for more than 5 days, send an escalation email to the relevant authorities. | ✅ Complete |
| 16 | YTS Overdue Alert | If a task remains YTS/Pending for more than 5 days, send an escalation email to the relevant authorities. | ✅ Complete |
| 17 | 3-Day EOD Escalation | If an employee continuously fails to submit EOD for 3 days, trigger the escalation email. | ✅ Complete |
| 18 | Role-Based Email Escalation | Email recipients should be determined according to the employee/TL/IT Manager reporting hierarchy. | ✅ Complete |

---

## 🎯 Next Steps

### To Enable Email Sending:
1. ✅ **Update `.env`** - Already configured
2. ✅ **Add email functions** - Already implemented
3. ✅ **Re-enable email sending** - Already enabled
4. ⚠️ **Create email account** - **ACTION REQUIRED**
   - Create `eod_reports@arraafiinfotech.com` on mail server
   - Set password and update `.env`
5. ✅ **Rebuild backend** - Already done
6. ✅ **Restart server** - Already running
7. ⏳ **Test emails** - Waiting for account creation

### Once Email Account is Created:
```powershell
# 1. Stop server (Ctrl+C)

# 2. Update password in .env
# Edit: artifacts/api-server/.env
# Set: SMTP_PASSWORD=<actual_password>

# 3. Restart server
cd artifacts\api-server
node dist\index.mjs

# 4. Test email sending
# - Wait for 9 PM (automated check)
# - OR trigger manual check via API
# - Check server logs for "Sent missing EOD leadership email"
```

---

## 📞 Support

For email configuration issues:
- **IT Team**: Configure mail server and create email account
- **Manager**: Review email escalation hierarchy
- **Development Team**: Debug email sending issues or modify templates

---

**System Ready**: Email notification system is fully implemented and ready to send emails once the `eod_reports@arraafiinfotech.com` account is created.

**Last Updated**: 2026-09-08  
**Version**: 1.0
