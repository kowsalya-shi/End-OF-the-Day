# ⏰ EOD Time-Based Access Control - Implementation Guide

## ✅ Implementation Complete

A role-based time restriction system has been implemented for EOD submissions.

---

## 📋 Access Control Rules

### Employee Access
| Time Period | Status | Details |
|------------|--------|---------|
| **Before 5:30 PM** | ❌ Cannot submit | Form disabled with message: "EOD submission opens at 5:30 PM" |
| **5:30 PM - 9:00 PM** | ✅ Can submit | Full access to submit/update EOD |
| **After 9:00 PM** | ❌ Cannot submit | Form disabled with message: "EOD submission window has closed for today" |

### Management Access (TL, Manager, IT Manager, CEO)
| Time Period | Status | Details |
|------------|--------|---------|
| **Anytime** | ✅ Full access | Can view, check, approve, and submit EOD reports at any time |

---

## 🔧 What Was Implemented

### 1. Backend Changes (`artifacts/api-server/src/routes/eod.ts`)

#### Updated Time Constants
```typescript
const EOD_SUBMISSION_START_HOUR = 17; // 5:00 PM
const EOD_SUBMISSION_START_MINUTE = 30; // 5:30 PM
const EOD_SUBMISSION_END_HOUR = 21; // 9:00 PM
```

#### New Role-Aware Time Check Function
```typescript
function isWithinEodSubmissionWindow(userRole?: string) {
  // TL, Manager, IT Manager, and CEO can access anytime
  if (userRole && ["tl", "manager", "it_manager", "ceo"].includes(userRole)) {
    return true;
  }

  // Employees can only submit between 5:30 PM and 9:00 PM
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Before 5:30 PM
  if (hour < 17) return false;
  if (hour === 17 && minute < 30) return false;
  
  // After 9:00 PM
  if (hour >= 21) return false;
  
  return true;
}
```

#### Updated EOD Submission Endpoints
- **POST /api/eod**: Checks user role before allowing submission
- **PATCH /api/eod/:id**: Checks user role before allowing updates
- **New GET /api/eod/check-window**: Returns current submission status for the user

#### New Check Window Endpoint
```typescript
GET /api/eod/check-window

Response:
{
  "canSubmit": true|false,
  "role": "employee"|"tl"|"manager"|"it_manager"|"ceo",
  "currentTime": "2026-09-08T14:30:00.000Z",
  "message": "EOD submission opens at 5:30 PM",
  "window": "5:30 PM - 9:00 PM"|"Anytime"
}
```

### 2. Frontend Changes (`artifacts/eod-portal/src/pages/employee/eod.tsx`)

#### New State Management
```typescript
const [canSubmitEod, setCanSubmitEod] = useState(true);
const [submissionMessage, setSubmissionMessage] = useState("");
```

#### Real-Time Window Checking
- Checks submission window on component mount
- Re-checks every 60 seconds
- Updates UI dynamically when window opens/closes

#### UI Updates
1. **Header Status Indicator**
   - Before 5:30 PM: Shows amber warning with "EOD submission opens at 5:30 PM"
   - 5:30-9 PM: Shows green checkmark with "EOD submission window: 5:30 PM to 9:00 PM"
   - After 9 PM: Shows amber warning with "EOD submission window has closed"

2. **Submit Button**
   - Automatically disabled outside submission window
   - Employee users see disabled button
   - Management users always have enabled button

---

## 🎯 Role-Based Behavior Examples

### Scenario 1: 4:00 PM (Before window)
**Employee:**
```
❌ Form visible but disabled
⚠️  "EOD submission opens at 5:30 PM"
Button: Disabled
```

**TL/Manager/IT Manager/CEO:**
```
✅ Form fully functional
✓  "Anytime access"
Button: Enabled
```

### Scenario 2: 6:30 PM (During window)
**Employee:**
```
✅ Form fully functional
✓  "EOD submission window: 5:30 PM to 9:00 PM"
Button: Enabled
```

**TL/Manager/IT Manager/CEO:**
```
✅ Form fully functional
✓  "Anytime access"
Button: Enabled
```

### Scenario 3: 10:00 PM (After window)
**Employee:**
```
❌ Form visible but disabled
⚠️  "EOD submission window has closed for today (5:30 PM - 9:00 PM)"
Button: Disabled
```

**TL/Manager/IT Manager/CEO:**
```
✅ Form fully functional
✓  "Anytime access"
Button: Enabled
```

---

## 🚀 Testing the Implementation

