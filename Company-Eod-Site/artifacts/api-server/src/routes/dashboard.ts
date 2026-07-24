import { Router } from "express";
import { db, usersTable, teamsTable, eodSubmissionsTable, internalTasksTable, trainingRecordsTable } from "@workspace/db";
import { eq, count, and, inArray } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", async (req, res) => {
  const { date, teamId, month, year } = req.query;
  const targetDate = (date as string) || new Date().toISOString().split("T")[0];

  // Fetch all data
  let employees = await db.select().from(usersTable).where(inArray(usersTable.role, ["employee", "tl"]));
  if (teamId) employees = employees.filter(e => e.teamId === parseInt(teamId as string));

  let eods = await db.select().from(eodSubmissionsTable).where(eq(eodSubmissionsTable.date, targetDate));
  if (teamId) eods = eods.filter(e => e.teamId === parseInt(teamId as string));

  let tasks = await db.select().from(internalTasksTable);
  if (teamId) tasks = tasks.filter(t => t.teamId === parseInt(teamId as string));
  if (month) tasks = tasks.filter(t => {
    if (!t.plannedStartDate) return true;
    return new Date(t.plannedStartDate + "T00:00:00Z").getUTCMonth() + 1 === parseInt(month as string);
  });

  const teams = await db.select().from(teamsTable);

  const submittedEod = eods.length;
  const absentEmployees = eods.filter(e => e.attendanceStatus === "absent").length;
  const onLeave = eods.filter(e => e.attendanceStatus === "leave").length;
  const trainingAttended = eods.filter(e => e.trainingAttended === true).length;

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const wipTasks = tasks.filter(t => t.status === "wip").length;
  const holdTasks = tasks.filter(t => t.status === "hold").length;
  const ytsTasks = tasks.filter(t => t.status === "yts").length;

  const totalEmployees = employees.length;
  const pendingEod = Math.max(0, totalEmployees - submittedEod);
  const completionRate = totalEmployees > 0 ? (submittedEod / totalEmployees) * 100 : 0;

  res.json({
    totalEmployees,
    submittedEod,
    pendingEod,
    absentEmployees,
    onLeave,
    trainingAttended,
    completedTasks,
    wipTasks,
    holdTasks,
    ytsTasks,
    teamCount: teams.length,
    completionRate: Math.round(completionRate * 10) / 10,
  });
});

router.get("/dashboard/team-summary", async (req, res) => {
  const { date } = req.query;
  const targetDate = (date as string) || new Date().toISOString().split("T")[0];

  const teams = await db.select().from(teamsTable);
  const allEmployees = await db.select().from(usersTable).where(inArray(usersTable.role, ["employee", "tl"]));
  const eods = await db.select().from(eodSubmissionsTable).where(eq(eodSubmissionsTable.date, targetDate));

  const summary = teams.map(team => {
    const members = allEmployees.filter(e => e.teamId === team.id);
    const teamEods = eods.filter(e => e.teamId === team.id);
    const submitted = teamEods.length;
    const absent = teamEods.filter(e => e.attendanceStatus === "absent").length;
    const totalMembers = members.length;
    const pending = Math.max(0, totalMembers - submitted);
    const completionPct = totalMembers > 0 ? Math.round((submitted / totalMembers) * 100) : 0;

    return {
      teamId: team.id,
      teamName: team.name,
      totalMembers,
      submitted,
      pending,
      absent,
      completionPct,
    };
  });

  res.json(summary);
});

router.get("/dashboard/monthly-trend", async (req, res) => {
  const { year, teamId } = req.query;
  const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

  const allEods = await db.select().from(eodSubmissionsTable);
  const allTasks = await db.select().from(internalTasksTable);

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const trend = MONTHS.map((monthLabel, idx) => {
    const month = idx + 1;

    const monthEods = allEods.filter(e => {
      const d = new Date(e.date + "T00:00:00Z");
      return d.getUTCFullYear() === targetYear && d.getUTCMonth() + 1 === month;
    });

    const monthTasks = allTasks.filter(t => {
      if (!t.plannedStartDate) return false;
      const d = new Date(t.plannedStartDate + "T00:00:00Z");
      return d.getUTCFullYear() === targetYear && d.getUTCMonth() + 1 === month;
    });

    const uniqueDates = new Set(monthEods.map(e => e.date));
    const uniqueUserDays = monthEods.length;
    const submitted = uniqueUserDays;
    const pending = 0;
    const completedTasks = monthTasks.filter(t => t.status === "completed").length;

    return {
      month,
      year: targetYear,
      monthLabel,
      submitted,
      pending,
      totalTasks: monthTasks.length,
      completedTasks,
    };
  });

  res.json(trend);
});

