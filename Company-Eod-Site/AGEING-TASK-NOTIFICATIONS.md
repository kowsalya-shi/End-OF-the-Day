# Ageing Task Notifications System

## Complete Documentation

This document explains the **ageing task notification system** that alerts employees and management when tasks remain in YTS, WIP, or Holding status for too long.

---

## 🎯 What is an Ageing Task?

An **ageing task** is a task that has been in one of these statuses for **5 or more days**:
- **YTS** (Yet To Start)
- **WIP** (Work In Progress)
- **Holding**

---

## ⏰ Ageing Threshold

**5 days** = Ageing threshold

Once a task reaches this threshold, the system:
1. Creates a notification in the **Notification Page**
2. Alerts the task owner and their reporting chain

---

## 📊 How Age is Calculated

The system calculates the age based on:

### For YTS Tasks:
- Uses **Planned Start Date** if available
- Falls back to **Task Created Date** if no planned start date

### For WIP Tasks:
- Uses **Actual Start Date** if available
- Falls back to **Task Created Date** if no actual start date

### For Holding Tasks:
- Uses **Task Created Date**

---

## 🔔 Who Receives Ageing Task Notifications?

The notifications follow the **same role-scoped hierarchy** as other notifications:

### Example 1: Employee's Ageing Task

**Employee:** Kowsalya  
**Team:** Data Analysis  
**Team Lead:** Rajshekar  
**Task:** Inventory Update  
**Status:** YTS  
**Age:** 5 days

**Notifications Sent To:**

1. **Kowsalya (Task Owner)**
   ```
   🔴 Ageing Task Alert
   Your task "Inventory Update" has been in YTS for 5 days.
   ```

2. **Rajshekar (Her Team Lead)**
   ```
   🔴 Team Ageing Alert
   Kowsalya's task "Inventory Update" has been in YTS for 5 days.
   ```

3. **Waseem (IT Manager)**
   ```
   🔴 Team Ageing Alert
   Kowsalya's task "Inventory Update" has been in YTS for 5 days.
   ```

4. **Asim (Manager)**
   ```
   🔴 Team Ageing Alert
   Kowsalya's task "Inventory Update" has been in YTS for 5 days.
   ```

5. **Thaseena (CEO)**
   ```
   🔴 Team Ageing Alert
   Kowsalya's task "Inventory Update" has been in YTS for 5 days.
   ```

---

### Example 2: Team Lead's Ageing Task

**Team Lead:** Amita  
**Task:** Performance Review Process  
**Status:** WIP  
**Age:** 6 days

**Notifications Sent To:**

1. **Amita (Task Owner)**
   ```
   🔴 Ageing Task Alert
   Your task "Performance Review Process" has been in WIP for 6 days.
   ```

2. **Waseem (IT Manager)**
   ```
   🔴 Team Ageing Alert
   Amita's task "Performance Review Process" has been in WIP for 6 days.
   ```

3. **Asim (Manager)**
   ```
   🔴 Team Ageing Alert
   Amita's task "Performance Review Process" has been in WIP for 6 days.
   ```

4. **Thaseena (CEO)**
   ```
   🔴 Team Ageing Alert
   Amita's task "Performance Review Process" has been in WIP for 6 days.
   ```

---

## 📬 Notification Page Display

The **Notification Page** will show ageing tasks alongside other notifications:

```
🔔 Notifications

┌──────────────────────────────────┐
│ Missing EOD                  2   │
│ Overdue Tasks                3   │
│ Ageing Tasks                 4   │  ← New Section
│ Task Assignment              1   │
│ Approval                     2   │
└──────────────────────────────────┘
```

When users click **"Ageing Tasks"**, they see:

```
🔴 Ageing Tasks

Task                    Employee    Status    Age
────────────────────────────────────────────────────
Inventory Update        Kowsalya    YTS       5 days
Client Work            Arun        WIP       6 days
Testing Phase          Priya       Holding   7 days
Performance Review     Amita       WIP       6 days
```

---

## 🔄 Automatic Checks

The system automatically checks for ageing tasks:

### 1. **At Server Startup**
- Checks all existing tasks immediately
- Creates notifications for any ageing tasks found

### 2. **Daily at 9 PM**
- Runs along with EOD missing checks
- Creates new ageing notifications as tasks age

---

## 🧪 Manual Testing

You can manually trigger an ageing task check:

### Using PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/notifications/check-ageing-tasks" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"date": "2026-09-08"}'
```

### Using Test Script:
```powershell
cd c:\Users\Shiny\Company-Eod-Site\Company-Eod-Site\artifacts\api-server
node test-ageing-tasks.mjs
```

---

## 📋 Notification Flow Diagram

```
                    AGEING TASK CHECKER
                           ↓
              Check all tasks in YTS/WIP/Holding
                           ↓
                   Calculate task age
                           ↓
                   Age >= 5 days?
                      /        \
                    NO          YES
                    ↓            ↓
               Continue      Is ageing
                             notification
                             already sent?
                              /        \
                            YES         NO
                             ↓           ↓
                         Skip it    Create notification
                                          ↓
                                    Send to:
                                    ├─ Task owner
                                    ├─ Their TL
                                    ├─ IT Manager
                                    ├─ Manager
                                    └─ CEO
