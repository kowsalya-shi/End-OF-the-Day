# Email Notification Setup Guide

## Quick Setup (3 Steps)

### Step 1: Update .env File

**File Location:** `c:\Users\Shiny\Company-Eod-Site\Company-Eod-Site\artifacts\api-server\.env`

**Replace:** `YOUR_REAL_PASSWORD_HERE` with your SMTP password for `waseem@arraafiinfotech.com`

```env
SMTP_HOST=mail.arraafiinfotech.com
SMTP_PORT=465
SMTP_USER=waseem@arraafiinfotech.com
SMTP_PASSWORD=your_actual_password_here  ← Change this line!
SMTP_SSL=true
```

### Step 2: Restart Backend

```powershell
# Option A: Kill and restart
Stop-Process -Name node -Force
cd c:\Users\Shiny\Company-Eod-Site\Company-Eod-Site
cmd /c start-backend.bat

# Option B: Use start-all.bat
cd c:\Users\Shiny\Company-Eod-Site\Company-Eod-Site
cmd /c start-all.bat
```

### Step 3: Test (Optional)

**Trigger missing EOD check manually:**
```powershell
# For today's date
$date = Get-Date -Format "yyyy-MM-dd"
curl -X POST "http://localhost:8080/api/notifications/send-escalation" -H "Content-Type: application/json" -d "{\"date\": \"$date\"}"
```

---

## How It Works

### Normal Flow:
```
Employee submits EOD
        ↓
System: OK, no alert
        ↓
Nothing happens ✓
```

### Missing EOD Flow:
```
Employee does NOT submit EOD
        ↓
System detects missing EOD
        ↓
    ┌───────┴───────┐
    ↓               ↓
Dashboard       Email sent
Notification    to leadership
    ↓               ↓
- Employee      Recipients:
- TL            - TL
- Manager       - Manager
- IT Manager    - IT Manager
- CEO           - CEO
```

### 3-Day Escalation:
```
3 consecutive days without EOD
        ↓
Escalation notification
        ↓
Extra alert to leadership
```

---

## Email Details

### Who Receives Emails?

For each missing EOD, emails are sent to:
1. **Team Lead** of the employee
2. **Manager** of the team
3. **IT Manager** (from env: `IT_MANAGER_EMAIL`)
4. **CEO** (from env: `CEO_EMAIL`)
5. **Configured TLs** (from env: `TL_EMAILS`)

### Email Content:

**Subject:**
```
[EOD Missing] {Employee Name} has not submitted EOD for {Date}
```

**Body:**
```
Dear Team Lead / Manager,

{Employee Name} ({employee@email.com}) has not submitted 
their EOD report for {Date}.

Team: {Team Name}

This notification is sent to the employee's Team Lead, Manager, 
IT Manager, and CEO. Please follow up with the employee.

Regards,
Arraafi Task Management Portal
```

**Example:**
```
Subject: [EOD Missing] Kowsalya has not submitted EOD for 2026-09-07

Dear Team Lead / Manager,

Kowsalya (kowsalya@arraafiinfotech.com) has not submitted 
their EOD report for 2026-09-07.

Team: Developer

This notification is sent to the employee's Team Lead, Manager, 
IT Manager, and CEO. Please follow up with the employee.

Regards,
Arraafi Task Management Portal
```

---

## Current Configuration

From your `.env` file:

```env
# SMTP Server Settings
SMTP_HOST=mail.arraafiinfotech.com
SMTP_PORT=465
SMTP_USER=waseem@arraafiinfotech.com
SMTP_SSL=true

# Email Recipients
IT_MANAGER_EMAIL=waseem@arraafiinfotech.com
CEO_EMAIL=thaseena.khanum@arraafiinfotech.com
MANAGER_EMAIL=aap@arraafiinfotech.com

# Team Lead Emails (comma-separated)
TL_EMAILS=rajshekar@arraafiinfotech.com,javed@arraafiinfotech.com,soubhagya@arraafiinfotech.com,amitha@arraafiinfotech.com

# Test Email (optional)
TEST_EMAIL=kowsalya@arraafiinfotech.com
```

---

## When Emails Are Sent

### Automatic:
- **At server startup** - Checks yesterday's missing EODs
- System runs automatic checks (configured in your scheduler)

