# MIS Dashboard Guide

## Overview
The MIS (Management Information System) Dashboard provides comprehensive insights into task performance, EOD submissions, employee productivity, and team performance.

## Access by Role

### **Employee**
- **Access**: Not visible in navigation (employee sees only their own data in regular reports)
- **Data**: Would only see their own metrics if implemented

### **Team Leader (TL)**
- **Menu**: Dashboard → **MIS Report**
- **Data Visible**:
  - Their own team members' data only
  - Summary of team tasks (YTS/WIP/Holding/Completed/Overdue/Ageing)
  - Team EOD submission statistics
  - Individual team member performance
  - Ageing tasks within their team
  - Overdue tasks within their team

### **Manager**
- **Menu**: Dashboard → **MIS Report**
- **Data Visible**:
  - **All employees** across all teams
  - **All TL teams** performance
  - Company-wide task metrics
  - Company-wide EOD statistics
  - Individual employee performance (all employees)
  - TL-wise team performance breakdown
  - All ageing tasks company-wide
  - All overdue tasks company-wide

### **IT Manager**
- **Menu**: Dashboard → **MIS Report**
- **Data Visible**: Same as Manager

### **CEO**
- **Menu**: Dashboard → **MIS Report**
- **Data Visible**: Same as Manager

---

## Dashboard Sections

### 1. **Summary Cards (Clickable)**
Quick metrics at a glance:

| Metric | Description | Color |
|--------|-------------|-------|
| Total Tasks | All tasks in the system | Blue |
| YTS | Yet To Start tasks | Yellow |
| WIP | Work In Progress tasks | Blue |
| Holding | Tasks on hold | Orange |
| Completed | Finished tasks | Green |
| Overdue | Tasks past due date | Red |
| Ageing | Tasks in YTS/WIP/Holding for 5+ days | Amber |

**Interaction**: Click any card to see detailed list of those tasks.

---

### 2. **EOD Report**
Shows End-of-Day submission statistics:

- **Submitted**: Number of EODs submitted
- **Missing**: Employees who didn't submit EOD
- **Late**: EODs submitted after 9:00 PM
- **Submission Rate**: Percentage of employees who submitted (e.g., 85%)

Visual progress bar shows submission rate.

**Interaction**: Click "Missing" count to see list of employees who missed EOD.

---

### 3. **Employee Performance Table**
Individual employee metrics:

| Column | Description |
|--------|-------------|
| Employee | Name of employee |
| Tasks | Total tasks assigned |
| Completed | Tasks completed |
| WIP | Tasks in progress |
| YTS | Tasks yet to start |
| Holding | Tasks on hold |
| Ageing | Tasks stuck for 5+ days |
| EOD % | EOD submission rate |

**Sorting**: Click column headers to sort.

---

### 4. **TL Performance Section**
*(Visible to Manager, IT Manager, CEO only)*

Shows team-wise breakdown:

- **TL Name** and **Team Name**
- **Member Count**: Number of team members
- **Task Distribution**: Total, Completed, WIP, YTS, Holding, Ageing
- **Missing EOD Today**: Red badge showing how many team members missed EOD

---

### 5. **Ageing Tasks Section**
Tasks stuck in YTS/WIP/Holding for **5 or more days**:

**Summary Cards**:
- YTS Ageing (yellow)
- WIP Ageing (blue)  
- Holding Ageing (orange)
- Total Ageing (amber)

**Task List** shows:
- Task name and code
- Current status
- **Age** (e.g., "7 days")
- Priority

**Ageing Logic**:
- **YTS**: Days since `plannedStartDate`
- **WIP**: Days since `actualStartDate`
- **Holding**: Days since `createdAt`

---

### 6. **Overdue Tasks Section**
Tasks past their **planned end date**:

**Shows**:
- Task name and code
- Status (can be any status)
- Due date
- **Overdue By** (e.g., "3 days")
- Priority

**Note**: A task can be both **Ageing** and **Overdue** (they are separate concepts).

---

## Filters

### Date Range Filters
- **Today**: Current day only
- **Yesterday**: Previous day
- **This Week**: Last 7 days
- **This Month**: Current calendar month
- **Custom Date**: Select specific start and end dates

### TL Filter
*(Manager/IT Manager/CEO only)*

Select specific Team Leader to see only their team's data.

### Employee Filter
*(Manager/IT Manager/CEO only)*

Select specific employee to see only their data.

### Status Filter
Filter tasks by status:
- All Status
- YTS
- WIP
- Holding
- Completed

**Interaction**: Filters apply automatically when changed. URL updates to maintain state on refresh.

---

## Export to Excel

Click **Export Excel** button to download CSV report with multiple sections:

### Export Sections:
1. **MIS Summary**: Task counts, EOD stats
2. **Employee Performance**: Full employee table with all metrics
3. **TL Performance**: Team-wise breakdown *(if applicable)*
4. **Ageing Tasks**: List of all ageing tasks with age
5. **Overdue Tasks**: List of all overdue tasks with overdue days

