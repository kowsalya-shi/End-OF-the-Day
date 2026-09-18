import { Router } from "express";
import { db, internalTasksTable, eodSubmissionsTable, usersTable, teamsTable } from "@workspace/db";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";
import { sessions } from "./auth";

const router = Router();

function getSession(req: import("express").Request) {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? sessions.get(authHeader.slice(7)) : undefined;
}

/**
 * Main MIS API endpoint
 * Provides comprehensive management information based on user role
 * 
 * Query params:
 * - date: specific date or filter (today, yesterday, week, month)
 * - startDate: for custom date range
 * - endDate: for custom date range
 * - tlId: filter by team leader
 * - userId: filter by specific employee
 * - status: filter by task status
 */
router.get("/mis/dashboard", async (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { date, startDate, endDate, tlId, userId, status } = req.query;
    
    // Get user details to determine role
    const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    if (!currentUser) {
      return res.status(401).json({ error: "User not found" });
    }

    // Calculate date range
    const dateRange = calculateDateRange(date as string, startDate as string, endDate as string);
    
    // Get filtered data based on role
    const { tasks, eods, users, teams } = await getFilteredData(
      currentUser,
      dateRange,
      tlId as string | undefined,
      userId as string | undefined,
      status as string | undefined
    );

    // Calculate metrics
    const taskMetrics = calculateTaskMetrics(tasks, dateRange.targetDate);
    const eodMetrics = calculateEodMetrics(eods, users, dateRange.targetDate);
    const employeePerformance = calculateEmployeePerformance(tasks, eods, users);
    const tlPerformance = calculateTLPerformance(tasks, eods, users, teams);
    const ageingData = calculateAgeingTasks(tasks, dateRange.targetDate);
    const overdueData = calculateOverdueTasks(tasks, dateRange.targetDate);

    res.json({
      success: true,
      role: currentUser.role,
      dateRange,
      summary: {
        tasks: taskMetrics,
        eod: eodMetrics,
      },
      employeePerformance,
      tlPerformance,
      ageing: ageingData,
      overdue: overdueData,
      filters: {
        availableTLs: teams.map(t => ({ id: t.id, name: t.name, tlId: t.tlId })),
        availableEmployees: users.map(u => ({ id: u.id, name: u.name, role: u.role })),
      }
    });

  } catch (error) {
    console.error("MIS Dashboard error:", error);
    res.status(500).json({ error: "Failed to generate MIS report" });
  }
});

/**
 * Calculate date range based on filter
 */
function calculateDateRange(
  dateFilter?: string,
  startDate?: string,
  endDate?: string
): { targetDate: string; startDate: string; endDate: string; label: string } {
  const now = new Date();
  const today = formatDate(now);
  
  if (startDate && endDate) {
    return {
      targetDate: today,
      startDate,
      endDate,
      label: "Custom Range"
    };
  }

  switch (dateFilter) {
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDate(yesterday);
      return {
        targetDate: yesterdayStr,
        startDate: yesterdayStr,
        endDate: yesterdayStr,
        label: "Yesterday"
      };
    }
    
    case "week": {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      return {
        targetDate: today,
        startDate: formatDate(weekStart),
        endDate: today,
        label: "This Week"
      };
    }
    
    case "month": {
      const monthStart = new Date(now);
      monthStart.setDate(monthStart.getDate() - 30);
      return {
        targetDate: today,
        startDate: formatDate(monthStart),
        endDate: today,
        label: "This Month"
      };
    }
    
    default: // "today" or undefined
      return {
        targetDate: today,
        startDate: today,
        endDate: today,
        label: "Today"
      };
  }
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Get filtered data based on user role and permissions
 */
