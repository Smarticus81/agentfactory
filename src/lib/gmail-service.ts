import { google } from 'googleapis';
import { convex } from './convex';
import { api } from '../../convex/_generated/api';

export class GmailService {
  private oauth2Client: any;
  private gmail: any;
  private tokenCache = new Map<string, {
    email: string;
    accessToken: string;
    refreshToken?: string;
    tokenType?: string;
    expiryDate?: number;
  }>();

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_ORIGIN}/api/gmail/callback`;

    if (!clientId || !clientSecret) {
      console.error('❌ Missing Google OAuth credentials. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.');
      console.error('📖 Visit /api/gmail/setup for setup instructions');
      throw new Error('Google OAuth credentials not configured');
    }

    // Validate credential format
    if (!clientId.endsWith('.apps.googleusercontent.com')) {
      console.warn('⚠️ GOOGLE_CLIENT_ID format looks incorrect. It should end with .apps.googleusercontent.com');
    }

    if (clientSecret.length < 20) {
      console.warn('⚠️ GOOGLE_CLIENT_SECRET looks too short. Make sure you copied the full secret.');
    }

    console.log('✅ Gmail Service initializing with credentials:', {
      clientIdPrefix: clientId.substring(0, 20) + '...',
      clientSecretLength: clientSecret.length,
      redirectUri: redirectUri || 'dynamic'
    });

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  private normalizeExpiry(expiry?: number | null): number | null {
    if (!expiry) return null;
    return expiry > 1e11 ? Math.floor(expiry / 1000) : Math.floor(expiry);
  }

  async storeTokens(userId: string, tokens: any): Promise<void> {
    try {
      this.oauth2Client.setCredentials(tokens);

      const existing = await convex.query(api.connections.getGmailTokens, { userId });

      let email: string | undefined;
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
        const profile = await oauth2.userinfo.get();
        email = profile.data.email ?? undefined;
      } catch (infoError) {
        console.warn('Failed to fetch Gmail user info:', infoError);
      }

      let refreshToken = tokens.refresh_token as string | undefined;
      if (!refreshToken) {
        refreshToken = existing?.refreshToken || undefined;
      }

      if (!refreshToken) {
        throw new Error('Missing refresh token for Gmail connection');
      }

      const accessToken = tokens.access_token as string | undefined;
      if (!accessToken) {
        throw new Error('Missing access token for Gmail connection');
      }

      const expirySeconds = this.normalizeExpiry(
        tokens.expiry_date || (tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : Date.now() + 3600000)
      ) || Math.floor((Date.now() + 3600000) / 1000);

      await convex.mutation(api.connections.saveGmailTokens, {
        userId,
        email: email || existing?.email || 'unknown',
        accessToken,
        refreshToken,
        tokenType: tokens.token_type || 'Bearer',
        expiryDate: expirySeconds,
      });

      console.log('✅ Stored Gmail tokens for user', userId, {
        email: email || existing?.email || 'unknown',
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        expiryDate: expirySeconds,
      });

      this.tokenCache.set(userId, {
        email: email || existing?.email || 'unknown',
        accessToken,
        refreshToken,
        tokenType: tokens.token_type || 'Bearer',
        expiryDate: expirySeconds,
      });
    } catch (error) {
      console.error('Failed to store Gmail tokens:', error);
      throw error;
    }
  }

  async authenticateUser(userId: string): Promise<boolean> {
    try {
      // Get stored tokens from Convex
      let tokens = await convex.query(api.connections.getGmailTokens, { userId });
      // console.debug('🗂️ Retrieved Gmail tokens for user', userId, tokens ? 'found' : 'null');

      if (!tokens) {
        const cached = this.tokenCache.get(userId);
        if (cached) {
          console.warn('⚠️ Using cached Gmail tokens for user', userId);
          tokens = {
            email: cached.email,
            accessToken: cached.accessToken,
            refreshToken: cached.refreshToken,
            tokenType: cached.tokenType,
            expiryDate: cached.expiryDate,
            expired: false,
          } as any;
        }
      }

      if (!tokens) {
        // console.debug('🚫 No Gmail tokens found for user', userId);
        return false;
      }

      if (!tokens.accessToken && !tokens.refreshToken) {
        console.warn('🚫 Tokens missing both access and refresh for user', userId);
        return false;
      }

      const expirySeconds = this.normalizeExpiry(tokens.expiryDate);
      const expiryMs = expirySeconds ? expirySeconds * 1000 : null;
      const bufferMs = 5 * 60 * 1000;

      // Check if token is expired and refresh if needed
      if (tokens.expired || (expiryMs && Date.now() > expiryMs - bufferMs)) {
        if (!tokens.refreshToken) {
          console.warn('🚫 Token marked expired but missing refresh token for user', userId);
          return false;
        }

        this.oauth2Client.setCredentials({
          refresh_token: tokens.refreshToken
        });

        console.log('🔄 Refreshing Gmail access token for user', userId);
        const { credentials } = await this.oauth2Client.refreshAccessToken();
        console.log('✅ Refresh successful for user', userId, {
          hasAccessToken: !!credentials.access_token,
          hasExpiry: !!credentials.expiry_date,
        });

        // Update stored tokens
        if (!credentials.access_token) {
          throw new Error('Failed to refresh Gmail access token');
        }

        await convex.mutation(api.connections.updateGmailTokens, {
          userId,
          accessToken: credentials.access_token,
          expiryDate: this.normalizeExpiry(credentials.expiry_date || Date.now() + 3600000) || Math.floor((Date.now() + 3600000) / 1000),
        });

        this.tokenCache.set(userId, {
          email: tokens.email,
          accessToken: credentials.access_token,
          refreshToken: tokens.refreshToken,
          tokenType: tokens.tokenType,
          expiryDate: this.normalizeExpiry(credentials.expiry_date || Date.now() + 3600000) || Math.floor((Date.now() + 3600000) / 1000),
        });

        this.oauth2Client.setCredentials(credentials);
      } else {
        if (!tokens.accessToken) {
          console.warn('🚫 Token has no access token even though not expired for user', userId);
          return false;
        }

        this.oauth2Client.setCredentials({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        });

        this.tokenCache.set(userId, {
          email: tokens.email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenType: tokens.tokenType,
          expiryDate: expirySeconds ?? undefined,
        });
      }

      console.log('✅ Gmail authentication successful for user', userId);
      return true;
    } catch (error: any) {
      console.error('Gmail authentication error:', error);

      // If we get invalid_client, the OAuth credentials changed - delete the Gmail connection by id
      if (error?.message?.includes('invalid_client') || error?.code === 401) {
        console.log('🔥 OAuth credentials invalid - deleting stored connection for re-auth');
        try {
          const connections = await convex.query(api.connections.getConnections, { userId, type: 'gmail' as any });
          const gmailConn = Array.isArray(connections) ? connections.find((c: any) => c.type === 'gmail') : null;
          if (gmailConn?._id) {
            await convex.mutation(api.connections.deleteConnection, {
              connectionId: gmailConn._id,
              userId,
            });
            this.tokenCache.delete(userId);
          }
        } catch (deleteError) {
          console.error('Failed to delete invalid connection:', deleteError);
        }
      }

      return false;
    }
  }

  async getRecentEmails(userId: string, maxResults: number = 10): Promise<any[]> {
    try {
      const isAuthenticated = await this.authenticateUser(userId);
      if (!isAuthenticated) {
        console.warn('Gmail not authenticated for user', userId);
        return [];
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
    } catch (error: any) {
      console.error('Error fetching recent emails:', error);

      if (error?.message?.includes('invalid_client')) {
        throw new Error('Gmail authentication expired. Please reconnect your Gmail account.');
      } else if (error?.message?.includes('insufficient_scope')) {
        throw new Error('Gmail permissions insufficient. Please reconnect your Gmail account with proper permissions.');
      } else if (error?.message?.includes('Gmail not authenticated')) {
        throw new Error('Gmail not authenticated. Please reconnect your Gmail account.');
      } else {
        throw new Error(`Failed to retrieve emails: ${error?.message || 'Unknown error'}`);
      }
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
