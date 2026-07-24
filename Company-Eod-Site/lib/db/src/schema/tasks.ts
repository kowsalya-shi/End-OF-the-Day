import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInternalTaskSchema = createInsertSchema(internalTasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInternalTask = z.infer<typeof insertInternalTaskSchema>;
export type InternalTask = typeof internalTasksTable.$inferSelect;
