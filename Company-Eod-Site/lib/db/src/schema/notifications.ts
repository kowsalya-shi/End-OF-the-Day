import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const portalNotificationsTable = pgTable("portal_notifications", {
  id: serial("id").primaryKey(),
  recipientUserId: integer("recipient_user_id").notNull(),
  employeeId: integer("employee_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  targetDate: date("target_date").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
