import { Router } from "express";
import { db, eodSubmissionsTable, usersTable, teamsTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { createPortalNotification, notifyEmployeeRecordDeleted, notifyRoleScopedEvent } from "./notifications";
import { sessions } from "./auth";
import { logEodDeletion } from "../lib/audit";

const router = Router();
const EOD_SUBMISSION_START_HOUR = 17; // 5:00 PM
const EOD_SUBMISSION_START_MINUTE = 30; // 5:30 PM
const EOD_SUBMISSION_END_HOUR = 21; // 9:00 PM

function getSession(req: import("express").Request) {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? sessions.get(authHeader.slice(7)) : undefined;
}

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
  if (hour < EOD_SUBMISSION_START_HOUR) return false;
  if (hour === EOD_SUBMISSION_START_HOUR && minute < EOD_SUBMISSION_START_MINUTE) return false;
  
  // After 9:00 PM
  if (hour >= EOD_SUBMISSION_END_HOUR) return false;
  
  return true;
}

// Before the 9 PM deadline, follow up on the previous workday's EOD.
// At and after 9 PM, today's missing EOD becomes the pending item.
function pendingEodDate() {
  const now = new Date();
  if (now.getHours() < EOD_SUBMISSION_END_HOUR) now.setDate(now.getDate() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function enrichEod(eod: typeof eodSubmissionsTable.$inferSelect) {
  let userName: string | null = null;
  let teamName: string | null = null;
  let approvedByName: string | null = null;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, eod.userId));
  userName = user?.name ?? null;

  if (eod.teamId) {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, eod.teamId));
    teamName = team?.name ?? null;
  }

  if (eod.approvedBy) {
    const [approver] = await db.select().from(usersTable).where(eq(usersTable.id, eod.approvedBy));
    approvedByName = approver?.name ?? null;
  }

  return {
    id: eod.id,
    userId: eod.userId,
    userName,
    teamId: eod.teamId,
    teamName,
    date: eod.date,
    attendanceStatus: eod.attendanceStatus,
    remarks: eod.remarks,
    submittedAt: eod.submittedAt?.toISOString(),
    tasksCompleted: eod.tasksCompleted,
    trainingAttended: eod.trainingAttended,
    trainingTopic: eod.trainingTopic,
    internalWork: eod.internalWork,
    challenges: eod.challenges,
    tomorrowPlan: eod.tomorrowPlan,
    // Approval fields
    approvalStatus: eod.approvalStatus,
    approvedBy: eod.approvedBy,
    approvedByName,
    approvedAt: eod.approvedAt?.toISOString(),
    rejectionReason: eod.rejectionReason,
    tlComments: eod.tlComments,
  };
}

router.get("/eod/pending", async (req, res) => {
  const { date, teamId, tlId } = req.query;
  const targetDate = (date as string) || pendingEodDate();

  // Get submitted user IDs for this date
  const submitted = await db
    .select({ userId: eodSubmissionsTable.userId })
    .from(eodSubmissionsTable)
    .where(eq(eodSubmissionsTable.date, targetDate));

  const submittedIds = new Set(submitted.map(s => s.userId));

  let users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "employee"));

  // Filter by specific team
  if (teamId) {
    users = users.filter(u => u.teamId === parseInt(teamId as string));
  }
  // OR filter by TL - get all teams managed by this TL
  else if (tlId) {
    const tlTeams = await db.select().from(teamsTable).where(eq(teamsTable.tlId, parseInt(tlId as string)));
    const teamIds = tlTeams.map(t => t.id);
    users = users.filter(u => u.teamId && teamIds.includes(u.teamId));
  }

  const pending = users.filter(u => !submittedIds.has(u.id));

  const result = await Promise.all(pending.map(async user => {
    let tlEmail: string | null = null;
    let managerEmail: string | null = null;

    if (user.teamId) {
      const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, user.teamId));
      if (team?.tlId) {
        const [tl] = await db.select().from(usersTable).where(eq(usersTable.id, team.tlId));
        tlEmail = tl?.email ?? null;
      }
      if (team?.managerId) {
        const [mgr] = await db.select().from(usersTable).where(eq(usersTable.id, team.managerId));
        managerEmail = mgr?.email ?? null;
      }
    }

    return {
      userId: user.id,
      userName: user.name,
      email: user.email,
      teamId: user.teamId,
      teamName: null,
      tlEmail,
      managerEmail,
    };
  }));

  res.json(result);
});