### Step 1: Test as Employee (Before 5:30 PM)
```bash
# Login as employee
Email: kowsalya@arraafiinfotech.com
Password: emp123
```
**Expected:**
- Warning message: "EOD submission opens at 5:30 PM"
- Submit button is disabled
- Form fields are visible but cannot submit

### Step 2: Test as Employee (During 5:30-9 PM)
**Expected:**
- Green message: "✅ EOD submission window: 5:30 PM to 9:00 PM"
- Submit button is enabled
- Can submit/update EOD

### Step 3: Test as Employee (After 9 PM)
**Expected:**
- Warning message: "EOD submission window has closed for today"
- Submit button is disabled
- Cannot submit new EOD

### Step 4: Test as TL/Manager (Anytime)
```bash
# Login as TL
Email: rajshekar@arraafiinfotech.com
Password: tl123

# OR as Manager
Email: manager@arraafi.com
Password: manager123
```
**Expected:**
- No time restrictions
- Submit button always enabled
- Can access at any time (before 5:30 PM, after 9 PM, etc.)

---

## 🔄 API Behavior

### Submit EOD (Employee - Outside Window)
```bash
POST /api/eod
Authorization: Bearer <employee_token>

Response: 403 Forbidden
{
  "error": "EOD submission is available from 5:30 PM until 9:00 PM for employees."
}
```

### Submit EOD (Employee - During Window)
```bash
POST /api/eod
Authorization: Bearer <employee_token>

Response: 201 Created
{
  "id": 123,
  "date": "2026-09-08",
  ...
}
```

### Submit EOD (TL/Manager - Anytime)
```bash
POST /api/eod
Authorization: Bearer <manager_token>

Response: 201 Created
{
  "id": 124,
  "date": "2026-09-08",
  ...
}
```

---

## 📊 System Logic Flow

```
User tries to submit EOD
   ↓
Backend checks user role
   ↓
Is user TL/Manager/IT Manager/CEO?
   ├─ YES → ✅ Allow submission (anytime)
   └─ NO (Employee) →
        ↓
        Check current time
        ↓
        Is time between 5:30 PM and 9:00 PM?
        ├─ YES → ✅ Allow submission
        └─ NO → ❌ Reject with appropriate message
```

---

## 🛠️ To Apply Changes

### Backend (Requires Rebuild)
```bash
cd artifacts\api-server
node build.mjs
node dist\index.mjs
```

### Frontend (Auto-reload if dev server running)
The frontend will automatically hot-reload the changes.

If not running:
```bash
cd artifacts\eod-portal
npm run dev
```

---

## ✨ Benefits

1. **Enforced Discipline**: Employees can only submit EOD during designated hours
2. **Management Flexibility**: Leadership can access the system anytime for reviews and approvals
3. **Clear Communication**: Users see exactly when they can submit
4. **Real-Time Updates**: UI automatically enables/disables based on current time
5. **No Workarounds**: Backend validation prevents API bypass attempts

---

## 🔒 Security Features

1. **Backend Validation**: Time check happens on server, cannot be bypassed
2. **Role-Based Access**: User role fetched from authenticated session
3. **Token Verification**: All requests require valid authentication token
4. **Consistent Enforcement**: Same logic applied to both create and update operations

---

## 📝 Important Notes

### For Employees:
- ⏰ Can only submit/update EOD between **5:30 PM - 9:00 PM**
- ⚠️ Cannot submit before 5:30 PM or after 9:00 PM
- ✅ Can still **view** their EOD history anytime
- ℹ️ The submission window is checked every minute automatically

### For TL/Manager/IT Manager/CEO:
- ✅ **No time restrictions** - can access anytime
- ✅ Can review and approve EODs 24/7
- ✅ Can submit their own EODs anytime
- ✅ Can view all EOD submissions anytime

### For System Administrators:
- The time check uses **server time** (not client time)
- Time constants can be adjusted in `routes/eod.ts`
- Frontend checks every 60 seconds for window changes
- Both POST (create) and PATCH (update) enforce the same rules

---

## 🎉 Summary

The EOD time-based access control is now fully implemented:

✅ **Employees**: Restricted to 5:30 PM - 9:00 PM  
✅ **Management**: No restrictions, anytime access  
✅ **Backend**: Role-aware validation with clear error messages  
✅ **Frontend**: Real-time UI updates with status indicators  
✅ **Security**: Server-side enforcement prevents bypass  

**The system is ready for use!** 🚀

---

**Implementation Date:** September 8, 2026  
**Backend File:** `artifacts/api-server/src/routes/eod.ts`  
**Frontend File:** `artifacts/eod-portal/src/pages/employee/eod.tsx`
