import { NextResponse } from 'next/server';

export async function GET() {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Gmail Setup - Agent Factory</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                line-height: 1.6;
                color: #333;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 900px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
            }
            
            .header p {
                font-size: 1.1rem;
                opacity: 0.9;
            }
            
            .content {
                padding: 40px;
            }
            
            .step {
                margin: 30px 0;
                padding: 25px;
                border-left: 4px solid #667eea;
                background: #f8f9fa;
                border-radius: 8px;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            .step:hover {
                transform: translateX(5px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
            }
            
            .step h3 {
                color: #667eea;
                margin-bottom: 15px;
                font-size: 1.3rem;
            }
            
            .step p {
                margin: 10px 0;
                color: #555;
            }
            
            .step ol {
                margin-left: 20px;
                margin-top: 10px;
            }
            
            .step li {
                margin: 8px 0;
            }
            
            code {
                background: #2d3748;
                color: #68d391;
                padding: 3px 8px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
            }
            
            .warning {
                background: #fff3cd;
                border-left-color: #ffc107;
                border: 1px solid #ffc107;
            }
            
            .success {
                background: #d4edda;
                border-left-color: #28a745;
                border: 1px solid #28a745;
            }
            
            .info {
                background: #d1ecf1;
                border-left-color: #17a2b8;
                border: 1px solid #17a2b8;
            }
            
            a {
                color: #667eea;
                text-decoration: none;
                font-weight: 600;
            }
            
            a:hover {
                text-decoration: underline;
            }
            
            .btn {
                display: inline-block;
                padding: 12px 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
                transition: transform 0.2s, box-shadow 0.2s;
                margin-top: 20px;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                text-decoration: none;
            }
            
            .footer {
                text-align: center;
                padding: 30px;
                background: #f8f9fa;
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📧 Gmail Setup Guide</h1>
                <p>Connect your Gmail account to enable email features in your AI agents</p>
            </div>
            
            <div class="content">
                <div class="step info">
                    <h3>📋 Prerequisites</h3>
                    <p>Before you begin, make sure you have:</p>
                    <ul>
                        <li>A Google account</li>
                        <li>Access to <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>
                        <li>Admin access to your project's environment variables</li>
                    </ul>
                </div>

                <div class="step">
                    <h3>Step 1: Create Google Cloud Project</h3>
                    <ol>
                        <li>Go to <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>
                        <li>Click on the project dropdown at the top</li>
                        <li>Click "New Project"</li>
                        <li>Enter a project name (e.g., "Agent Factory Gmail")</li>
                        <li>Click "Create"</li>
                    </ol>
                </div>

                <div class="step">
                    <h3>Step 2: Enable Gmail API</h3>
                    <ol>
                        <li>In the Google Cloud Console, select your project</li>
                        <li>Go to "APIs & Services" → "Library"</li>
                        <li>Search for "Gmail API"</li>
                        <li>Click on it and press "Enable"</li>
                    </ol>
                </div>

                <div class="step">
                    <h3>Step 3: Configure OAuth Consent Screen</h3>
                    <ol>
                        <li>Go to "APIs & Services" → "OAuth consent screen"</li>
                        <li>Choose "External" user type and click "Create"</li>
                        <li>Fill in the required information:
                            <ul>
                                <li><strong>App name:</strong> Your app name</li>
                                <li><strong>User support email:</strong> Your email</li>
                                <li><strong>Developer contact:</strong> Your email</li>
                            </ul>
                        </li>
                        <li>Click "Save and Continue"</li>
                        <li>On the "Scopes" page, click "Add or Remove Scopes"</li>
                        <li>Add these scopes:
                            <ul>
                                <li><code>https://www.googleapis.com/auth/gmail.readonly</code></li>
                                <li><code>https://www.googleapis.com/auth/gmail.send</code></li>
                                <li><code>https://www.googleapis.com/auth/gmail.compose</code></li>
                                <li><code>https://www.googleapis.com/auth/userinfo.email</code></li>
                            </ul>
                        </li>
                        <li>Click "Save and Continue"</li>
                        <li>Add your email to "Test users" if in testing mode</li>
                        <li>Click "Save and Continue"</li>
                    </ol>
                </div>

                <div class="step">
                    <h3>Step 4: Create OAuth 2.0 Credentials</h3>
                    <ol>
                        <li>Go to "APIs & Services" → "Credentials"</li>
                        <li>Click "Create Credentials" → "OAuth client ID"</li>
                        <li>Choose "Web application" as the application type</li>
                        <li>Enter a name (e.g., "Agent Factory Web Client")</li>
                        <li>Under "Authorized redirect URIs", add:
                            <ul>
                                <li><code>http://localhost:3000/api/gmail/callback</code> (for development)</li>
                                <li><code>https://yourdomain.com/api/gmail/callback</code> (for production)</li>
                            </ul>
                        </li>
                        <li>Click "Create"</li>
                        <li>A dialog will appear with your Client ID and Client Secret</li>
                        <li><strong>⚠️ Important:</strong> Copy both values immediately!</li>
                    </ol>
                </div>

                <div class="step warning">
                    <h3>⚠️ Step 5: Update Environment Variables</h3>
                    <p>Add these to your <code>.env</code> or <code>.env.local</code> file:</p>
                    <pre style="background: #2d3748; color: #68d391; padding: 15px; border-radius: 6px; overflow-x: auto; margin-top: 10px;">
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here</pre>
                    <p style="margin-top: 15px;"><strong>Important:</strong> Never commit these values to version control!</p>
                </div>

                <div class="step">
                    <h3>Step 6: Restart Your Development Server</h3>
                    <ol>
                        <li>Stop your development server (Ctrl+C or Cmd+C)</li>
                        <li>Start it again with <code>npm run dev</code></li>
                        <li>The new environment variables will be loaded</li>
                    </ol>
                </div>

                <div class="step success">
                    <h3>✅ Step 7: Test the Connection</h3>
                    <ol>
                        <li>Go back to your application</li>
                        <li>Navigate to the Integrations or Settings page</li>
                        <li>Click "Connect Gmail" or "Setup Gmail"</li>
                        <li>You should be redirected to Google's OAuth consent screen</li>
                        <li>Grant the requested permissions</li>
                        <li>You'll be redirected back to your app with a success message</li>
                    </ol>
                </div>

                <div class="step info">
                    <h3>🔧 Troubleshooting</h3>
                    <p><strong>Error: "invalid_client"</strong></p>
                    <ul>
                        <li>Double-check that your Client ID and Client Secret match exactly</li>
                        <li>Ensure there are no extra spaces or quotes in your .env file</li>
                        <li>Verify the redirect URI in Google Cloud Console matches your app's URL</li>
                        <li>Try regenerating the Client Secret in Google Cloud Console</li>
                    </ul>
                    <p style="margin-top: 15px;"><strong>Error: "redirect_uri_mismatch"</strong></p>
                    <ul>
                        <li>Make sure the redirect URI in Google Cloud Console exactly matches your app's callback URL</li>
                        <li>Check for http vs https differences</li>
                        <li>Ensure there are no trailing slashes</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>Need help? Check the <a href="https://developers.google.com/gmail/api/guides" target="_blank">Gmail API Documentation</a></p>
                <a href="/dashboard" class="btn">Return to Dashboard</a>
            </div>
        </div>
    </body>
    </html>
  `;

    return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
    });
}