async function getFilteredData(
  currentUser: any,
  dateRange: any,
  tlIdFilter?: string,
  userIdFilter?: string,
  statusFilter?: string
) {
  // Get all tasks
  let tasks = await db.select().from(internalTasksTable);
  
  // Get all EODs in date range
  let eods = await db.select().from(eodSubmissionsTable)
    .where(and(
      gte(eodSubmissionsTable.date, dateRange.startDate),
      lte(eodSubmissionsTable.date, dateRange.endDate)
    ));
  
  // Get users and teams based on role
  let users: any[] = [];
  let teams: any[] = [];
  
  switch (currentUser.role) {
    case "employee": {
      // Employee sees only their own data
      users = [currentUser];
      tasks = tasks.filter(t => t.userId === currentUser.id);
      eods = eods.filter(e => e.userId === currentUser.id);
      teams = [];
      break;
    }
    
    case "tl": {
      // TL sees their own data + their team's data
      teams = await db.select().from(teamsTable).where(eq(teamsTable.tlId, currentUser.id));
      const teamIds = teams.map(t => t.id);
      
      users = await db.select().from(usersTable).where(
        inArray(usersTable.teamId, teamIds)
      );
      
      // Add TL themselves
      if (!users.find(u => u.id === currentUser.id)) {
        users.push(currentUser);
      }
      
      const userIds = users.map(u => u.id);
      tasks = tasks.filter(t => t.userId && userIds.includes(t.userId));
      eods = eods.filter(e => userIds.includes(e.userId));
      break;
    }
    
    case "manager":
    case "it_manager":
    case "ceo": {
      // Management sees all data
      users = await db.select().from(usersTable);
      teams = await db.select().from(teamsTable);
      break;
    }
  }

  // Apply additional filters
  if (tlIdFilter) {
    const filteredTeams = teams.filter(t => t.tlId === parseInt(tlIdFilter));
    const teamIds = filteredTeams.map(t => t.id);
    users = users.filter(u => u.teamId && teamIds.includes(u.teamId));
    const userIds = users.map(u => u.id);
    tasks = tasks.filter(t => t.userId && userIds.includes(t.userId));
    eods = eods.filter(e => userIds.includes(e.userId));
  }

  if (userIdFilter) {
    const filterUserId = parseInt(userIdFilter);
    users = users.filter(u => u.id === filterUserId);
    tasks = tasks.filter(t => t.userId === filterUserId);
    eods = eods.filter(e => e.userId === filterUserId);
  }

  if (statusFilter && statusFilter !== "all") {
    tasks = tasks.filter(t => t.status === statusFilter);
  }

  return { tasks, eods, users, teams };
}

/**
 * Calculate task metrics: YTS, WIP, Holding, Completed, Overdue, Ageing
 */
function calculateTaskMetrics(tasks: any[], targetDate: string) {
  const metrics = {
    total: tasks.length,
    yts: 0,
    wip: 0,
    holding: 0,
    completed: 0,
    cancelled: 0,
    overdue: 0,
    ageing: 0,
  };

  const targetDateTime = new Date(targetDate + "T00:00:00Z").getTime();

  for (const task of tasks) {
    // Count by status
    switch (task.status) {
      case "yts":
        metrics.yts++;
        break;
      case "wip":
        metrics.wip++;
        break;
      case "holding":
        metrics.holding++;
        break;
      case "completed":
        metrics.completed++;
        break;
      case "cancelled":
        metrics.cancelled++;
        break;
    }

    // Check if overdue (past planned end date)
    if (task.plannedEndDate && task.status !== "completed" && task.status !== "cancelled") {
      const endDateTime = new Date(task.plannedEndDate + "T00:00:00Z").getTime();
      if (targetDateTime > endDateTime) {
        metrics.overdue++;
      }
    }

    // Check if ageing (5+ days in YTS/WIP/Holding)
    if (["yts", "wip", "holding"].includes(task.status)) {
      let startDate: string | null = null;
      
      if (task.status === "wip" && task.actualStartDate) {
        startDate = task.actualStartDate;
      } else if (task.status === "yts" && task.plannedStartDate) {
        startDate = task.plannedStartDate;
      } else if (task.createdAt) {
        startDate = task.createdAt.toISOString().split('T')[0];
      }

      if (startDate) {
        const startDateTime = new Date(startDate + "T00:00:00Z").getTime();
        const ageDays = Math.floor((targetDateTime - startDateTime) / (24 * 60 * 60 * 1000));
        
        if (ageDays >= 5) {
          metrics.ageing++;
        }
      }
    }
  }

  return metrics;
}

