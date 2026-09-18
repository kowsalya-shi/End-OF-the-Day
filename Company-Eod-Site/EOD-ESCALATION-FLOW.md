# EOD Notification & 3-Day Escalation Flow

## Complete Documentation

This document explains the **exact** EOD notification and escalation flow implemented in the system.

---

## 🏢 Organizational Hierarchy

```
CEO (Thaseena Khanum)
      ↓
Manager (Asim Alam)
      ↓
IT Manager (Waseem Ahmed Jamadar)
      ↓
Team Leads (TL)
├── Soubhagya M Bhat
├── Amita Akash Mudholkar
├── Mohammad Javed Akhter
└── Rajshekar Swamy
      ↓
Team Members (Employees)
```

---

## 📧 Part 1: Daily Missing EOD Notifications

### Rule: Who gets notified when someone doesn't submit EOD?

The notification recipients depend on **who** missed the EOD:

---

### 1. **Employee** Misses EOD

**Example:** Kowsalya (under Rajshekar) doesn't submit EOD

```
Kowsalya (Employee)
      ↓
   Missing EOD
      ↓
Email sent to:
├── Rajshekar (her TL)
├── Waseem (IT Manager)
├── Asim (Manager)
└── Thaseena (CEO)
```

**Important:** 
- ✅ Only Kowsalya's TL receives the notification
- ❌ Other TLs (Soubhagya, Amita, Javeed) do NOT receive it

---

### 2. **Team Lead (TL)** Misses EOD

**Example:** Rajshekar doesn't submit EOD

```
Rajshekar (TL)
      ↓
   Missing EOD
      ↓
Email sent to:
├── Waseem (IT Manager)
├── Asim (Manager)
└── Thaseena (CEO)
```

**Important:**
- ❌ Other TLs do NOT receive this notification
- ❌ Rajshekar's team members do NOT receive it

---

### 3. **IT Manager** Misses EOD

**Example:** Waseem doesn't submit EOD

```
Waseem (IT Manager)
      ↓
   Missing EOD
      ↓
Email sent to:
├── Asim (Manager)
└── Thaseena (CEO)
```

---

### 4. **Manager** Misses EOD

**Example:** Asim doesn't submit EOD

```
Asim (Manager)
      ↓
   Missing EOD
      ↓
Email sent to:
└── Thaseena (CEO)
```

---

### 5. **CEO** Misses EOD

**Example:** Thaseena doesn't submit EOD

```
Thaseena (CEO)
      ↓
   Missing EOD
      ↓
No email sent
(No higher-level authority)
```

---

## ⚠️ Part 2: 3-Day Escalation Rule

### Who Gets 3-Day Escalation?

The 3-day escalation **ONLY** applies to:
- ✅ **Employees**
- ✅ **Team Leads (TL)**

The 3-day escalation **DOES NOT** apply to:
- ❌ **IT Manager**
- ❌ **Manager**
- ❌ **CEO**

---

### How Does the 3-Day Count Work?

The system counts **any 3 missed EODs** in the past 30 days.

**Important:** The days do **NOT** need to be consecutive!

---

### Example 1: Consecutive Missed Days

**Kowsalya (Employee under Rajshekar):**

```
Monday    ❌ Missing EOD
Tuesday   ❌ Missing EOD
Wednesday ❌ Missing EOD
          ⚠️  3-DAY ESCALATION TRIGGERED
```

**Escalation Email Sent To:**
- Rajshekar (her TL)
- Waseem (IT Manager)
- Asim (Manager)
- Thaseena (CEO)

**Email Subject:**
```
[ESCALATION] Kowsalya - 3 EOD Reports Missing
```

**Email Content:**
```
⚠️ EOD Escalation Alert

Kowsalya (Employee) has missed 3 EOD submissions in the past 30 days.

Team: Rajshekar's Team

Recent Missed Dates:
• Monday (2026-09-05)
• Tuesday (2026-09-06)
• Wednesday (2026-09-07)

Action Required: Please follow up with Kowsalya urgently regarding their EOD submission compliance.

Regards,
Arraafi Task Management Portal
```

---

### Example 2: Non-Consecutive Missed Days

**Kowsalya (Employee):**

```
Monday    ❌ Missing EOD
Tuesday   ✅ Submitted
Wednesday ❌ Missing EOD
Thursday  ✅ Submitted
Friday    ❌ Missing EOD
          ⚠️  3-DAY ESCALATION TRIGGERED
```

**Total missed days: 3**

The escalation is sent to the same recipients as Example 1.

---

### Example 3: TL Misses 3 Days

**Rajshekar (TL):**

```
Monday    ❌ Missing EOD
Tuesday   ❌ Missing EOD
Wednesday ❌ Missing EOD
          ⚠️  3-DAY ESCALATION TRIGGERED
```

**Escalation Email Sent To:**
- Waseem (IT Manager)
- Asim (Manager)
- Thaseena (CEO)

**Important:**
- ❌ Other TLs do NOT receive Rajshekar's escalation
- ❌ Rajshekar's team members do NOT receive it

---

### Example 4: IT Manager Misses 3 Days

**Waseem (IT Manager):**

```
Monday    ❌ Missing EOD
Tuesday   ❌ Missing EOD
Wednesday ❌ Missing EOD
```

