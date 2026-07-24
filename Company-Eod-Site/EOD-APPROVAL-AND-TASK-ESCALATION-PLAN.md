# EOD Approval & Task Escalation System Implementation Plan

## 📋 Overview
This document outlines the implementation plan for EOD approval workflow and task escalation system.

---

## 🎯 Part 1: EOD Approval Workflow

### Database Changes Required

#### 1. Add Approval Fields to EOD Submissions Table
```sql
ALTER TABLE eod_submissions 
ADD COLUMN approval_status TEXT DEFAULT 'pending',
ADD COLUMN approved_by INTEGER,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN rejection_reason TEXT,
ADD COLUMN tl_comments TEXT;

-- approval_status values: 'pending', 'approved', 'rejected', 'sent_back'
```

#### 2. Create EOD Approval History Table (Optional but recommended)
```sql
CREATE TABLE eod_approval_history (
  id SERIAL PRIMARY KEY,
  eod_id INTEGER NOT NULL REFERENCES eod_submissions(id),
  action TEXT NOT NULL, -- 'approved', 'rejected', 'sent_back'
  performed_by INTEGER NOT NULL,
  performed_by_name TEXT,
  performed_by_role TEXT,
  reason TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints to Create

1. **POST /api/eod/:id/approve** - TL approves EOD
2. **POST /api/eod/:id/reject** - TL rejects EOD (requires reason)
3. **POST /api/eod/:id/send-back** - TL sends back for correction
4. **POST /api/eod/:id/comment** - Add comment to EOD
5. **GET /api/eod/pending-approvals** - Get EODs pending approval (TL only)
6. **GET /api/eod/approved** - Get approved EODs (Manager/CEO)

### UI Components to Create

#### Team Leader Portal
- **Pending EODs Tab** with action buttons:
  - ✅ Approve Button (green)
  - ❌ Reject Button (red) → Opens dialog for reason
  - 🔄 Send Back Button (yellow) → Opens dialog for feedback
  - 💬 Comment Button → Add notes

#### Manager Portal
- **Approved EODs View** (read-only)
- **Pending Approval Stats** dashboard

#### CEO Portal
- **Organization Dashboard**
- Department-wise EOD submission and approval stats

---

## 🎯 Part 2: Task Escalation System

### Database Changes Required

#### Add Escalation Fields to Tasks Table
```sql
ALTER TABLE internal_tasks 
ADD COLUMN escalation_level INTEGER DEFAULT 0,
ADD COLUMN last_escalation_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN escalation_notified BOOLEAN DEFAULT FALSE;

