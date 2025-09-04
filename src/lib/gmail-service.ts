import { google } from 'googleapis';
import { convex } from './convex';
import { api } from '../../convex/_generated/api';

export class GmailService {
  private oauth2Client: any;
  private gmail: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_ORIGIN}/api/gmail/callback`
    );
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async authenticateUser(userId: string): Promise<boolean> {
    try {
      // Get stored tokens from Convex
      const tokens = await convex.query(api.connections.getGmailTokens, { userId });
      
      if (!tokens || !tokens.accessToken) {
        return false;
      }

      // Check if token is expired and refresh if needed
      if (tokens.expiryDate && Date.now() > tokens.expiryDate) {
        if (!tokens.refreshToken) {
          return false;
        }
        
        this.oauth2Client.setCredentials({
          refresh_token: tokens.refreshToken
        });

        const { credentials } = await this.oauth2Client.refreshAccessToken();
        
        // Update stored tokens
        await convex.mutation(api.connections.updateGmailTokens, {
          userId,
          accessToken: credentials.access_token,
          expiryDate: credentials.expiry_date || Date.now() + 3600000,
        });

        this.oauth2Client.setCredentials(credentials);
      } else {
        this.oauth2Client.setCredentials({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });
      }

      return true;
    } catch (error) {
      console.error('Gmail authentication error:', error);
      return false;
    }
  }

  async getRecentEmails(userId: string, maxResults: number = 10): Promise<any[]> {
    try {
      const isAuthenticated = await this.authenticateUser(userId);
      if (!isAuthenticated) {
        throw new Error('Gmail not authenticated');
      }

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'in:inbox'
      });

      const messages = response.data.messages || [];
      const emails = [];

      for (const message of messages) {
        const email = await this.getEmailById(userId, message.id);
        if (email) {
          emails.push(email);
        }
      }

      return emails;
    } catch (error) {
      console.error('Error fetching recent emails:', error);
      throw error;
    }
  }

  async searchEmails(userId: string, query: string, maxResults: number = 20): Promise<any[]> {
    try {
      const isAuthenticated = await this.authenticateUser(userId);
      if (!isAuthenticated) {
        throw new Error('Gmail not authenticated');
      }

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query
      });

      const messages = response.data.messages || [];
      const emails = [];

      for (const message of messages) {
        const email = await this.getEmailById(userId, message.id);
        if (email) {
          emails.push(email);
        }
      }

      return emails;
    } catch (error) {
      console.error('Error searching emails:', error);
      throw error;
    }
  }

  async getEmailById(userId: string, messageId: string): Promise<any | null> {
    try {
      const isAuthenticated = await this.authenticateUser(userId);
      if (!isAuthenticated) {
        throw new Error('Gmail not authenticated');
      }

      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;
      
      const getHeader = (name: string) => {
        const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : '';
      };

      return {
        id: messageId,
        threadId: message.threadId,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
        snippet: message.snippet,
        body: this.extractEmailBody(message.payload),
        labels: message.labelIds || []
      };
    } catch (error) {
      console.error('Error fetching email by ID:', error);
      return null;
    }
  }

  async sendEmail(userId: string, to: string, subject: string, text: string, cc?: string, bcc?: string): Promise<string> {
    try {
      const isAuthenticated = await this.authenticateUser(userId);
      if (!isAuthenticated) {
        throw new Error('Gmail not authenticated');
      }

      // Construct RFC 2822 email format
      const emailLines = [
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        `Subject: ${subject}`,
        '',
        text
      ].filter(line => line !== '');

      const email = emailLines.join('\r\n');
      const encodedEmail = Buffer.from(email).toString('base64url');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      return response.data.id;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

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

  async isAuthenticated(userId: string): Promise<boolean> {
    try {
      const tokens = await convex.query(api.connections.getGmailTokens, { userId });
      return !!(tokens && tokens.accessToken);
    } catch (error) {
      return false;
    }
  }

  async getUserEmail(userId: string): Promise<string | null> {
    try {
      const tokens = await convex.query(api.connections.getGmailTokens, { userId });
      return tokens?.email || null;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const gmailService = new GmailService();
