import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

// Simple token storage for development - replace with proper secrets vault in production
const tokenStore = new Map<string, any>();

export class GmailService {
  private gmail: any;
  private convex: ConvexHttpClient;
  private userId: string;
  private oauth2Client: OAuth2Client;

  constructor(userId: string, convexClient: ConvexHttpClient) {
    this.userId = userId;
    this.convex = convexClient;
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    );
  }

  async authenticate(): Promise<boolean> {
    try {
      // Get Gmail connection from Convex
      const connections = await this.convex.query(api.connections.getConnections, {
        userId: this.userId,
        type: 'gmail'
      });

      if (!connections || connections.length === 0) {
        console.log('No Gmail connection found for user:', this.userId);
        return false;
      }

      const gmailConnection = connections[0];
      if (gmailConnection.status !== 'active') {
        console.log('Gmail connection not active:', gmailConnection.status);
        return false;
      }

      // Get tokens from store using tokenRef
      const tokens = tokenStore.get(gmailConnection.tokenRef);
      if (!tokens) {
        console.log('No tokens found for tokenRef:', gmailConnection.tokenRef);
        return false;
      }

      // Set credentials
      this.oauth2Client.setCredentials(tokens);

      // Check if token is expired and refresh if needed
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        console.log('Token expired, refreshing...');
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(credentials);

        // Update stored tokens
        tokenStore.set(gmailConnection.tokenRef, credentials);
      }

      this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  /**
   * Get recent emails with full content and attachments
   */
  async getRecentEmails(limit: number = 10): Promise<any[]> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Gmail');
      }

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
        q: 'in:inbox',
      });

      const messages = response.data.messages || [];
      const emails = [];

      for (const message of messages) {
        const email = await this.getEmailDetails(message.id);
        if (email) {
          emails.push(email);
        }
      }

      return emails;
    } catch (error) {
      console.error('Error fetching recent emails:', error);
      throw new Error('Failed to fetch recent emails');
    }
  }

  /**
   * Get full email details including attachments
   */
  async getEmailDetails(messageId: string): Promise<any> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload.headers;

      // Extract key information
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const to = headers.find((h: any) => h.name === 'To')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';

      // Get email body
      const body = this.extractEmailBody(message.payload);

      // Get attachments
      const attachments = await this.getAttachments(messageId, message.payload);

      return {
        id: messageId,
        threadId: message.threadId,
        subject,
        from,
        to,
        date,
        body,
        attachments,
        labels: message.labelIds || [],
        snippet: message.snippet,
      };
    } catch (error) {
      console.error('Error getting email details:', error);
      return null;
    }
  }

  /**
   * Extract email body from Gmail message payload
   */
  private extractEmailBody(payload: any): string {
    if (payload.body && payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString();
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
        if (part.mimeType === 'text/html' && part.body && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }

    return '';
  }

  /**
   * Get email attachments
   */
  private async getAttachments(messageId: string, payload: any): Promise<any[]> {
    const attachments = [];

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.body && part.body.attachmentId) {
          try {
            const attachment = await this.gmail.users.messages.attachments.get({
              userId: 'me',
              messageId,
              id: part.body.attachmentId,
            });

            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size,
              data: attachment.data.data,
            });
          } catch (error) {
            console.error('Error getting attachment:', error);
          }
        }
      }
    }

    return attachments;
  }

  /**
   * Send email
   */
  async sendEmail(to: string, subject: string, body: string, cc?: string, bcc?: string): Promise<any> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Gmail');
      }

      const email = this.createEmail(to, subject, body, cc, bcc);

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: email,
        },
      });

      return {
        messageId: response.data.id,
        threadId: response.data.threadId,
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Create email in RFC 2822 format
   */
  private createEmail(to: string, subject: string, body: string, cc?: string, bcc?: string): string {
    const emailLines = [
      'To: ' + to,
      'Subject: ' + subject,
      'Content-Type: text/plain; charset=utf-8',
    ];

    if (cc) {
      emailLines.push('Cc: ' + cc);
    }

    if (bcc) {
      emailLines.push('Bcc: ' + bcc);
    }

    emailLines.push('', body);

    const email = emailLines.join('\r\n');
    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Search emails
   */
  async searchEmails(query: string, limit: number = 20): Promise<any[]> {
    try {
      if (!(await this.authenticate())) {
        throw new Error('Failed to authenticate with Gmail');
      }

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
        q: query,
      });

      const messages = response.data.messages || [];
      const emails = [];

      for (const message of messages) {
        const email = await this.getEmailDetails(message.id);
        if (email) {
          emails.push(email);
        }
      }

      return emails;
    } catch (error) {
      console.error('Error searching emails:', error);
      throw new Error('Failed to search emails');
    }
  }

  /**
   * Analyze email content and create insights/tasks
   */
  async analyzeEmailContent(email: any): Promise<any> {
    try {
      // Extract key information from email
      const insights = {
        priority: this.determinePriority(email),
        actionItems: this.extractActionItems(email.body),
        deadlines: this.extractDeadlines(email.body),
        contacts: this.extractContacts(email),
        category: this.categorizeEmail(email),
      };

      // Create tasks for action items
      const tasks = [];
      for (const action of insights.actionItems) {
        const result = await this.convex.mutation(api.tasks.createTask, {
          userId: this.userId,
          title: action,
          description: `From email: ${email.subject}`,
          priority: insights.priority,
          sourceEmailId: email.id,
          tags: ['email-extraction'],
        });
        tasks.push(result.taskId);
      }

      // Create calendar events for deadlines
      const events = [];
      for (const deadline of insights.deadlines) {
        const result = await this.convex.mutation(api.events.createEvent, {
          userId: this.userId,
          calendarId: 'primary', // Default calendar
          title: deadline.title,
          description: `Deadline from email: ${email.subject}`,
          startAt: deadline.date,
          endAt: deadline.date,
          source: 'email_extraction',
          attendees: [],
        });
        events.push(result.eventId);
      }

      return {
        insights,
        tasksCreated: tasks.length,
        eventsCreated: events.length,
      };
    } catch (error) {
      console.error('Error analyzing email content:', error);
      return { insights: {}, tasksCreated: 0, eventsCreated: 0 };
    }
  }

  private determinePriority(email: any): 'low' | 'medium' | 'high' | 'urgent' {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();

    if (subject.includes('urgent') || subject.includes('asap') || body.includes('urgent')) {
      return 'urgent';
    }
    if (subject.includes('important') || email.labels.includes('IMPORTANT')) {
      return 'high';
    }
    if (subject.includes('meeting') || subject.includes('deadline')) {
      return 'medium';
    }
    return 'low';
  }

  private extractActionItems(body: string): string[] {
    const actionKeywords = ['todo', 'action item', 'please', 'need to', 'should', 'must', 'required'];
    const sentences = body.split(/[.!?]+/);

    return sentences
      .filter(sentence =>
        actionKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
      )
      .map(sentence => sentence.trim())
      .slice(0, 5); // Limit to 5 action items
  }

  private extractDeadlines(body: string): any[] {
    // Simple deadline extraction - in production, use NLP
    const deadlinePatterns = [
      /by\s+(\w+\s+\d+)/i,
      /due\s+(\w+\s+\d+)/i,
      /deadline\s+(\w+\s+\d+)/i,
    ];

    const deadlines = [];
    for (const pattern of deadlinePatterns) {
      const match = body.match(pattern);
      if (match) {
        deadlines.push({
          title: match[0],
          date: this.parseDate(match[1]),
        });
      }
    }

    return deadlines;
  }

  private extractContacts(email: any): string[] {
    // Extract email addresses from from, to, cc fields
    const contacts: string[] = [];
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;

    [email.from, email.to, email.cc].forEach(field => {
      if (field) {
        const matches = field.match(emailRegex);
        if (matches) {
          contacts.push(...matches);
        }
      }
    });

    return [...new Set(contacts)]; // Remove duplicates
  }

  private categorizeEmail(email: any): string {
    const subject = email.subject.toLowerCase();
    const from = email.from.toLowerCase();

    if (from.includes('calendar') || subject.includes('meeting') || subject.includes('invite')) {
      return 'calendar';
    }
    if (from.includes('newsletter') || from.includes('digest')) {
      return 'newsletter';
    }
    if (subject.includes('invoice') || subject.includes('payment') || subject.includes('bill')) {
      return 'financial';
    }
    if (subject.includes('job') || subject.includes('career') || subject.includes('application')) {
      return 'career';
    }

    return 'personal';
  }

  private parseDate(dateString: string): string {
    // Simple date parsing - in production, use a proper date parser
    try {
      const date = new Date(dateString);
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  // Static methods for token management
  static storeTokens(tokenRef: string, tokens: any): void {
    tokenStore.set(tokenRef, tokens);
  }

  static getTokens(tokenRef: string): any {
    return tokenStore.get(tokenRef);
  }

  static hasTokens(tokenRef: string): boolean {
    return tokenStore.has(tokenRef);
  }
}
