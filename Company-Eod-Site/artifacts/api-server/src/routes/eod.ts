import { Router } from "express";
import { db, eodSubmissionsTable, usersTable, teamsTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";

const router = Router();

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
  const targetDate = (date as string) || new Date().toISOString().split("T")[0];

  // Get submitted user IDs for this date
  const submitted = await db
    .select({ userId: eodSubmissionsTable.userId })
    .from(eodSubmissionsTable)
    .where(eq(eodSubmissionsTable.date, targetDate));

  const submittedIds = new Set(submitted.map(s => s.userId));

  let users = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.role, ["employee", "tl"]));

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
  const { date, userId, teamId, month, year } = req.query;
  let eods = await db.select().from(eodSubmissionsTable);

  if (date) eods = eods.filter(e => e.date === date);
  if (userId) eods = eods.filter(e => e.userId === parseInt(userId as string));
  if (teamId) eods = eods.filter(e => e.teamId === parseInt(teamId as string));
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

  const enriched = await Promise.all(eods.map(enrichEod));
  res.json(enriched);
});

router.post("/eod", async (req, res) => {
  const { date, attendanceStatus, remarks, tasksCompleted, trainingAttended, trainingTopic, internalWork, challenges, tomorrowPlan } = req.body;
  if (!date || !attendanceStatus) {
    return res.status(400).json({ error: "date and attendanceStatus required" });
  }

  // Get userId from auth header
  const authHeader = req.headers.authorization;
  let userId = req.body.userId;
  if (!userId && authHeader?.startsWith("Bearer ")) {
    const { sessions } = await import("./auth");
    const token = authHeader.slice(7);
    const session = sessions.get(token);
    userId = session?.userId;
  }

  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

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
  await db.delete(eodSubmissionsTable).where(eq(eodSubmissionsTable.id, id));
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

  const enriched = await Promise.all(pendingEods.map(enrichEod));
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

export default router;
