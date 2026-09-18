import { Router } from "express";
import { db, dailyWorkTable, internalTasksTable, usersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createPortalNotification, notifyEmployeeRecordDeleted } from "./notifications";
import { sessions } from "./auth";
import { logDailyWorkDeletion } from "../lib/audit";

const router = Router();

function getSession(req: import("express").Request) {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? sessions.get(authHeader.slice(7)) : undefined;
}

// Daily Work is shown in the Task module as a regular task, using the task-style code.
const dailyWorkTaskCode = (dailyWorkId: number) => `TASK-${dailyWorkId}`;
const optionalDate = (value: unknown) => typeof value === "string" && value.trim() === "" ? null : value;

function toTaskValues(work: typeof dailyWorkTable.$inferSelect) {
  return {
    taskCode: dailyWorkTaskCode(work.id),
    taskName: work.action,
    how: work.how,
    who: work.who,
    assignedBy: work.assignedBy,
    priority: "medium",
    plannedStartDate: work.date,
    actualStartDate: work.startDate,
    actualEndDate: work.completionDate,
    status: work.status,
    completionPct: work.completionPct,
    remarks: work.remarks,
    userId: work.userId,
    teamId: work.teamId,
    approvalStatus: work.approvalStatus,
    approvedBy: work.approvedBy,
    approvedAt: work.approvedAt,
    rejectionReason: work.rejectionReason,
  };
}

async function syncTaskFromDailyWork(database: Pick<typeof db, "select" | "insert" | "update">, work: typeof dailyWorkTable.$inferSelect) {
  const taskCode = dailyWorkTaskCode(work.id);
  const [existingTask] = await database
    .select({ id: internalTasksTable.id })
    .from(internalTasksTable)
    .where(eq(internalTasksTable.taskCode, taskCode));

  if (existingTask) {
    await database.update(internalTasksTable).set(toTaskValues(work)).where(eq(internalTasksTable.id, existingTask.id));
  } else {
    await database.insert(internalTasksTable).values(toTaskValues(work));
  }
}

async function backfillTaskLinks() {
  const dailyWork = await db.select().from(dailyWorkTable);
  let linked = 0;
  for (const work of dailyWork) {
    const taskCode = dailyWorkTaskCode(work.id);
    const [existingTask] = await db.select({ id: internalTasksTable.id }).from(internalTasksTable).where(eq(internalTasksTable.taskCode, taskCode));
    if (!existingTask) {
      await syncTaskFromDailyWork(db, work);
      linked += 1;
    }
  }
  return linked;
}

async function enrichWork(item: typeof dailyWorkTable.$inferSelect) {
  let userName: string | null = null;
  let teamName: string | null = null;

  if (item.userId) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, item.userId));
    userName = user?.name ?? null;
  }
  if (item.teamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, item.teamId));
    teamName = team?.name ?? null;
  }

  return {
    id: item.id,
    action: item.action,
    how: item.how,
    who: item.who,
    assignedBy: item.assignedBy,
    date: item.date,
    startDate: item.startDate,
    completionDate: item.completionDate,
    status: item.status,
    completionPct: item.completionPct,
    remarks: item.remarks,
    userId: item.userId,
    teamId: item.teamId,
    sourceTaskId: item.sourceTaskId,
    approvalStatus: item.approvalStatus,
    approvedBy: item.approvedBy,
    approvedAt: item.approvedAt?.toISOString(),
    rejectionReason: item.rejectionReason,
    userName,
    teamName,
    createdAt: item.createdAt?.toISOString(),
  };
}

async function notifyDailyWorkDecision(item: typeof dailyWorkTable.$inferSelect, approved: boolean, approverId: number | null) {
  if (!item.userId) return;
  const [approver] = approverId ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, approverId)) : [undefined];
  await createPortalNotification(
    item.userId,
    item.userId,
    `daily_work_${approved ? "approved" : "rejected"}_${item.id}`,
    approved ? "Daily Work Approved" : "Daily Work Rejected",
    approved
      ? `${approver?.name ?? "Your reviewer"} approved your completed daily work "${item.action}".`
      : `${approver?.name ?? "Your reviewer"} rejected your completed daily work "${item.action}". Reason: ${item.rejectionReason ?? "Please review and resubmit."}`,
    item.date,
  );
}