**Format**: CSV (opens in Excel, Google Sheets, etc.)  
**Filename**: `MIS_Report_YYYY-MM-DD.csv`

---

## API Endpoints

### Main MIS Endpoint
```
GET /api/mis/dashboard
```

**Query Parameters**:
- `date`: "today" | "yesterday" | "week" | "month" | "custom"
- `startDate`: Custom start date (YYYY-MM-DD)
- `endDate`: Custom end date (YYYY-MM-DD)
- `tlId`: Filter by Team Leader ID
- `userId`: Filter by User/Employee ID
- `status`: Filter by status ("yts" | "wip" | "holding" | "completed")

**Authorization**: Bearer token required

**Role-Based Filtering** (automatic):
- **Employee**: Gets only their own data
- **TL**: Gets only their team's data
- **Manager/IT Manager/CEO**: Gets all data (filtered by query params)

---

## Key Features

### ✅ Real-Time Data
- Data refreshes when filters change
- No manual refresh needed

### ✅ Role-Based Security
- Backend automatically filters data based on logged-in user's role
- TLs cannot see other teams' data
- Employees cannot access MIS dashboard

### ✅ Smart Ageing Detection
- Automatically identifies tasks stuck for 5+ days
- Different calculation based on status (YTS vs WIP vs Holding)

### ✅ Overdue vs Ageing
- **Ageing**: Task stuck in status too long (5+ days)
- **Overdue**: Task past its due date
- These are **separate** - a task can be both or neither

### ✅ Export-Ready
- All data can be exported to CSV
- Multiple sections in one file
- Ready for further analysis in Excel

---

## Usage Examples

### Example 1: Manager Checking Daily Performance
1. Login as Manager
2. Click **MIS Report** in sidebar
3. Date filter defaults to "Today"
4. Review:
   - How many tasks are YTS/WIP/Holding
   - EOD submission rate
   - Which employees have ageing tasks
   - Which tasks are overdue

### Example 2: TL Reviewing Team Performance
1. Login as Team Leader
2. Click **MIS Report**
3. See only your team's metrics
4. Click "Ageing" card to see which tasks are stuck
5. Review employee performance table for your team members

### Example 3: CEO Monthly Review
1. Login as CEO
2. Click **MIS Report**
3. Change date filter to **"This Month"**
4. Review TL Performance section to compare teams
5. Export Excel for detailed analysis
6. Share with management team

### Example 4: Finding Why Tasks Are Delayed
1. Select "This Week" in date filter
2. Click **Ageing** card (e.g., "15 ageing tasks")
3. See list of tasks stuck for 5+ days
4. Check which employees/teams have most ageing
5. Take corrective action (reassign, check blockers)

---

## Troubleshooting

### "MIS Report" not visible in menu
- Check your role: Only TL, Manager, IT Manager, CEO can access
- Employees do not have MIS access

### No data showing
- Check date filter (e.g., "Today" may have no tasks if it's a holiday)
- Try "This Week" or "This Month"
- Check if backend is running on port 8080

### Export not working
- Check browser's download settings
- File downloads as CSV (can open in Excel)
- Look in Downloads folder

### Ageing count seems wrong
- Ageing = 5+ days in current status (not total task age)
- Only counts YTS, WIP, Holding (not Completed)
- Check the task's start date vs current date

---

## Technical Details

### Files Created/Modified

**Backend**:
- `artifacts/api-server/src/routes/mis.ts` - MIS API with role-based filtering
- `artifacts/api-server/src/routes/index.ts` - Route registration

**Frontend**:
- `artifacts/eod-portal/src/pages/manager/mis.tsx` - MIS Dashboard UI
- `artifacts/eod-portal/src/lib/export-excel.ts` - Excel export utility
- `artifacts/eod-portal/src/App.tsx` - Route definitions
- `artifacts/eod-portal/src/components/layout/MainLayout.tsx` - Navigation menu

### Database Tables Used
- `tasks` - Task data
- `eod` - EOD submissions
- `users` - Employee/TL/Manager info
- `teams` - Team structure

### Performance Considerations
- Backend calculates metrics on-demand (no caching yet)
- Large datasets (1000+ tasks) may take 1-2 seconds to load
- Filters reduce data load by querying specific date ranges

---

## Future Enhancements (Not Yet Implemented)

- [ ] Employee-specific MIS view (own data only)
- [ ] Real-time auto-refresh (currently manual via filter change)
- [ ] Excel export with multiple sheets (native XLSX format)
- [ ] Trend charts (task completion over time)
- [ ] Performance alerts (automatic notifications for ageing > 7 days)
- [ ] Custom report templates
- [ ] Scheduled email reports (daily/weekly summary)

---

## Support

For technical issues or feature requests, contact:
- **IT Manager** for system access issues
- **Manager/CEO** for data visibility or reporting needs
- **Development Team** for bugs or enhancements

---

**Last Updated**: 2026-09-08  
**Version**: 1.0
