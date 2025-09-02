import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  console.log('Gmail app password API called');
  
  try {
    const { userId } = auth();
    console.log('User ID:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body received:', { ...body, appPassword: '***hidden***' });
    
    const { email, appPassword, testConnection } = body;

    if (!email || !appPassword) {
      console.log('Missing required fields:', { email: !!email, appPassword: !!appPassword });
      return NextResponse.json({ error: 'Email and app password required' }, { status: 400 });
    }

    console.log('Creating nodemailer transporter...');
    
    // Create transporter with user's Gmail app password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: appPassword
      }
    });

    console.log('Transporter created successfully');

    if (testConnection) {
      console.log('Testing connection...');
      
      // Test the connection
      try {
        await transporter.verify();
        console.log('Gmail connection verified successfully');
        
        // Store credentials securely (encrypted)
        // TODO: Implement secure storage in Convex
        
        return NextResponse.json({ 
          success: true, 
          message: 'Gmail connected successfully!',
          email: email
        });
      } catch (verifyError) {
        console.error('Gmail verification failed:', verifyError);
        return NextResponse.json({ 
          error: 'Failed to connect to Gmail. Please check your email and app password.',
          details: verifyError instanceof Error ? verifyError.message : 'Unknown error'
        }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Gmail app password setup error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