router.get("/eod", async (req, res) => {
  const { date, userId, teamId, tlId, month, year, userRole } = req.query;
  let eods = await db.select().from(eodSubmissionsTable);

  if (date) eods = eods.filter(e => e.date === date);
  if (userId) eods = eods.filter(e => e.userId === parseInt(userId as string));
  if (teamId) eods = eods.filter(e => e.teamId === parseInt(teamId as string));
  else if (tlId) {
    const tlTeams = await db.select({ id: teamsTable.id }).from(teamsTable).where(eq(teamsTable.tlId, parseInt(tlId as string)));
    const teamIds = tlTeams.map((team) => team.id);
    const employees = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "employee"));
    const employeeIds = new Set(employees.map((employee) => employee.id));
    eods = eods.filter((eod) => eod.teamId !== null && teamIds.includes(eod.teamId) && employeeIds.has(eod.userId));
  }
  if (month) {
    eods = eods.filter(e => {
      const d = new Date(e.date + "T00:00:00Z");
      return d.getUTCMonth() + 1 === parseInt(month as string);
    });
  }
  if (year) {
    eods = eods.filter(e => {
      const d = new Date(e.date + "T00:00:00Z");
      return d.getUTCFullYear() === parseInt(year as string);
    });
  }
  // Leadership pages can request reports submitted by one role, such as Team Leads.
  if (userRole) {
    const users = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, userRole as string));
    const userIds = new Set(users.map((user) => user.id));
    eods = eods.filter((eod) => userIds.has(eod.userId));
  }

  const enriched = await Promise.all(eods.map(enrichEod));
  res.json(enriched);
});

router.post("/eod", async (req, res) => {
  // Get userId from auth header
  const authHeader = req.headers.authorization;
  let userId = req.body.userId;
  let userRole: string | undefined;
  
  if (!userId && authHeader?.startsWith("Bearer ")) {
    const { sessions } = await import("./auth");
    const token = authHeader.slice(7);
    const session = sessions.get(token);
    userId = session?.userId;
    userRole = session?.role;
  }

  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  // Get user details to check role
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return res.status(401).json({ error: "User not found" });
  
  userRole = userRole || user.role;

  // Check if user can submit EOD at this time
  if (!isWithinEodSubmissionWindow(userRole)) {
    if (userRole === "employee") {
      return res.status(403).json({ error: "EOD submission is available from 5:30 PM until 9:00 PM for employees." });
    }
    return res.status(403).json({ error: "EOD submission is not available at this time." });
  }
  
  const { date, attendanceStatus, remarks, tasksCompleted, trainingAttended, trainingTopic, internalWork, challenges, tomorrowPlan } = req.body;
  if (!date || !attendanceStatus) {
    return res.status(400).json({ error: "date and attendanceStatus required" });
  }

  const [eod] = await db.insert(eodSubmissionsTable).values({
    userId,
    teamId: user?.teamId ?? null,
    date,
    attendanceStatus,
    remarks: remarks ?? null,
    tasksCompleted: tasksCompleted ?? null,
    trainingAttended: trainingAttended ?? false,
    trainingTopic: trainingTopic ?? null,
    internalWork: internalWork ?? null,
    challenges: challenges ?? null,
    tomorrowPlan: tomorrowPlan ?? null,
  }).returning();

  res.status(201).json(await enrichEod(eod));
});

router.get("/eod/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [eod] = await db.select().from(eodSubmissionsTable).where(eq(eodSubmissionsTable.id, id));
  if (!eod) return res.status(404).json({ error: "Not found" });
  res.json(await enrichEod(eod));
});

router.patch("/eod/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  
  // Get session to check user role
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) return res.status(401).json({ error: "User not found" });
  
  // Check if user can update EOD at this time
  if (!isWithinEodSubmissionWindow(user.role)) {
    if (user.role === "employee") {
      return res.status(403).json({ error: "EOD updates are available from 5:30 PM until 9:00 PM for employees." });
    }
    return res.status(403).json({ error: "EOD updates are not available at this time." });
  }
  
  const updates: Partial<typeof eodSubmissionsTable.$inferInsert> = {};
  const fields = ["attendanceStatus", "remarks", "tasksCompleted", "trainingAttended", "trainingTopic", "internalWork", "challenges", "tomorrowPlan"];
  for (const f of fields) {
    if (req.body[f] !== undefined) (updates as any)[f] = req.body[f];
  }
  const [currentEod] = await db.select().from(eodSubmissionsTable).where(eq(eodSubmissionsTable.id, id));
  if (!currentEod) return res.status(404).json({ error: "Not found" });

  // A corrected EOD returns to the Team Lead queue and retains no stale rejection feedback.
  if (currentEod.approvalStatus === "rejected" || currentEod.approvalStatus === "sent_back") {
    updates.approvalStatus = "resubmitted";
    updates.approvedBy = null;
    updates.approvedAt = null;
    updates.rejectionReason = null;
    updates.tlComments = null;
  }

  const [eod] = await db.update(eodSubmissionsTable).set(updates).where(eq(eodSubmissionsTable.id, id)).returning();
  res.json(await enrichEod(eod));
});

