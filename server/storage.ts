import { type Email, type InsertEmail, type CalendarEvent, type InsertCalendarEvent, type UserFeedback, type InsertUserFeedback } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Email operations
  getEmails(): Promise<Email[]>;
  getEmail(id: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: string, updates: Partial<Email>): Promise<Email | undefined>;
  deleteEmail(id: string): Promise<boolean>;
  getEmailsByPriority(priority: string): Promise<Email[]>;
  getReplyLaterEmails(): Promise<Email[]>;
  updateEmailReplyLater(id: string, isReplyLater: boolean): Promise<Email | undefined>;

  // Calendar operations
  getCalendarEvents(): Promise<CalendarEvent[]>;
  getCalendarEvent(id: string): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  deleteCalendarEvent(id: string): Promise<boolean>;
  getCalendarEventsByEmail(emailId: string): Promise<CalendarEvent[]>;

  // User feedback operations
  createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback>;
  getUserFeedback(): Promise<UserFeedback[]>;
}

export class MemStorage implements IStorage {
  private emails: Map<string, Email> = new Map();
  private calendarEvents: Map<string, CalendarEvent> = new Map();
  private userFeedbackList: Map<string, UserFeedback> = new Map();

  // Email operations
  async getEmails(): Promise<Email[]> {
    return Array.from(this.emails.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getEmail(id: string): Promise<Email | undefined> {
    return this.emails.get(id);
  }

  async createEmail(insertEmail: InsertEmail): Promise<Email> {
    const id = insertEmail.id || randomUUID();
    const email: Email = { 
      ...insertEmail, 
      id,
      timestamp: insertEmail.timestamp || new Date(),
      isReplyLater: insertEmail.isReplyLater || false,
      summary: insertEmail.summary || null,
      threadId: insertEmail.threadId || null,
      deadline: insertEmail.deadline || null,
      rawData: insertEmail.rawData || null
    };
    this.emails.set(id, email);
    return email;
  }

  async updateEmail(id: string, updates: Partial<Email>): Promise<Email | undefined> {
    const email = this.emails.get(id);
    if (!email) return undefined;
    
    const updatedEmail = { ...email, ...updates };
    this.emails.set(id, updatedEmail);
    return updatedEmail;
  }

  async deleteEmail(id: string): Promise<boolean> {
    return this.emails.delete(id);
  }

  async getEmailsByPriority(priority: string): Promise<Email[]> {
    return Array.from(this.emails.values())
      .filter(email => email.priority === priority)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getReplyLaterEmails(): Promise<Email[]> {
    return Array.from(this.emails.values())
      .filter(email => email.isReplyLater)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async updateEmailReplyLater(id: string, isReplyLater: boolean): Promise<Email | undefined> {
    return this.updateEmail(id, { isReplyLater });
  }

  // Calendar operations
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values());
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    return this.calendarEvents.get(id);
  }

  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = insertEvent.id || randomUUID();
    const event: CalendarEvent = { 
      ...insertEvent, 
      id,
      createdAt: new Date(),
      description: insertEvent.description || null,
      emailId: insertEvent.emailId || null
    };
    this.calendarEvents.set(id, event);
    return event;
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    return this.calendarEvents.delete(id);
  }

  async getCalendarEventsByEmail(emailId: string): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values())
      .filter(event => event.emailId === emailId);
  }

  // User feedback operations
  async createUserFeedback(insertFeedback: InsertUserFeedback): Promise<UserFeedback> {
    const id = insertFeedback.id || randomUUID();
    const feedback: UserFeedback = { 
      ...insertFeedback, 
      id,
      createdAt: new Date(),
      emailId: insertFeedback.emailId || null,
      reason: insertFeedback.reason || null
    };
    this.userFeedbackList.set(id, feedback);
    return feedback;
  }

  async getUserFeedback(): Promise<UserFeedback[]> {
    return Array.from(this.userFeedbackList.values());
  }
}

export const storage = new MemStorage();
