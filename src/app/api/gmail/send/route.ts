import { NextRequest, NextResponse } from 'next/server';
import { gmailService } from '@/lib/gmail-service';
import { convex } from '@/lib/convex';
import { api } from '../../../../../convex/_generated/api';

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

    // Check if Gmail is authenticated
    const isAuthenticated = await gmailService.isAuthenticated(userId);
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Gmail not authenticated. Please connect your Gmail account first.', setupRequired: true },
        { status: 401 }
      );
    }

    // Send email via Gmail API
    const messageId = await gmailService.sendEmail(userId, to, subject, emailBody, cc, bcc);

    // Store email record in Convex for tracking
    const result = await convex.mutation(api.gmail.sendEmail, {
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
      emailId: messageId,
      message: `Email sent successfully to ${to}`,
    });

  } catch (error) {
    console.error('Gmail send error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}