router.delete("/eod/:id", async (req, res) => {
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

  const [eod] = await db.select().from(eodSubmissionsTable).where(eq(eodSubmissionsTable.id, id));
  if (!eod) return res.status(404).json({ error: "Not found" });

  // Get EOD submitter name for audit log
  let eodUserName = null;
  if (eod.userId) {
    const [eodUser] = await db.select().from(usersTable).where(eq(usersTable.id, eod.userId));
    eodUserName = eodUser?.name;
  }

  // Permission check: Only allow deletion if:
  // 1. User is the EOD owner (employee can delete their own EOD)
  // 2. User is TL and EOD belongs to their team member
  // 3. User is IT Manager, Manager, or CEO (can delete any EOD)
  const canDelete = 
    eod.userId === session.userId || // Own EOD
    ["it_manager", "manager", "ceo"].includes(user.role); // Admin roles

  if (!canDelete && user.role === "tl") {
    // TL can delete EODs of their team members
    if (eod.teamId) {
      const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, eod.teamId));
      if (team && team.tlId === session.userId) {
        // TL owns this team
      } else {
        return res.status(403).json({ error: "You don't have permission to delete this EOD" });
      }
    } else {
      return res.status(403).json({ error: "You don't have permission to delete this EOD" });
    }
  } else if (!canDelete) {
    return res.status(403).json({ error: "You don't have permission to delete this EOD" });
  }

  // Log to audit before deletion
  await logEodDeletion(
    { ...eod, userName: eodUserName },
    { id: user.id, name: user.name },
    req
  );

  await db.delete(eodSubmissionsTable).where(eq(eodSubmissionsTable.id, id));
  await notifyEmployeeRecordDeleted(eod.userId, eod.teamId, "EOD Report", `EOD for ${eod.date}`, eod.id);
  res.status(204).send();
});

// ============================================
// EOD APPROVAL ENDPOINTS
// ============================================

/**
 * GET /eod/approvals/pending
 * Get all EODs pending approval for a Team Leader
 */
router.get("/eod/approvals/pending", async (req, res) => {
  const { tlId } = req.query;
  
  if (!tlId) {
    return res.status(400).json({ error: "tlId required" });
  }

  // Get all teams managed by this TL
  const tlTeams = await db.select().from(teamsTable).where(eq(teamsTable.tlId, parseInt(tlId as string)));
  const teamIds = tlTeams.map(t => t.id);

  if (teamIds.length === 0) {
    return res.json([]);
  }

  // Get all pending EODs from these teams
  const pendingEods = await db
    .select()
    .from(eodSubmissionsTable)
    .where(
      and(
        inArray(eodSubmissionsTable.teamId, teamIds),
        inArray(eodSubmissionsTable.approvalStatus, ["pending", "resubmitted"])
      )
    );

  const employees = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "employee"));
  const employeeIds = new Set(employees.map((employee) => employee.id));
  const employeePendingEods = pendingEods.filter((eod) => employeeIds.has(eod.userId));

  const enriched = await Promise.all(employeePendingEods.map(enrichEod));
  res.json(enriched);
});

/**
 * POST /eod/:id/approve
 * Approve an EOD
 */
router.post("/eod/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id);
  const { approvedBy, comments } = req.body;

  if (!approvedBy) {
    return res.status(400).json({ error: "approvedBy required" });
  }

  const [eod] = await db
    .update(eodSubmissionsTable)
    .set({
      approvalStatus: "approved",
      approvedBy,
      approvedAt: new Date(),
      tlComments: comments || null,
    })
    .where(eq(eodSubmissionsTable.id, id))
    .returning();

  if (!eod) {
    return res.status(404).json({ error: "EOD not found" });
  }

  const [approver] = await db.select().from(usersTable).where(eq(usersTable.id, approvedBy));
  await notifyRoleScopedEvent(eod.userId, eod.teamId, `eod_approved_${eod.id}`, "EOD Approved", {
    self: `Your EOD for ${eod.date} was approved by ${approver?.name ?? "your reviewer"}.`,
    team: `${approver?.name ?? "A reviewer"} approved this EOD.`,
    management: `${approver?.name ?? "A reviewer"} approved this EOD.`,
    actor: `You approved this EOD.`,
  }, eod.date, undefined, approvedBy);

  // Log the approval action (you could create an approval history table)
  // For now, just return the updated EOD

  res.json(await enrichEod(eod));
});

