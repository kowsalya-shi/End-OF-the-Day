import { db, auditLogTable, type InsertAuditLog } from "@workspace/db";
import type { Request } from "express";

export type AuditModule = "TASK" | "EOD" | "DAILY_WORK" | "TRAINING";
export type AuditAction = "DELETE" | "CREATE" | "UPDATE";

interface AuditLogData {
  userId: number;
  userName: string;
  action: AuditAction;
  module: AuditModule;
  recordId: number;
  recordTitle: string;
  recordDetails?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      userId: data.userId,
      userName: data.userName,
      action: data.action,
      module: data.module,
      recordId: data.recordId,
      recordTitle: data.recordTitle,
      recordDetails: data.recordDetails,
      ipAddress: data.ipAddress,
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - we don't want audit logging failure to break the main operation
  }
}

/**
 * Extract IP address from request
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

/**
 * Log task deletion
 */
export async function logTaskDeletion(
  task: { id: number; taskName: string; userId?: number | null; [key: string]: any },
  deletedBy: { id: number; name: string },
  req: Request
): Promise<void> {
  await createAuditLog({
    userId: deletedBy.id,
    userName: deletedBy.name,
    action: "DELETE",
    module: "TASK",
    recordId: task.id,
    recordTitle: task.taskName,
    recordDetails: {
      taskCode: task.taskCode,
      assignedTo: task.userName,
      assignedToId: task.userId,
      priority: task.priority,
      status: task.status,
      completionPct: task.completionPct,
    },
    ipAddress: getClientIp(req),
  });
}

/**
 * Log EOD deletion
 */
export async function logEodDeletion(
  eod: { id: number; date: string; userId: number; userName?: string; [key: string]: any },
  deletedBy: { id: number; name: string },
  req: Request
): Promise<void> {
  await createAuditLog({
    userId: deletedBy.id,
    userName: deletedBy.name,
    action: "DELETE",
    module: "EOD",
    recordId: eod.id,
    recordTitle: `EOD for ${eod.date}`,
    recordDetails: {
      date: eod.date,
      submittedBy: eod.userName,
      submittedById: eod.userId,
      attendanceStatus: eod.attendanceStatus,
      tasksCompleted: eod.tasksCompleted,
    },
    ipAddress: getClientIp(req),
  });
}

/**
 * Log Daily Work deletion
 */
export async function logDailyWorkDeletion(
  work: { id: number; action: string; userId: number; userName?: string; [key: string]: any },
  deletedBy: { id: number; name: string },
  req: Request
): Promise<void> {
  await createAuditLog({
    userId: deletedBy.id,
    userName: deletedBy.name,
    action: "DELETE",
    module: "DAILY_WORK",
    recordId: work.id,
    recordTitle: work.action,
    recordDetails: {
      action: work.action,
      submittedBy: work.userName,
      submittedById: work.userId,
      date: work.date,
      status: work.status,
      completionPct: work.completionPct,
    },
    ipAddress: getClientIp(req),
  });
}
