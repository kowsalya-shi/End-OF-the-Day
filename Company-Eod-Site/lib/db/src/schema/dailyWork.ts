import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyWorkTable = pgTable("daily_work", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  how: text("how"),
  who: text("who"),
  assignedBy: text("assigned_by"),
  date: date("date", { mode: "string" }).notNull(),
  startDate: date("start_date", { mode: "string" }),
  completionDate: date("completion_date", { mode: "string" }),
  status: text("status").notNull().default("yts"),
  completionPct: integer("completion_pct").default(0),
  remarks: text("remarks"),
  userId: integer("user_id"),
  teamId: integer("team_id"),
  // Set only for Daily Work automatically created from a Task. This keeps the two records synchronized.
  sourceTaskId: integer("source_task_id"),
  approvalStatus: text("approval_status").notNull().default("pending"),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDailyWorkSchema = createInsertSchema(dailyWorkTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDailyWork = z.infer<typeof insertDailyWorkSchema>;
export type DailyWork = typeof dailyWorkTable.$inferSelect;
