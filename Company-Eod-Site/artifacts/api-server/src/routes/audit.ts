import { Router } from "express";
import { db, auditLogTable } from "@workspace/db";
import { desc, and, eq, sql, gte, lte } from "drizzle-orm";
import { sessions } from "./auth";

const router = Router();

function getSession(req: import("express").Request) {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? sessions.get(authHeader.slice(7)) : undefined;
}

/**
 * GET /audit
 * Get audit log entries with optional filters
 * Query params:
 * - module: TASK | EOD | DAILY_WORK | TRAINING
 * - action: DELETE | CREATE | UPDATE
 * - userId: Filter by user who performed the action
 * - startDate: Filter from this date (ISO format)
 * - endDate: Filter until this date (ISO format)
 * - limit: Number of records to return (default 100, max 500)
 */
router.get("/audit", async (req, res) => {
  const session = getSession(req);
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Only manager, IT manager, and CEO can view audit logs
  if (!["manager", "it_manager", "ceo"].includes(session.role)) {
    return res.status(403).json({ error: "You don't have permission to view audit logs" });
  }

  const { module, action, userId, startDate, endDate, limit = "100" } = req.query;
  
  const conditions = [];
  
  if (module && typeof module === "string") {
    conditions.push(eq(auditLogTable.module, module));
  }
  
  if (action && typeof action === "string") {
    conditions.push(eq(auditLogTable.action, action));
  }
  
  if (userId && typeof userId === "string") {
    conditions.push(eq(auditLogTable.userId, parseInt(userId)));
  }
  
  if (startDate && typeof startDate === "string") {
    conditions.push(gte(auditLogTable.deletedAt, new Date(startDate)));
  }
  
  if (endDate && typeof endDate === "string") {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogTable.deletedAt, end));
  }

  const queryLimit = Math.min(parseInt(limit as string) || 100, 500);

  const logs = await db
    .select()
    .from(auditLogTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLogTable.deletedAt))
    .limit(queryLimit);

  res.json(logs);
});

/**
 * GET /audit/stats
 * Get audit log statistics
 */
router.get("/audit/stats", async (req, res) => {
  const session = getSession(req);
  
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!["manager", "it_manager", "ceo"].includes(session.role)) {
    return res.status(403).json({ error: "You don't have permission to view audit logs" });
  }

  const { startDate, endDate } = req.query;
  
  const conditions = [];
  
  if (startDate && typeof startDate === "string") {
    conditions.push(gte(auditLogTable.deletedAt, new Date(startDate)));
  }
  
  if (endDate && typeof endDate === "string") {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogTable.deletedAt, end));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [stats] = await db
    .select({
      totalDeletions: sql<number>`COUNT(*)`,
      taskDeletions: sql<number>`COUNT(CASE WHEN ${auditLogTable.module} = 'TASK' THEN 1 END)`,
      eodDeletions: sql<number>`COUNT(CASE WHEN ${auditLogTable.module} = 'EOD' THEN 1 END)`,
      dailyWorkDeletions: sql<number>`COUNT(CASE WHEN ${auditLogTable.module} = 'DAILY_WORK' THEN 1 END)`,
    })
    .from(auditLogTable)
    .where(whereClause);

  res.json(stats);
});

export default router;
