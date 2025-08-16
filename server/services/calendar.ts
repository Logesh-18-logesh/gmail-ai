import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

import { CalendarEvent, InsertCalendarEvent } from '@shared/schema';

export class CalendarService {
  private oauth2Client: OAuth2Client | null = null;
  private calendar: any = null;

  async initialize(credentials: any, tokens?: any) {
    try {
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
      
      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      if (tokens) {
        this.oauth2Client.setCredentials(tokens);
      }

      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      return true;
    } catch (error) {
      console.error('Error initializing Calendar service:', error);
      return false;
    }
  }

  getAuthUrl(): string | null {
    if (!this.oauth2Client) return null;

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async createEvent(eventData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    emailId?: string;
  }): Promise<string | null> {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      const event = {
        summary: eventData.title,
        description: eventData.description || '',
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: 'America/Los_Angeles',
        },
        end: {
          dateTime: eventData.endTime.toISOString(),
          timeZone: 'America/Los_Angeles',
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      return response.data.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }

  async updateEvent(eventId: string, updates: {
    title?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<boolean> {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      const updateData: any = {};
      
      if (updates.title) updateData.summary = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.startTime) {
        updateData.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: 'America/Los_Angeles',
        };
      }
      if (updates.endTime) {
        updateData.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: 'America/Los_Angeles',
        };
      }

      await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: updateData,
      });

      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return false;
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });

      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }

  async listEvents(maxResults: number = 50): Promise<any[]> {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error listing calendar events:', error);
      return [];
    }
  }
}

export const calendarService = new CalendarService();
