# Task Forms - Required Changes

## Current Problem

Currently, BOTH "Assign Task" and "Edit Task" dialogs show the SAME full form with all these fields:
- Task Name
- Assign To
- Priority  
- Task Code
- Status
- Progress %
- Planned Start Date
- Planned End Date
- Remarks

## Required Solution

### 1. **Assign Task Dialog** (Simple Form)
When clicking "Assign Task" button, show ONLY:
- ✅ Task Name (required)
- ✅ Assign To (dropdown - required)
- ✅ Priority (High/Medium/Low)
- ✅ Planned Start Date
- ✅ Planned End Date
- ✅ Remarks (optional)

**Fields to REMOVE from Assignment:**
- ❌ Task Code (auto-generated)
- ❌ Status (always YTS for new assignment)
- ❌ Progress % (always 0% for new assignment)

### 2. **Edit Task Dialog** (Full Form)
When clicking the Edit button (pencil icon), show ALL fields:
- ✅ Task Name
- ✅ Assign To
- ✅ Priority
- ✅ Task Code
- ✅ Status
- ✅ Progress %
- ✅ Planned Start Date
- ✅ Planned End Date
- ✅ Actual Start Date
- ✅ Actual End Date
- ✅ Remarks
- ✅ All other fields

## Files to Update

### 1. Manager Tasks (`artifacts/eod-portal/src/pages/manager/tasks.tsx`)
- Create two separate form components:
  - `SimpleAssignmentForm` - For assigning new tasks
  - `FullEditForm` - For editing existing tasks
- Update "Assign Task" dialog to use `SimpleAssignmentForm`
- Update "Edit Task" dialog to use `FullEditForm`

### 2. CEO Tasks (`artifacts/eod-portal/src/pages/ceo/tasks.tsx`)
- Same changes as Manager Tasks

### 3. TL Tasks (`artifacts/eod-portal/src/pages/tl/tasks.tsx`)
- Create `SimpleAssignmentForm` for assigning to team members
- Keep full form for editing
- TL has two tabs: "My Tasks" and "Team Tasks"
  - "My Tasks" → Full edit form (editing own tasks)
  - "Team Tasks" → Both simple assign and full edit

## Implementation Steps

1. Extract current `TaskFormFields` into two components:
   ```typescript
   const SimpleAssignmentForm = () => (
     // Only basic fields
   );
   
   const FullEditForm = () => (
     // All fields (current TaskFormFields)
   );
   ```

2. Update "Assign Task" dialog:
   ```typescript
   <Dialog open={isCreateOpen}>
     <DialogContent>
       <DialogTitle>Assign New Task</DialogTitle>
       <SimpleAssignmentForm />  {/* Use simple form */}
     </DialogContent>
   </Dialog>
   ```

3. Update "Edit Task" dialog:
   ```typescript
   <Dialog open={isEditOpen}>
     <DialogContent>
       <DialogTitle>Edit Task</DialogTitle>
       <FullEditForm />  {/* Use full form */}
     </DialogContent>
   </Dialog>
   ```

## Benefits

✅ **Faster task assignment** - Less fields to fill
✅ **Clearer workflow** - Assignment vs. Management
✅ **Less confusion** - Users don't see fields they can't/shouldn't set
✅ **Better UX** - Appropriate forms for each action

## Default Values for Simple Assignment

When using the simple form, set these defaults automatically:
- `status`: "yts" (Yet to Start)
- `completionPct`: 0
- `assignmentStatus`: "pending" (for new workflow)
- `taskCode`: Auto-generated or empty

## Current vs Desired Behavior

### Current (Wrong ❌):
1. Click "Assign Task" → See ALL fields including status, progress
2. Click Edit → See ALL fields
3. Same experience for both actions

### Desired (Correct ✅):
1. Click "Assign Task" → See ONLY assignment fields
2. Click Edit → See ALL fields for full control
3. Different forms for different purposes

---

**Status:** Needs Implementation  
**Priority:** Medium  
**Estimated Time:** 2-3 hours (all 3 files)