/**
 * Calculate EOD metrics: submitted, missing, late, submission percentage
 */
function calculateEodMetrics(eods: any[], users: any[], targetDate: string) {
  const submittedUserIds = new Set(eods.map(e => e.userId));
  const totalUsers = users.filter(u => u.role === "employee" || u.role === "tl").length;
  const submitted = submittedUserIds.size;
  const missing = totalUsers - submitted;
  
  // Count late submissions (submitted after 9 PM on the target date)
  let late = 0;
  for (const eod of eods) {
    if (eod.submittedAt && eod.date === targetDate) {
      const submittedHour = new Date(eod.submittedAt).getHours();
      if (submittedHour >= 21) {
        late++;
      }
    }
  }

  const submissionPercentage = totalUsers > 0 ? Math.round((submitted / totalUsers) * 100) : 0;

  return {
    total: totalUsers,
    submitted,
    missing,
    late,
    submissionPercentage,
  };
}

/**
 * Calculate per-employee performance
 */
function calculateEmployeePerformance(tasks: any[], eods: any[], users: any[]) {
  const performance: any[] = [];

  for (const user of users) {
    if (user.role !== "employee" && user.role !== "tl") continue;

    const userTasks = tasks.filter(t => t.userId === user.id);
    const userEods = eods.filter(e => e.userId === user.id);

    const taskStats = {
      total: userTasks.length,
      completed: userTasks.filter(t => t.status === "completed").length,
      wip: userTasks.filter(t => t.status === "wip").length,
      yts: userTasks.filter(t => t.status === "yts").length,
      holding: userTasks.filter(t => t.status === "holding").length,
      ageing: 0,
    };

    // Calculate ageing for this employee
    const now = new Date();
    for (const task of userTasks) {
      if (["yts", "wip", "holding"].includes(task.status)) {
        let startDate: string | null = null;
        
        if (task.status === "wip" && task.actualStartDate) {
          startDate = task.actualStartDate;
        } else if (task.status === "yts" && task.plannedStartDate) {
          startDate = task.plannedStartDate;
        } else if (task.createdAt) {
          startDate = task.createdAt.toISOString().split('T')[0];
        }

        if (startDate) {
          const startDateTime = new Date(startDate + "T00:00:00Z").getTime();
          const ageDays = Math.floor((now.getTime() - startDateTime) / (24 * 60 * 60 * 1000));
          
          if (ageDays >= 5) {
            taskStats.ageing++;
          }
        }
      }
    }

    // Calculate EOD submission rate (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentEods = userEods.filter(e => new Date(e.date) >= thirtyDaysAgo);
    const eodPercentage = recentEods.length > 0 ? Math.round((recentEods.length / 30) * 100) : 0;

    performance.push({
      userId: user.id,
      employeeName: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      tasks: taskStats,
      eodSubmissionRate: eodPercentage,
    });
  }

  return performance.sort((a, b) => b.tasks.total - a.tasks.total);
}

/**
 * Calculate TL-wise team performance
 */
