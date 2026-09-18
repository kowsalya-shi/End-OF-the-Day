import { pgTable, text, serial, integer, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const internalTasksTable = pgTable("internal_tasks", {
  id: serial("id").primaryKey(),
  taskCode: text("task_code"),
  taskName: text("task_name").notNull(),
  how: text("how"),
  who: text("who"),
  assignedBy: text("assigned_by"),
  priority: text("priority").default("medium"),
  plannedStartDate: date("planned_start_date", { mode: "string" }),
  plannedEndDate: date("planned_end_date", { mode: "string" }),
  actualStartDate: date("actual_start_date", { mode: "string" }),
  actualEndDate: date("actual_end_date", { mode: "string" }),
  status: text("status").notNull().default("yts"),
  completionPct: integer("completion_pct").default(0),
  dependency: text("dependency"),
  remarks: text("remarks"),
  etc: text("etc"),
  userId: integer("user_id"),
  teamId: integer("team_id"),
  approvalStatus: text("approval_status").notNull().default("pending"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  assignmentStatus: text("assignment_status").default("accepted"), // pending, accepted, declined
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  declineReason: text("decline_reason"),
  reassignmentRequested: boolean("reassignment_requested").default(false),
  reassignmentReason: text("reassignment_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// An append-only audit trail: reassignment never overwrites its prior owner.
export const taskReassignmentsTable = pgTable("task_reassignments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  reassignedByUserId: integer("reassigned_by_user_id").notNull(),
  fromUserId: integer("from_user_id"),
  toUserId: integer("to_user_id").notNull(),
  fromTeamId: integer("from_team_id"),
  toTeamId: integer("to_team_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInternalTaskSchema = createInsertSchema(internalTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInternalTask = z.infer<typeof insertInternalTaskSchema>;
export type InternalTask = typeof internalTasksTable.$inferSelect;