```

---

## 🎯 What Makes This Different?

### Compared to Overdue Tasks:

| Feature | Overdue Tasks | Ageing Tasks |
|---------|--------------|--------------|
| **Trigger** | Planned end date passed | 5+ days in same status |
| **Statuses** | Any status | Only YTS/WIP/Holding |
| **Purpose** | Task deadline missed | Task stuck/stagnant |
| **Recipients** | TL + Management | Owner + TL + Management |

---

## ✅ Important Rules

### 1. **One Notification Per Task**
- Each ageing task gets **one notification** created
- No duplicate notifications for the same ageing task
- If task moves to a different status and comes back, it will create a new notification

### 2. **No Email Notifications**
- Ageing tasks create **dashboard notifications only**
- They appear in the **Notification Page**
- No email alerts are sent for ageing tasks

### 3. **Existing System Unchanged**
- All existing notifications (EOD, approval, assignment, overdue) work exactly as before
- Ageing is a **new notification type** added separately
- Type: `ageing_task_{taskId}`

---

## 🗂️ Notification Database Structure

Each ageing notification is stored with:

```javascript
{
  recipientUserId: number,        // Who should see this
  employeeId: number,             // Task owner
  relatedTaskId: number,          // Which task
  type: "ageing_task_{taskId}",  // Notification type
  title: "Ageing Task Alert",
  message: "...",                 // Personalized message
  targetDate: "2026-09-08",      // Date checked
  readAt: null                    // Unread initially
}
```

---

## 📊 Current Status

As of the last test:
- ✅ System is operational
- ✅ Backend checks for ageing tasks at startup
- ✅ Daily checks scheduled at 9 PM
- ✅ Manual trigger endpoint available

**Current Database:**
- Total tasks in YTS/WIP/Holding: 4
- Ageing tasks (5+ days): 0
- Existing ageing notifications: 0

---

## 🔍 Filtering by Recipient

The **Notification Page** automatically filters notifications:

### Employee (Kowsalya):
- Sees her own ageing tasks
- Sees her own missing EOD, overdue tasks, assignments

### Team Lead (Rajshekar):
- Sees his own ageing tasks
- Sees his team members' ageing tasks
- Sees his team's missing EOD, overdue notifications

### IT Manager/Manager/CEO:
- Sees ageing tasks for all employees
- Sees all management-level notifications

This filtering is handled by `recipient_user_id` in the database, exactly like your existing notification system.

---

## 🚀 Implementation Details

### Files Modified:

1. **`artifacts/api-server/src/routes/notifications.ts`**
   - Added `processAgeingTaskNotifications()` function
   - Added POST `/api/notifications/check-ageing-tasks` endpoint

2. **`artifacts/api-server/src/index.ts`**
   - Added ageing task check at server startup
   - Added ageing task check to 9 PM scheduler

### Key Functions:

#### `processAgeingTaskNotifications(targetDate: string)`
- Checks all tasks in YTS/WIP/Holding
- Calculates age from appropriate start date
- Creates notifications for tasks >= 5 days old
- Uses existing `notifyRoleScopedEvent()` for distribution

---

## 📝 Example Scenarios

### Scenario 1: New Ageing Task

**Day 1-4:** Task "Client Meeting Prep" in YTS  
→ No notification (under threshold)

**Day 5:** Task still in YTS  
→ ✅ Notification created for owner + TL + management

**Day 6-10:** Task still in YTS  
→ No new notification (already notified)

**Day 11:** User marks task as WIP  
→ Age counter resets (if task becomes ageing again in WIP, new notification)

---

### Scenario 2: Multiple Ageing Tasks

**Employee: Arun**
- Task A: YTS for 7 days → Ageing notification
- Task B: WIP for 6 days → Ageing notification
- Task C: Completed → No notification
- Task D: YTS for 3 days → No notification (under threshold)

**Result:** 2 separate ageing notifications for Arun's TL and management

---

## ✅ Summary

**Ageing Task Notifications:**
- ✅ Trigger: 5+ days in YTS/WIP/Holding
- ✅ Recipients: Task owner + TL + IT Manager + Manager + CEO
- ✅ Display: Notification Page only (no emails)
- ✅ Integration: Works alongside existing notifications
- ✅ Filtering: Role-based, same as other notifications
- ✅ Automatic: Runs at startup and 9 PM daily

**No Changes To:**
- ❌ EOD notifications
- ❌ Overdue task notifications  
- ❌ Task assignment notifications
- ❌ Approval notifications
- ❌ Any existing notification logic

---

**🎉 System is fully operational and ready!**