function calculateTLPerformance(tasks: any[], eods: any[], users: any[], teams: any[]) {
  const tlPerformance: any[] = [];

  for (const team of teams) {
    const [tl] = users.filter(u => u.id === team.tlId);
    if (!tl) continue;

    const teamMembers = users.filter(u => u.teamId === team.id);
    const teamMemberIds = teamMembers.map(m => m.id);
    
    const teamTasks = tasks.filter(t => t.userId && teamMemberIds.includes(t.userId));
    const teamEods = eods.filter(e => teamMemberIds.includes(e.userId));

    const taskStats = {
      total: teamTasks.length,
      completed: teamTasks.filter(t => t.status === "completed").length,
      wip: teamTasks.filter(t => t.status === "wip").length,
      yts: teamTasks.filter(t => t.status === "yts").length,
      holding: teamTasks.filter(t => t.status === "holding").length,
      ageing: 0,
    };

    // Calculate ageing
    const now = new Date();
    for (const task of teamTasks) {
      if (["yts", "wip", "holding"].includes(task.status)) {
        let startDate: string | null = null;
        
        if (task.status === "wip" && task.actualStartDate) {
          startDate = task.actualStartDate;
        } else if (task.status === "yts" && task.plannedStartDate) {
          startDate = task.plannedStartDate;
        } else if (task.createdAt) {
          startDate = task.createdAt.toISOString().split('T')[0];
        }

        if (startDate) {
          const startDateTime = new Date(startDate + "T00:00:00Z").getTime();
          const ageDays = Math.floor((now.getTime() - startDateTime) / (24 * 60 * 60 * 1000));
          
          if (ageDays >= 5) {
            taskStats.ageing++;
          }
        }
      }
    }

    // Calculate missing EODs (today)
    const today = formatDate(new Date());
    const todayEods = teamEods.filter(e => e.date === today);
    const submittedToday = new Set(todayEods.map(e => e.userId));
    const missingEodCount = teamMembers.length - submittedToday.size;

    tlPerformance.push({
      teamId: team.id,
      teamName: team.name,
      tlId: tl.id,
      tlName: tl.name,
      memberCount: teamMembers.length,
      tasks: taskStats,
      missingEodToday: missingEodCount,
    });
  }

  return tlPerformance;
}

/**
 * Calculate ageing tasks (5+ days in YTS/WIP/Holding)
 */
function calculateAgeingTasks(tasks: any[], targetDate: string) {
  const ageingTasks: any[] = [];
  const targetDateTime = new Date(targetDate + "T00:00:00Z").getTime();

  for (const task of tasks) {
    if (!["yts", "wip", "holding"].includes(task.status)) continue;

    let startDate: string | null = null;
    
    if (task.status === "wip" && task.actualStartDate) {
      startDate = task.actualStartDate;
    } else if (task.status === "yts" && task.plannedStartDate) {
      startDate = task.plannedStartDate;
    } else if (task.createdAt) {
      startDate = task.createdAt.toISOString().split('T')[0];
    }

    if (startDate) {
      const startDateTime = new Date(startDate + "T00:00:00Z").getTime();
      const ageDays = Math.floor((targetDateTime - startDateTime) / (24 * 60 * 60 * 1000));
      
      if (ageDays >= 5) {
        ageingTasks.push({
          taskId: task.id,
          taskName: task.taskName,
          taskCode: task.taskCode,
          userId: task.userId,
          teamId: task.teamId,
          status: task.status,
          startDate,
          ageDays,
          priority: task.priority,
        });
      }
    }
  }

  // Group by status
  const byStatus = {
    yts: ageingTasks.filter(t => t.status === "yts").length,
    wip: ageingTasks.filter(t => t.status === "wip").length,
    holding: ageingTasks.filter(t => t.status === "holding").length,
    total: ageingTasks.length,
  };

  return {
    summary: byStatus,
    tasks: ageingTasks.sort((a, b) => b.ageDays - a.ageDays),
  };
}

/**
 * Calculate overdue tasks (past planned end date)
 */
function calculateOverdueTasks(tasks: any[], targetDate: string) {
  const overdueTasks: any[] = [];
  const targetDateTime = new Date(targetDate + "T00:00:00Z").getTime();

  for (const task of tasks) {
    if (task.status === "completed" || task.status === "cancelled") continue;
    if (!task.plannedEndDate) continue;

    const endDateTime = new Date(task.plannedEndDate + "T00:00:00Z").getTime();
    if (targetDateTime > endDateTime) {
      const overdueDays = Math.floor((targetDateTime - endDateTime) / (24 * 60 * 60 * 1000));
      
      overdueTasks.push({
        taskId: task.id,
        taskName: task.taskName,
        taskCode: task.taskCode,
        userId: task.userId,
        teamId: task.teamId,
        status: task.status,
        plannedEndDate: task.plannedEndDate,
        overdueDays,
        priority: task.priority,
      });
    }
  }

  return {
    total: overdueTasks.length,
    tasks: overdueTasks.sort((a, b) => b.overdueDays - a.overdueDays),
  };
}

export default router;
