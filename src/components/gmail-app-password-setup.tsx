'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Shield, AlertCircle } from 'lucide-react';

interface GmailSetupProps {
  onConnectionSuccess: (email: string) => void;
}

export default function GmailOAuthSetup({ onConnectionSuccess }: GmailSetupProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Use OAuth flow instead of app password
      const response = await fetch('/api/gmail/auth', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Failed to initiate Gmail connection');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="w-5 h-5 text-orange-500" />
          <span>Connect Your Gmail</span>
        </CardTitle>
        <CardDescription>
          Connect your Gmail account securely using Google OAuth
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* OAuth setup instructions */}
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <Shield className="w-4 h-4" />
          <AlertDescription className="text-sm">
            <strong>Secure OAuth Setup:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Click "Connect Gmail" to open Google's secure authorization</li>
              <li>Sign in to your Google account and grant permissions</li>
              <li>You'll be redirected back automatically once connected</li>
              <li>Your credentials are stored securely and encrypted</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Error/Success messages */}
        {error && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-red-700 dark:text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}


        {/* Connect button */}
        <Button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isConnecting ? 'Redirecting to Google...' : 'Connect Gmail'}
        </Button>

        {/* Security note */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
            <Shield className="w-4 h-4 mr-2 text-green-500" />
            Security & Privacy
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• OAuth is the most secure way to connect your Gmail</li>
            <li>• Your credentials are encrypted and stored securely</li>
            <li>• You can revoke access anytime from your Google account</li>
            <li>• We only access the permissions you explicitly grant</li>
            <li>• No passwords are stored on our servers</li>
          </ul>
        </div>

        {/* Quick help */}
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Need help? Click here for troubleshooting
          </summary>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p><strong>Authorization failed?</strong> Make sure you're signed in to the correct Google account.</p>
            <p><strong>Permission denied?</strong> You can grant permissions and try again.</p>
            <p><strong>Still having issues?</strong> Try clearing your browser cache and cookies for this site.</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