### Manual:
You can trigger via API:

**Send Escalation (Missing EOD emails):**
```bash
POST http://localhost:8080/api/notifications/send-escalation
Body: { "date": "2026-09-07" }
```

**Send Reminder (to employees who haven't submitted):**
```bash
POST http://localhost:8080/api/notifications/send-reminder
Body: { "date": "2026-09-07" }
```

---

## Troubleshooting

### No Emails Being Sent?

**Check 1: SMTP Password**
- Make sure you replaced `YOUR_REAL_PASSWORD_HERE` in `.env`
- Password must be correct for `waseem@arraafiinfotech.com`

**Check 2: Backend Restarted**
- Backend must be restarted after changing `.env`
- Environment variables only load at startup

**Check 3: Backend Logs**
Look for errors in backend console:
```
[error] Failed to send missing EOD leadership email
```

**Check 4: SMTP Server**
- Verify `mail.arraafiinfotech.com` is accessible
- Port 465 with SSL should be open
- Try `telnet mail.arraafiinfotech.com 465`

**Check 5: Email Addresses**
- Verify all email addresses in `.env` are correct
- Verify employee email addresses in database

### Emails Going to Wrong People?

The system sends emails to:
1. **Team-specific**: Employee's TL and Manager (from database)
2. **Global**: IT Manager, CEO, and configured TLs (from `.env`)

If Kowsalya is on Amitha's team:
- ✅ Amitha gets email (she's the TL)
- ✅ IT Manager, CEO, Manager get email (global)
- ❌ Other TLs get email (because they're in `TL_EMAILS`)

**To limit emails to only relevant TL:**
Remove unrelated TLs from `TL_EMAILS` in `.env`, or modify the code to filter by team.

---

## Email Override Mapping

The system has hardcoded email overrides for certain users:

```typescript
const ALERT_EMAIL_OVERRIDES = {
  "Waseem Ahmed Jamadar": "waseem@gmail.com",
  "Thaseena Khanum": "Thaseena.Khanum@arraafiinfotech.com",
  "Asim Alam": "aap@arraafiinfotech.com",
  "Soubhagya M Bhat": "soubhgya@arraafiinfotech.com",
  "Rajshekar Swamy": "rajshekar@arraafiinfotech.com",
  "Amita Akash Mudholkar": "amitha@arraafiinfotech.com",
  "Mohammad Javed Akhter": "javed@arraafiinfotech.com",
};
```

If a user's name matches, their email is overridden with the mapped value.

**To change:** Edit `artifacts/api-server/src/routes/notifications.ts`

---

## Testing the Email System

### Test 1: Check Without Sending

1. Comment out the email sending in code temporarily
2. Check logs to see what would be sent
3. Backend logs show: `DEV: Would send missing EOD leadership email`

### Test 2: Send Test Email

1. Have an employee NOT submit EOD for today
2. Wait until after 5:45 PM (or your cutoff time)
3. Trigger escalation:
   ```powershell
   curl -X POST "http://localhost:8080/api/notifications/send-escalation" -H "Content-Type: application/json" -d "{\"date\": \"$(Get-Date -Format 'yyyy-MM-dd')\"}"
   ```
4. Check mailboxes of recipients

### Test 3: Verify in Database

Check if notifications were created:
```sql
SELECT * FROM portal_notifications 
WHERE type = 'missing_eod' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Important Notes

### Prevents Duplicate Emails
✅ System checks if notification already exists before sending
✅ Won't send multiple emails for same employee + date

### Stops When EOD Submitted
✅ Once employee submits EOD, no more alerts for that date
✅ Dashboard notification remains but emails stop

### Team-Based Notifications
✅ Only relevant TL gets dashboard notification
✅ But all configured TLs get emails (see config above)

---

## Summary

✅ **Email notification system is already fully implemented**
✅ **Just need to add SMTP password to `.env`**
✅ **Restart backend after changing `.env`**
✅ **Emails sent automatically for missing EODs**
✅ **Dashboard notifications created at the same time**
✅ **3-day escalation included**

---

**Status:** Ready to use! Just add your password and restart.

**Support:** If emails don't work after setup, check backend logs for SMTP errors.
