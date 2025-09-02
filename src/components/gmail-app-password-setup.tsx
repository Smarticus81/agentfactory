'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Shield, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface GmailSetupProps {
  onConnectionSuccess: (email: string) => void;
}

export default function GmailAppPasswordSetup({ onConnectionSuccess }: GmailSetupProps) {
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!email || !appPassword) {
      setError('Please enter both email and app password');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/gmail/app-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          appPassword,
          testConnection: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Successfully connected ${email}!`);
        onConnectionSuccess(email);
      } else {
        setError(data.error || 'Failed to connect Gmail');
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
          Simple setup using Gmail App Password - no complex OAuth required!
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Step-by-step instructions */}
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <Shield className="w-4 h-4" />
          <AlertDescription className="text-sm">
            <strong>Quick Setup (2 minutes):</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Go to your <a href="https://myaccount.google.com/apppasswords" target="_blank" className="text-blue-600 underline">Google Account App Passwords</a></li>
              <li>Generate a new app password for "Mail"</li>
              <li>Copy the 16-character password and paste it below</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Email input */}
        <div className="space-y-2">
          <Label htmlFor="email">Your Gmail Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isConnecting}
          />
        </div>

        {/* App password input */}
        <div className="space-y-2">
          <Label htmlFor="appPassword">Gmail App Password</Label>
          <div className="relative">
            <Input
              id="appPassword"
              type={showPassword ? "text" : "password"}
              placeholder="xxxx xxxx xxxx xxxx"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              disabled={isConnecting}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            This is the 16-character password from Google, not your regular Gmail password
          </p>
        </div>

        {/* Error/Success messages */}
        {error && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-red-700 dark:text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
            <CheckCircle className="w-4 h-4" />
            <AlertDescription className="text-green-700 dark:text-green-400">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Connect button */}
        <Button 
          onClick={handleConnect}
          disabled={isConnecting || !email || !appPassword}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isConnecting ? 'Connecting...' : 'Connect Gmail'}
        </Button>

        {/* Security note */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
            <Shield className="w-4 h-4 mr-2 text-green-500" />
            Security & Privacy
          </h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <li>• App passwords are safer than using your main password</li>
            <li>• Your credentials are encrypted and stored securely</li>
            <li>• You can revoke access anytime from your Google account</li>
            <li>• We never see or store your main Gmail password</li>
          </ul>
        </div>

        {/* Quick help */}
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Need help? Click here for troubleshooting
          </summary>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p><strong>Can't find App Passwords?</strong> Make sure 2-Step Verification is enabled on your Google account first.</p>
            <p><strong>Invalid password?</strong> Copy the password exactly as shown, including spaces.</p>
            <p><strong>Still having issues?</strong> Try generating a new app password and use that instead.</p>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