router.get("/daily-work", async (req, res) => {
  const { userId, teamId, tlId, date, month, year, status, week, userRole } = req.query;
  let items = await db.select().from(dailyWorkTable);

  if (userId) items = items.filter(i => i.userId === parseInt(userId as string));
  
  // Filter by specific team
  if (teamId) {
    items = items.filter(i => i.teamId === parseInt(teamId as string));
  }
  // OR filter by TL - get all teams managed by this TL
  else if (tlId) {
    const tlTeams = await db.select().from(teamsTable).where(eq(teamsTable.tlId, parseInt(tlId as string)));
    const teamIds = tlTeams.map(t => t.id);
    const employees = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "employee"));
    const employeeIds = new Set(employees.map((employee) => employee.id));
    items = items.filter(i => i.teamId && teamIds.includes(i.teamId) && i.userId && employeeIds.has(i.userId));
  }
  
  if (date) items = items.filter(i => i.date === date);
  if (status) items = items.filter(i => i.status === status);
  if (userRole) {
    const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, userRole as string));
    const userIds = new Set(users.map((user) => user.id));
    items = items.filter((item) => item.userId !== null && userIds.has(item.userId));
  }
  if (month) {
    items = items.filter(i => {
      const d = new Date(i.date + "T00:00:00Z");
      return d.getUTCMonth() + 1 === parseInt(month as string);
    });
  }
  if (year) {
    items = items.filter(i => {
      const d = new Date(i.date + "T00:00:00Z");
      return d.getUTCFullYear() === parseInt(year as string);
    });
  }
  if (week) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    items = items.filter(i => {
      const d = new Date(i.date + "T00:00:00Z");
      return d >= startOfWeek && d <= endOfWeek;
    });
  }

  const enriched = await Promise.all(items.map(enrichWork));
  res.json(enriched);
});

// One-time repair endpoint for Daily Work records created before task synchronization was introduced.
router.post("/daily-work/sync-tasks", async (_req, res) => {
  const linked = await backfillTaskLinks();
  res.json({ linked });
});

router.post("/daily-work", async (req, res) => {
  const { action, date, status, ...rest } = req.body;
  if (!action || !date) return res.status(400).json({ error: "action and date required" });

  const item = await db.transaction(async (tx) => {
    const [dailyWork] = await tx.insert(dailyWorkTable).values({
      action,
      date,
      status: status ?? "yts",
      how: rest.how ?? null,
      who: rest.who ?? null,
      assignedBy: rest.assignedBy ?? null,
      startDate: optionalDate(rest.startDate) ?? null,
      completionDate: optionalDate(rest.completionDate) ?? null,
      completionPct: rest.completionPct ?? 0,
      remarks: rest.remarks ?? null,
      userId: rest.userId ?? null,
      teamId: rest.teamId ?? null,
      approvalStatus: "pending",
    }).returning();
    await syncTaskFromDailyWork(tx, dailyWork);
    return dailyWork;
  });

  res.status(201).json(await enrichWork(item));
});

router.get("/daily-work/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [item] = await db.select().from(dailyWorkTable).where(eq(dailyWorkTable.id, id));
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(await enrichWork(item));
});

router.patch("/daily-work/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates: Partial<typeof dailyWorkTable.$inferInsert> = {};
  const fields = ["action", "how", "who", "assignedBy", "date", "startDate", "completionDate", "status", "completionPct", "remarks"];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      (updates as any)[f] = f === "startDate" || f === "completionDate" ? optionalDate(req.body[f]) : req.body[f];
    }
  }
  const item = await db.transaction(async (tx) => {
    const [currentWork] = await tx.select().from(dailyWorkTable).where(eq(dailyWorkTable.id, id));
    const [dailyWork] = await tx.update(dailyWorkTable).set(updates).where(eq(dailyWorkTable.id, id)).returning();
    if (dailyWork) {
      if (currentWork?.approvalStatus === "rejected") {
        await tx.update(dailyWorkTable).set({ approvalStatus: "resubmitted", approvedBy: null, approvedAt: null, rejectionReason: null }).where(eq(dailyWorkTable.id, id));
        dailyWork.approvalStatus = "resubmitted";
        dailyWork.approvedBy = null;
        dailyWork.approvedAt = null;
        dailyWork.rejectionReason = null;
      }
      await syncTaskFromDailyWork(tx, dailyWork);
    }
    return dailyWork;
  });
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(await enrichWork(item));
});

