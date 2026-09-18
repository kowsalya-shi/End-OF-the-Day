# MIS Dashboard - Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Start the Backend
```powershell
cd artifacts\api-server
node dist\index.mjs
```

✅ **Expected Output**: `Server listening on port 8080`

---

### Step 2: Start the Frontend
```powershell
cd artifacts\eod-portal
npm run dev
```

✅ **Expected Output**: `Local: http://localhost:5173/`

---

### Step 3: Access MIS Dashboard

1. **Open browser**: http://localhost:5173
2. **Login** with your credentials:
   - Manager, IT Manager, CEO, or TL account
3. **Click "MIS Report"** in the left sidebar
4. **Explore the dashboard!**

---

## 👥 Who Can Access?

| Role | Can Access MIS? | What They See |
|------|----------------|---------------|
| **Employee** | ❌ No | N/A |
| **Team Leader** | ✅ Yes | Own team only |
| **Manager** | ✅ Yes | All teams |
| **IT Manager** | ✅ Yes | All teams |
| **CEO** | ✅ Yes | All teams |

---

## 📊 What You'll See

### 1. **Summary Cards** (Top Row)
- Total Tasks
- YTS (Yet To Start)
- WIP (Work In Progress)
- Holding
- Completed
- Overdue
- Ageing (5+ days stuck)

**Tip**: Click any card for details!

---

### 2. **EOD Report**
- Submitted, Missing, Late, Submission %
- Visual progress bar

---

### 3. **Employee Performance**
- Task breakdown per employee
- EOD submission rate

---

### 4. **TL Performance** *(Manager/CEO/IT Manager only)*
- Team-wise performance
- Missing EOD alerts

---

### 5. **Ageing Tasks**
- Tasks stuck for 5+ days
- Broken down by YTS/WIP/Holding

---

### 6. **Overdue Tasks**
- Tasks past their due date
- Days overdue count

---

## 🔍 Using Filters

### Date Range
- **Today**: Current day
- **Yesterday**: Previous day
- **This Week**: Last 7 days
- **This Month**: Current month
- **Custom**: Pick start and end dates

### TL Filter *(Manager/IT Manager/CEO only)*
- Select specific team leader
- See only that team's data

### Employee Filter *(Manager/IT Manager/CEO only)*
- Select specific employee
- See only their data

### Status Filter
- Filter tasks by status (YTS, WIP, Holding, Completed)

---

## 📥 Exporting Data

1. Click **"Export Excel"** button (top right)
2. CSV file downloads automatically
3. Open in Excel, Google Sheets, or any spreadsheet app

**What's Included**:
- Summary stats
- Employee performance
- TL performance
- Ageing tasks list
- Overdue tasks list

---

## ⚠️ Common Issues

### Issue: "MIS Report" not in menu
**Solution**: You're logged in as Employee (MIS is for TL/Manager/CEO only)

### Issue: No data showing
**Solution**: 
- Check date filter (try "This Week" instead of "Today")
- Ensure backend is running on port 8080

### Issue: "Unauthorized" error
**Solution**: 
- Re-login to refresh your session
- Check if backend server is running

### Issue: Export not working
**Solution**: 
- Check browser's Downloads folder
- Allow downloads in browser settings

---

## 🎯 Quick Tips

### For Team Leaders
- **Check daily**: Review ageing tasks in your team
- **Monitor EOD**: See who's missing daily EOD submissions
- **Export weekly**: Download weekly reports for your records

### For Managers
- **Compare teams**: Use TL Performance section to compare teams
- **Identify bottlenecks**: Check ageing tasks to find blockers
- **Monthly review**: Use "This Month" filter for performance reviews

### For CEO
- **High-level view**: Use summary cards for quick metrics
- **Drill down**: Use filters to investigate specific teams/employees
- **Export for meetings**: Download reports for board presentations

---

## 📞 Need Help?

- **Technical Issues**: Contact IT Manager
- **Data Questions**: Contact Manager
- **Feature Requests**: Contact Development Team

---

## ✅ You're Ready!

The MIS Dashboard is now set up and ready to use. Start exploring your data!

**Happy reporting! 📊**
