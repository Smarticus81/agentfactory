import { NextRequest, NextResponse } from 'next/server';
import { convex } from '@/lib/convex';
import { api } from '../../../../../convex/_generated/api';
import { GmailService } from '@/lib/gmail-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, to, subject, body: emailBody, cc, bcc, agentId } = body;

    if (!userId || !to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, to, subject, body' },
        { status: 400 }
      );
    }

    // Get user's Gmail connection
    const connections = await convex.query(api.connections.getConnections, {
      userId,
      type: 'gmail',
    });

    if (!connections || connections.length === 0) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Gmail account first.' },
        { status: 400 }
      );
    }

    const connection = connections[0];

    // Initialize Gmail service
    const gmailService = new GmailService(userId, convex);

    // Send email
    const result = await gmailService.sendEmail(to, subject, emailBody, cc, bcc);

    // Store email in database
    await convex.mutation(api.gmail.sendEmail, {
      userId,
      to,
      subject,
      body: emailBody,
      cc,
      bcc,
      agentId,
    });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      threadId: result.threadId,
      message: `Email sent to ${to}`,
    });

  } catch (error) {
    console.error('Gmail send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const analyze = searchParams.get('analyze') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get user's Gmail connection
    const connections = await convex.query(api.connections.getConnections, {
      userId,
      type: 'gmail',
    });

    if (!connections || connections.length === 0) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Gmail account first.' },
        { status: 400 }
      );
    }

    const connection = connections[0];

    // Initialize Gmail service
    const gmailService = new GmailService(userId, convex);

    // Get recent emails
    const emails = await gmailService.getRecentEmails(limit);

    // Analyze emails if requested
    let analyzedEmails = emails;
    if (analyze) {
      analyzedEmails = [];
      for (const email of emails) {
        const analysis = await gmailService.analyzeEmailContent(email);
        analyzedEmails.push({
          ...email,
          analysis,
        });
      }
    }

    return NextResponse.json({
      success: true,
      emails: analyzedEmails,
    });

  } catch (error) {
    console.error('Gmail fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
