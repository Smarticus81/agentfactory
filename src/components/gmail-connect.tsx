"use client";

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';

export default function GmailConnect() {
  const { user } = useUser();
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleConnect = async () => {
    if (!user?.id) {
      setStatus('User not authenticated');
      return;
    }

    setIsConnecting(true);
    setStatus('Initiating OAuth flow...');

    try {
      // Redirect to OAuth initiation endpoint
      window.location.href = `/api/auth/google?userId=${user.id}`;
    } catch (error) {
      console.error('Connection error:', error);
      setStatus('Failed to initiate connection');
      setIsConnecting(false);
    }
  };

  const handleTestEmail = async () => {
    if (!user?.id) {
      setStatus('User not authenticated');
      return;
    }

    setStatus('Testing email functionality...');

    try {
      const response = await fetch('/api/gmail/send', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(`Success: Retrieved ${data.emails?.length || 0} emails`);
      } else {
        const error = await response.json();
        setStatus(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Test error:', error);
      setStatus('Failed to test email functionality');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Gmail Integration</h2>

      <div className="space-y-4">
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect Gmail'}
        </button>

        <button
          onClick={handleTestEmail}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
        >
          Test Email Access
        </button>

        {status && (
          <div className="p-3 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-700">{status}</p>
          </div>
        )}
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p><strong>Setup Required:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>GOOGLE_CLIENT_ID environment variable</li>
          <li>GOOGLE_CLIENT_SECRET environment variable</li>
          <li>Configure OAuth consent screen in Google Cloud Console</li>
          <li>Add redirect URI: {process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback</li>
        </ul>
      </div>
    </div>
  );
}
