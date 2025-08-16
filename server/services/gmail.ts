import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Email, InsertEmail } from '@shared/schema';

// Remove the mock type override

export class GmailService {
  private oauth2Client: OAuth2Client | null = null;
  private gmail: any = null;

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

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      return true;
    } catch (error) {
      console.error('Error initializing Gmail service:', error);
      return false;
    }
  }

  getAuthUrl(): string | null {
    if (!this.oauth2Client) return null;

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async getAccessToken(code: string): Promise<any> {
    if (!this.oauth2Client) return null;

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  async fetchEmails(maxResults: number = 20): Promise<any[]> {
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'in:inbox',
      });

      const messages = response.data.messages || [];
      const emails = [];

      for (const message of messages) {
        const email = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });

        const emailData = this.parseEmailData(email.data);
        emails.push(emailData);
      }

      return emails;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  private parseEmailData(emailData: any): any {
    const headers = emailData.payload.headers;
    const getHeader = (name: string) => 
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    let body = '';
    if (emailData.payload.body?.data) {
      body = Buffer.from(emailData.payload.body.data, 'base64').toString();
    } else if (emailData.payload.parts) {
      const textPart = this.findTextPart(emailData.payload.parts);
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString();
      }
    }

    return {
      id: emailData.id,
      threadId: emailData.threadId,
      subject: getHeader('Subject'),
      sender: getHeader('From'),
      senderEmail: this.extractEmail(getHeader('From')),
      body: body.replace(/\r?\n/g, ' ').trim(),
      timestamp: new Date(parseInt(emailData.internalDate)),
      rawData: emailData,
    };
  }

  private findTextPart(parts: any[]): any {
    for (const part of parts) {
      if (part.mimeType === 'text/plain') {
        return part;
      }
      if (part.parts) {
        const textPart = this.findTextPart(part.parts);
        if (textPart) return textPart;
      }
    }
    return null;
  }

  private extractEmail(fromHeader: string): string {
    const match = fromHeader.match(/<(.+?)>/);
    return match ? match[1] : fromHeader;
  }

  async sendReply(messageId: string, replyText: string): Promise<boolean> {
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    try {
      // Get original message for threading
      const originalMessage = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
      });

      const headers = originalMessage.data.payload.headers;
      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject');
      const to = getHeader('From');
      const messageId_header = getHeader('Message-ID');
      const references = getHeader('References') || messageId_header;

      const email = [
        `To: ${to}`,
        `Subject: Re: ${subject.replace(/^Re:\s*/, '')}`,
        `In-Reply-To: ${messageId_header}`,
        `References: ${references}`,
        '',
        replyText
      ].join('\n');

      const encodedEmail = Buffer.from(email).toString('base64url');

      await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
          threadId: originalMessage.data.threadId,
        },
      });

      return true;
    } catch (error) {
      console.error('Error sending reply:', error);
      return false;
    }
  }
}

export const gmailService = new GmailService();
