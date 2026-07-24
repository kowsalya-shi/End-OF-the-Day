import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trainingRecordsTable = pgTable("training_records", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  category: text("category"),
  trainer: text("trainer"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  status: text("status").notNull().default("yts"),
  progressPct: integer("progress_pct").default(0),
  remarks: text("remarks"),
  userId: integer("user_id"),
  teamId: integer("team_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTrainingSchema = createInsertSchema(trainingRecordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTraining = z.infer<typeof insertTrainingSchema>;
export type TrainingRecord = typeof trainingRecordsTable.$inferSelect;
