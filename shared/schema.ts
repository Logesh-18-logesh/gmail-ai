import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const emails = pgTable("emails", {
  id: varchar("id").primaryKey(),
  threadId: text("thread_id"),
  subject: text("subject").notNull(),
  sender: text("sender").notNull(),
  senderEmail: text("sender_email").notNull(),
  body: text("body").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  priority: text("priority").notNull(), // urgent, normal, low
  confidence: integer("confidence").notNull(), // 0-100
  summary: text("summary"),
  deadline: timestamp("deadline"),
  isReplyLater: boolean("is_reply_later").default(false),
  rawData: jsonb("raw_data"),
});

export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey(),
  emailId: varchar("email_id").references(() => emails.id),
  eventId: text("event_id").notNull(), // Google Calendar event ID
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailId: varchar("email_id").references(() => emails.id),
  originalPriority: text("original_priority").notNull(),
  correctedPriority: text("corrected_priority").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertEmailSchema = createInsertSchema(emails);
export const insertCalendarEventSchema = createInsertSchema(calendarEvents);
export const insertUserFeedbackSchema = createInsertSchema(userFeedback);

export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;