-- escalation_level:
-- 0 = Normal
-- 1 = Reminder (15 days)
-- 2 = First Escalation (21 days)
-- 3 = Second Escalation (30 days)
-- 4 = Final Escalation (45+ days)
```

#### Create Task Escalation Log Table
```sql
CREATE TABLE task_escalation_log (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES internal_tasks(id),
  escalation_level INTEGER NOT NULL,
  days_pending INTEGER NOT NULL,
  notified_users TEXT[], -- Array of user IDs/emails
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Task Status Calculation Logic

```typescript
// Helper function to calculate task status based on due date
function getTaskStatus(task) {
  const today = new Date();
  const dueDate = new Date(task.plannedEndDate);
  const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
  
  if (task.status === 'completed') return { badge: '✅', color: 'green', label: 'Completed' };
  
  if (daysDiff < 0) {
    const daysRemaining = Math.abs(daysDiff);
    if (daysRemaining <= 3) {
      return { badge: '🟡', color: 'yellow', label: 'Due Soon', days: daysRemaining };
    }
    return { badge: '🟢', color: 'green', label: 'On Track', days: daysRemaining };
  }
  
  // Overdue
  if (daysDiff >= 0 && daysDiff <= 14) {
    return { badge: '🟠', color: 'orange', label: 'Overdue', days: daysDiff };
  }
  if (daysDiff >= 15 && daysDiff <= 20) {
    return { badge: '🔴', color: 'red', label: 'Escalated', days: daysDiff };
  }
  if (daysDiff >= 21 && daysDiff <= 29) {
    return { badge: '🚨', color: 'red', label: 'Critical', days: daysDiff };
  }
  if (daysDiff >= 30) {
    return { badge: '⛔', color: 'darkred', label: 'Severely Delayed', days: daysDiff };
  }
}
```

### Escalation Notification Rules

| Days Overdue | Escalation Level | Notify To | Message Template |
|--------------|------------------|-----------|------------------|
| 15 days | Level 1: Reminder | Employee + TL | "Task '{taskName}' is overdue by 15 days. Please update progress." |
| 21 days | Level 2: First Escalation | TL + Manager | "Task '{taskName}' assigned to {employee} is critical. Immediate action required." |
| 30 days | Level 3: Second Escalation | Manager + CEO | "Task '{taskName}' is severely delayed (30+ days). Management intervention needed." |
| 45+ days | Level 4: Final Escalation | CEO + Admin | "URGENT: Task '{taskName}' has been pending for {days} days. Escalation required." |

### Background Job/Cron Job

```javascript
// Run daily at 9 AM
async function checkTaskEscalations() {
  const incompleteTasks = await db.query.internalTasksTable.findMany({
    where: and(
      ne(internalTasksTable.status, 'completed'),
      ne(internalTasksTable.status, 'cancelled')
    )
  });
  
  for (const task of incompleteTasks) {
    const daysOverdue = calculateDaysOverdue(task.plannedEndDate);
    
    if (daysOverdue === 15 && task.escalation_level < 1) {
      await sendReminderNotification(task, ['employee', 'tl']);
      await updateEscalationLevel(task.id, 1);
    }
    else if (daysOverdue === 21 && task.escalation_level < 2) {
      await sendEscalationNotification(task, ['tl', 'manager'], 2);
      await updateEscalationLevel(task.id, 2);
    }
    else if (daysOverdue === 30 && task.escalation_level < 3) {
      await sendEscalationNotification(task, ['manager', 'ceo'], 3);
      await updateEscalationLevel(task.id, 3);
    }
    else if (daysOverdue >= 45 && task.escalation_level < 4) {
      await sendCriticalEscalationNotification(task, ['ceo', 'admin'], 4);
      await updateEscalationLevel(task.id, 4);
    }
  }
}
```

---

## 🎯 Part 3: Dashboard Indicators

### Task Status Badge Component

```typescript
interface TaskStatusBadgeProps {
  task: InternalTask;
}

function TaskStatusBadge({ task }: TaskStatusBadgeProps) {
  const status = getTaskStatus(task);
  
  return (
    <Badge className={`bg-${status.color}-500`}>
      {status.badge} {status.label}
      {status.days && ` (${status.days} days)`}
    </Badge>
  );
}
```

### Dashboard Widgets

#### 1. Manager Dashboard - Task Overview
```
┌─────────────────────────────────────┐
│   Task Status Overview              │
├─────────────────────────────────────┤
│ 🟢 On Track:           25 tasks     │
│ 🟡 Due Soon:            8 tasks     │
│ 🟠 Overdue:            12 tasks     │
│ 🔴 Escalated:           5 tasks     │
│ 🚨 Critical:            3 tasks     │
│ ⛔ Severely Delayed:    1 task      │
└─────────────────────────────────────┘
```

#### 2. Team Leader Dashboard - Team Task Status
```
┌─────────────────────────────────────┐
│   My Team Tasks                     │
├─────────────────────────────────────┤
│ Employee      │ Status    │ Days    │
│ John Doe      │ 🟠        │ +5      │
│ Jane Smith    │ 🟢        │ -2      │
│ Bob Wilson    │ 🔴        │ +18     │
└─────────────────────────────────────┘
```

#### 3. CEO Dashboard - Organization View
```
┌─────────────────────────────────────┐
│   Department Performance            │
├─────────────────────────────────────┤
│ FICO Team:     ✅ 95% on track      │
│ MM Team:       ⚠️ 3 critical tasks  │
│ Developer:     🔴 5 escalated       │
│ ABAP Team:     ✅ 98% on track      │
└─────────────────────────────────────┘
```

---

## 📅 Implementation Timeline

### Phase 1: Database Schema (Day 1)
- [ ] Create migration for EOD approval fields
- [ ] Create migration for task escalation fields
- [ ] Create approval history table
- [ ] Create escalation log table
- [ ] Run migrations

### Phase 2: Backend API (Days 2-3)
- [ ] EOD approval endpoints
- [ ] Task escalation calculation functions
- [ ] Notification system integration
- [ ] Background job for daily escalation check

### Phase 3: Frontend UI (Days 4-6)
- [ ] TL EOD approval interface
- [ ] Task status badge component
- [ ] Dashboard widgets with escalation indicators
- [ ] Manager/CEO dashboard views
- [ ] Notification center

### Phase 4: Testing & Deployment (Day 7)
- [ ] Test EOD approval workflow
- [ ] Test task escalation notifications
- [ ] Test dashboard indicators
- [ ] Deploy to production

---

## 🔧 Technical Stack

- **Database**: PostgreSQL with Drizzle ORM
- **Backend**: Node.js + Express
- **Frontend**: React + TypeScript
- **Notifications**: Email (SMTP) + In-app notifications
- **Background Jobs**: Node-cron or similar

---

## 📊 Success Metrics

1. **EOD Approval Rate**: % of EODs approved vs rejected
2. **Average Approval Time**: Time from submission to approval
3. **Task Escalation Rate**: % of tasks reaching each escalation level
4. **Task Completion Time**: Average time to complete tasks after escalation
5. **Manager Dashboard Usage**: Frequency of dashboard views

---

## 🚀 Ready to Implement

This is a comprehensive plan. We can start with:
1. ✅ Database migrations
2. ✅ Task status calculation utility
3. ✅ Task status badges in UI
4. ✅ EOD approval workflow
5. ✅ Escalation notification system

**Which part would you like me to start implementing first?**