/**
 * POST /eod/:id/reject
 * Reject an EOD (requires reason)
 */
router.post("/eod/:id/reject", async (req, res) => {
  const id = parseInt(req.params.id);
  const { approvedBy, reason, comments } = req.body;

  if (!approvedBy) {
    return res.status(400).json({ error: "approvedBy required" });
  }

  if (!reason) {
    return res.status(400).json({ error: "Rejection reason is required" });
  }

  const [eod] = await db
    .update(eodSubmissionsTable)
    .set({
      approvalStatus: "rejected",
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: reason,
      tlComments: comments || null,
    })
    .where(eq(eodSubmissionsTable.id, id))
    .returning();

  if (!eod) {
    return res.status(404).json({ error: "EOD not found" });
  }

  const [approver] = await db.select().from(usersTable).where(eq(usersTable.id, approvedBy));
  await notifyRoleScopedEvent(eod.userId, eod.teamId, `eod_rejected_${eod.id}`, "EOD Rejected", {
    self: `Your EOD for ${eod.date} was rejected by ${approver?.name ?? "your reviewer"}. Reason: ${reason}`,
    team: `${approver?.name ?? "A reviewer"} rejected this EOD. Reason: ${reason}`,
    management: `${approver?.name ?? "A reviewer"} rejected this EOD. Reason: ${reason}`,
    actor: `You rejected this EOD.`,
  }, eod.date, undefined, approvedBy);

  res.json(await enrichEod(eod));
});

/**
 * POST /eod/:id/send-back
 * Send EOD back for correction
 */
router.post("/eod/:id/send-back", async (req, res) => {
  const id = parseInt(req.params.id);
  const { approvedBy, reason, comments } = req.body;

  if (!approvedBy) {
    return res.status(400).json({ error: "approvedBy required" });
  }

  if (!reason) {
    return res.status(400).json({ error: "Reason for sending back is required" });
  }

  const [eod] = await db
    .update(eodSubmissionsTable)
    .set({
      approvalStatus: "sent_back",
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: reason,
      tlComments: comments || null,
    })
    .where(eq(eodSubmissionsTable.id, id))
    .returning();

  if (!eod) {
    return res.status(404).json({ error: "EOD not found" });
  }

  res.json(await enrichEod(eod));
});

/**
 * GET /eod/approvals/approved
 * Get all approved EODs (for Manager/CEO view)
 */
router.get("/eod/approvals/approved", async (req, res) => {
  const { teamId, startDate, endDate } = req.query;

  let query = db
    .select()
    .from(eodSubmissionsTable)
    .where(eq(eodSubmissionsTable.approvalStatus, "approved"));

  let approvedEods = await query;

  // Apply filters
  if (teamId) {
    approvedEods = approvedEods.filter(e => e.teamId === parseInt(teamId as string));
  }

  if (startDate) {
    approvedEods = approvedEods.filter(e => e.date >= (startDate as string));
  }

  if (endDate) {
    approvedEods = approvedEods.filter(e => e.date <= (endDate as string));
  }

  const enriched = await Promise.all(approvedEods.map(enrichEod));
  res.json(enriched);
});

// Check if EOD submission is currently allowed for the authenticated user
router.get("/eod/check-window", async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "Not authenticated" });
  
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  if (!user) return res.status(401).json({ error: "User not found" });
  
  const canSubmit = isWithinEodSubmissionWindow(user.role);
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  let message = "";
  if (!canSubmit && user.role === "employee") {
    if (hour < 17 || (hour === 17 && minute < 30)) {
      message = "EOD submission opens at 5:30 PM";
    } else if (hour >= 21) {
      message = "EOD submission window has closed for today (5:30 PM - 9:00 PM)";
    }
  }
  
  res.json({
    canSubmit,
    role: user.role,
    currentTime: now.toISOString(),
    message,
    window: user.role === "employee" ? "5:30 PM - 9:00 PM" : "Anytime"
  });
});

export default router;
