import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eodSubmissionsTable = pgTable("eod_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  teamId: integer("team_id"),
  date: date("date", { mode: "string" }).notNull(),
  attendanceStatus: text("attendance_status").notNull().default("present"),
  remarks: text("remarks"),
  tasksCompleted: integer("tasks_completed"),
  trainingAttended: boolean("training_attended").default(false),
  trainingTopic: text("training_topic"),
  internalWork: text("internal_work"),
  challenges: text("challenges"),
  tomorrowPlan: text("tomorrow_plan"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Approval fields
  approvalStatus: text("approval_status").default("pending"), // 'pending', 'approved', 'rejected', 'sent_back'
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  tlComments: text("tl_comments"),
});

export const insertEodSchema = createInsertSchema(eodSubmissionsTable).omit({ id: true, submittedAt: true, createdAt: true });
export type InsertEod = z.infer<typeof insertEodSchema>;
export type EodSubmission = typeof eodSubmissionsTable.$inferSelect;