// Top performers by completed tasks
router.get("/dashboard/top-performers", async (req, res) => {
  const { limit = "5", date } = req.query;
  const maxResults = parseInt(limit as string);
  
  const users = await db.select().from(usersTable).where(inArray(usersTable.role, ["employee", "tl"]));
  const tasks = await db.select().from(internalTasksTable);
  
  const performerStats = users.map(user => {
    const userTasks = tasks.filter(t => t.userId === user.id && t.status === "completed");
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      completedTasks: userTasks.length,
      department: user.department,
    };
  });
  
  const sorted = performerStats.sort((a, b) => b.completedTasks - a.completedTasks);
  res.json(sorted.slice(0, maxResults));
});

// Recent activity feed
router.get("/dashboard/recent-activity", async (req, res) => {
  const { limit = "10" } = req.query;
  const maxResults = parseInt(limit as string);
  const today = new Date().toISOString().split("T")[0];
  
  const eods = await db.select().from(eodSubmissionsTable).where(eq(eodSubmissionsTable.date, today));
  const users = await db.select().from(usersTable);
  
  const activities = eods.map(eod => {
    const user = users.find(u => u.id === eod.userId);
    const timeAgo = Math.floor((Date.now() - new Date(eod.createdAt).getTime()) / 60000); // minutes ago
    
    return {
      userId: eod.userId,
      userName: user?.name || "Unknown",
      action: eod.attendanceStatus === "present" ? "submitted EOD" : "marked absent",
      status: eod.attendanceStatus === "present" ? "success" : "warning",
      timeAgo: timeAgo < 60 ? `${timeAgo} min ago` : `${Math.floor(timeAgo / 60)} hours ago`,
      timestamp: eod.createdAt,
    };
  });
  
  const allEmployees = users.filter(u => u.role === "employee" || u.role === "tl");
  const submittedIds = new Set(eods.map(e => e.userId));
  
  allEmployees.forEach(user => {
    if (!submittedIds.has(user.id)) {
      activities.push({
        userId: user.id,
        userName: user.name,
        action: "pending EOD",
        status: "warning",
        timeAgo: "today",
        timestamp: new Date().toISOString(),
      });
    }
  });
  
  const sorted = activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  res.json(sorted.slice(0, maxResults));
});

// Pending employees list
router.get("/dashboard/pending-employees", async (req, res) => {
  const { date } = req.query;
  const targetDate = (date as string) || new Date().toISOString().split("T")[0];
  
  const allEmployees = await db.select().from(usersTable).where(inArray(usersTable.role, ["employee", "tl"]));
  const eods = await db.select().from(eodSubmissionsTable).where(eq(eodSubmissionsTable.date, targetDate));
  
  const submittedIds = new Set(eods.map(e => e.userId));
  
  const pending = allEmployees
    .filter(user => !submittedIds.has(user.id))
    .map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      employeeId: user.employeeId,
    }));
  
  res.json(pending);
});

// Task status summary for Team Leader
router.get("/dashboard/task-status-summary", async (req, res) => {
  const { teamId, tlId } = req.query;

  try {
    let tasks = await db.select().from(internalTasksTable);
    
    // Filter by specific team
    if (teamId) {
      tasks = tasks.filter(t => t.teamId === parseInt(teamId as string));
    }
    // OR filter by TL - get all teams managed by this TL
    else if (tlId) {
      const tlTeams = await db.select().from(teamsTable).where(eq(teamsTable.tlId, parseInt(tlId as string)));
      const teamIds = tlTeams.map(t => t.id);
      tasks = tasks.filter(t => t.teamId && teamIds.includes(t.teamId));
    }

    const summary = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === "completed").length,
      wip: tasks.filter(t => t.status === "wip").length,
      yts: tasks.filter(t => t.status === "yts").length,
      hold: tasks.filter(t => t.status === "hold").length,
    };

    res.json(summary);
  } catch (error) {
    console.error("Error fetching task status summary:", error);
    res.status(500).json({ error: "Failed to fetch task status summary" });
  }
});

// Weekly heatmap data
router.get("/dashboard/weekly-heatmap", async (req, res) => {
  const today = new Date();
  const weekData = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    
    const allEmployees = await db.select().from(usersTable).where(inArray(usersTable.role, ["employee", "tl"]));
    const eods = await db.select().from(eodSubmissionsTable).where(eq(eodSubmissionsTable.date, dateStr));
    
    const total = allEmployees.length;
    const submitted = eods.length;
    const completionRate = total > 0 ? submitted / total : 0;
    
    weekData.push({
      date: dateStr,
      day: dayName,
      submitted,
      total,
      completionRate,
      status: completionRate >= 0.9 ? "complete" : completionRate >= 0.5 ? "partial" : "low",
    });
  }
  
  res.json(weekData);
});

export default router;