router.post("/daily-work/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id);
  const [currentWork] = await db.select().from(dailyWorkTable).where(eq(dailyWorkTable.id, id));
  if (!currentWork) return res.status(404).json({ error: "Not found" });
  if (currentWork.status !== "completed") return res.status(400).json({ error: "Only completed daily work can be approved or rejected" });
  const [item] = await db.update(dailyWorkTable).set({ approvalStatus: "approved", approvedBy: req.body.approvedBy ?? null, approvedAt: new Date(), rejectionReason: null }).where(eq(dailyWorkTable.id, id)).returning();
  if (!item) return res.status(404).json({ error: "Not found" });
  await syncTaskFromDailyWork(db, item);
  await notifyDailyWorkDecision(item, true, req.body.approvedBy ?? null);
  res.json(await enrichWork(item));
});

router.post("/daily-work/:id/reject", async (req, res) => {
  const id = parseInt(req.params.id);
  const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
  if (!reason) return res.status(400).json({ error: "Rejection reason required" });
  const [currentWork] = await db.select().from(dailyWorkTable).where(eq(dailyWorkTable.id, id));
  if (!currentWork) return res.status(404).json({ error: "Not found" });
  if (currentWork.status !== "completed") return res.status(400).json({ error: "Only completed daily work can be approved or rejected" });
  const [item] = await db.update(dailyWorkTable).set({ approvalStatus: "rejected", approvedBy: req.body.approvedBy ?? null, approvedAt: new Date(), rejectionReason: reason }).where(eq(dailyWorkTable.id, id)).returning();
  if (!item) return res.status(404).json({ error: "Not found" });
  await syncTaskFromDailyWork(db, item);
  await notifyDailyWorkDecision(item, false, req.body.approvedBy ?? null);
  res.json(await enrichWork(item));
});

router.delete("/daily-work/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const session = getSession(req);
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Get user details
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  const [item] = await db.select().from(dailyWorkTable).where(eq(dailyWorkTable.id, id));
  if (!item) return res.status(404).json({ error: "Not found" });

  // Get daily work submitter name for audit log
  let workUserName = null;
  if (item.userId) {
    const [workUser] = await db.select().from(usersTable).where(eq(usersTable.id, item.userId));
    workUserName = workUser?.name;
  }

  // Permission check: Only allow deletion if:
  // 1. User is the daily work owner (employee can delete their own work)
  // 2. User is TL and work belongs to their team member
  // 3. User is IT Manager, Manager, or CEO (can delete any work)
  const canDelete = 
    item.userId === session.userId || // Own work
    ["it_manager", "manager", "ceo"].includes(user.role); // Admin roles

  if (!canDelete && user.role === "tl") {
    // TL can delete daily work of their team members
    if (item.teamId) {
      const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, item.teamId));
      if (team && team.tlId === session.userId) {
        // TL owns this team
      } else {
        return res.status(403).json({ error: "You don't have permission to delete this daily work" });
      }
    } else {
      return res.status(403).json({ error: "You don't have permission to delete this daily work" });
    }
  } else if (!canDelete) {
    return res.status(403).json({ error: "You don't have permission to delete this daily work" });
  }

  // Log to audit before deletion
  await logDailyWorkDeletion(
    { ...item, userName: workUserName },
    { id: user.id, name: user.name },
    req
  );

  await db.transaction(async (tx) => {
    await tx.delete(internalTasksTable).where(eq(internalTasksTable.taskCode, dailyWorkTaskCode(id)));
    await tx.delete(dailyWorkTable).where(eq(dailyWorkTable.id, id));
  });
  await notifyEmployeeRecordDeleted(item.userId, item.teamId, "Daily Work", item.action, item.id);
  res.status(204).send();
});

export default router;
