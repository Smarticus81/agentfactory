import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import nodemailer from 'nodemailer';

// This uses a service like SendGrid, Mailgun, or AWS SES
// Users just provide their email - no passwords needed!
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g., smtp.sendgrid.net
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER, // Your SendGrid/Mailgun username
    pass: process.env.SMTP_PASS  // Your SendGrid/Mailgun password
  }
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, message, userEmail } = await request.json();

    if (!to || !subject || !message || !userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send email using your SMTP service
    // Email appears to come from your service but replies go to user
    const mailOptions = {
      from: `"${userEmail}" <noreply@yourdomain.com>`, // From your domain
      to: to,
      subject: subject,
      text: message,
      replyTo: userEmail, // Replies go to the actual user
      headers: {
        'X-Sender': userEmail,
        'X-User-ID': userId
      }
    };

    const result = await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true, 
      messageId: result.messageId,
      message: `Email sent successfully from ${userEmail}`
    });
  } catch (error) {
    console.error('SMTP send error:', error);
    return NextResponse.json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