**❌ NO 3-DAY ESCALATION TRIGGERED**

Why? Because the 3-day escalation rule does NOT apply to IT Manager.

**What happens instead?**
- Daily missing-EOD emails continue to be sent (Manager + CEO)
- No special escalation alert

---

### Example 5: Manager Misses 3 Days

**Asim (Manager):**

```
Monday    ❌ Missing EOD
Tuesday   ❌ Missing EOD
Wednesday ❌ Missing EOD
```

**❌ NO 3-DAY ESCALATION TRIGGERED**

Why? Because the 3-day escalation rule does NOT apply to Manager.

**What happens instead?**
- Daily missing-EOD emails continue to be sent (CEO only)
- No special escalation alert

---

## 📊 Complete Flow Diagram

```
                    EOD CHECKER
                         ↓
              Did person submit EOD?
                   /           \
                 YES            NO
                  ↓              ↓
             No alert       Check person's role
                                 ↓
         ┌──────────────────────┼──────────────────────┐
         ↓                      ↓                      ↓
     Employee                   TL            IT Manager/Manager/CEO
         ↓                      ↓                      ↓
     Find TL            Find IT Manager        Normal hierarchy email
         ↓                      ↓                   (no escalation)
    Send email to:        Send email to:
    • TL                  • IT Manager
    • IT Manager          • Manager
    • Manager             • CEO
    • CEO
         ↓                      ↓
   Count missed days    Count missed days
         ↓                      ↓
    ≥ 3 missed?          ≥ 3 missed?
      /      \             /      \
    NO       YES         NO       YES
    ↓         ↓          ↓         ↓
  Continue  Send        Continue  Send
            Escalation            Escalation
            to:                   to:
            • TL                  • IT Manager
            • IT Manager          • Manager
            • Manager             • CEO
            • CEO
```

---

## 🔄 What Happens After 3-Day Escalation?

### If the person continues to miss EOD:

**Day 4:**
- ✅ Normal missing-EOD email sent
- ❌ No additional escalation (already escalated)

**Day 5, 6, 7...:**
- ✅ Normal missing-EOD emails continue
- ❌ No duplicate escalations

### If the person submits EOD:

- ✅ Missing-EOD alerts stop
- ✅ The 3-day counter resets
- ✅ If they miss 3 more days again, a new escalation is triggered

---

## 📬 Email + Dashboard Notifications

### Both Systems Work Together:

1. **Email Notification:**
   - Sent immediately when EOD is missing
   - Goes to appropriate recipients based on hierarchy

2. **Dashboard Notification:**
   - Created in the portal at the same time
   - Visible to the same recipients
   - Can be marked as read/handled

---

## 🎯 Summary Table

| Person Role    | Missing EOD Email Sent To                      | 3-Day Escalation? | Escalation Sent To                             |
|----------------|-----------------------------------------------|-------------------|------------------------------------------------|
| Employee       | TL + IT Manager + Manager + CEO               | ✅ YES            | TL + IT Manager + Manager + CEO                |
| TL             | IT Manager + Manager + CEO                    | ✅ YES            | IT Manager + Manager + CEO                     |
| IT Manager     | Manager + CEO                                 | ❌ NO             | N/A                                            |
| Manager        | CEO                                           | ❌ NO             | N/A                                            |
| CEO            | Nobody                                        | ❌ NO             | N/A                                            |

---

## ✅ What's Implemented:

1. ✅ **Role-based missing EOD notifications** (all roles)
2. ✅ **Hierarchical email routing** (correct recipients only)
3. ✅ **3-day escalation for Employees and TLs**
4. ✅ **Non-consecutive day counting** (any 3 missed days in 30 days)
5. ✅ **Dashboard + Email notifications** (both systems synchronized)
6. ✅ **Escalation emails with detailed formatting**
7. ✅ **Fixed email address:** amita@arraafiinfotech.com (not amitha)

---

## 🧪 How to Test:

### Test Missing EOD for Today:

```powershell
$date = (Get-Date).ToString('yyyy-MM-dd')
Invoke-RestMethod -Uri "http://localhost:8080/api/notifications/send-escalation" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body "{`"date`": `"$date`"}"
```

### Test Missing EOD for a Specific Date:

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/notifications/send-escalation" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body "{`"date`": `"2026-09-07`"}"
```

---

## 📝 Configuration Files:

### `.env` File Location:
```
c:\Users\Shiny\Company-Eod-Site\Company-Eod-Site\artifacts\api-server\.env
```

### Current SMTP Settings:
```env
SMTP_HOST=mail.arraafiinfotech.com
SMTP_PORT=587
SMTP_USER=kowsalya@arraafiinfotech.com
SMTP_PASSWORD=Developer123$5
SMTP_SSL=false
```

### Email Recipients:
```env
IT_MANAGER_EMAIL=waseem@arraafiinfotech.com
CEO_EMAIL=thaseena.khanum@arraafiinfotech.com
MANAGER_EMAIL=aap@arraafiinfotech.com
TL_EMAILS=rajshekar@arraafiinfotech.com,javed@arraafiinfotech.com,soubhagya@arraafiinfotech.com,amita@arraafiinfotech.com
```

---

**🎉 System is fully operational and ready!**
