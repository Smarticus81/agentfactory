import { NextResponse } from 'next/server';

export async function GET() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const diagnostics = {
        timestamp: new Date().toISOString(),
        credentials: {
            clientId: {
                exists: !!clientId,
                length: clientId?.length || 0,
                prefix: clientId ? clientId.substring(0, 20) + '...' : 'NOT SET',
                endsWithGoogleusercontent: clientId?.endsWith('.apps.googleusercontent.com') || false,
            },
            clientSecret: {
                exists: !!clientSecret,
                length: clientSecret?.length || 0,
                prefix: clientSecret ? clientSecret.substring(0, 10) + '...' : 'NOT SET',
                looksValid: clientSecret ? clientSecret.length > 20 : false,
            },
        },
        environment: {
            nodeEnv: process.env.NODE_ENV,
            hasEnvFile: process.env.NEXT_PUBLIC_CONVEX_URL ? true : false,
        },
        recommendations: [] as string[],
    };

    // Add recommendations based on diagnostics
    if (!clientId) {
        diagnostics.recommendations.push('❌ GOOGLE_CLIENT_ID is not set. Add it to your .env file.');
    } else if (!clientId.endsWith('.apps.googleusercontent.com')) {
        diagnostics.recommendations.push('⚠️ GOOGLE_CLIENT_ID format looks incorrect. It should end with .apps.googleusercontent.com');
    }

    if (!clientSecret) {
        diagnostics.recommendations.push('❌ GOOGLE_CLIENT_SECRET is not set. Add it to your .env file.');
    } else if (clientSecret.length < 20) {
        diagnostics.recommendations.push('⚠️ GOOGLE_CLIENT_SECRET looks too short. Make sure you copied the full secret from Google Cloud Console.');
    }

    if (clientId && clientSecret && diagnostics.recommendations.length === 0) {
        diagnostics.recommendations.push('✅ Credentials look good! If you\'re still getting errors, verify they match exactly in Google Cloud Console.');
        diagnostics.recommendations.push('💡 Make sure the redirect URI is set to: http://localhost:3000/api/gmail/callback');
    }

    return NextResponse.json(diagnostics, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
