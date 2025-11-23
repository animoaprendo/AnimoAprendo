'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, ExternalLink, Info } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { checkMicrosoftOAuthServerAction, type MicrosoftOAuthResult } from '@/app/actions/microsoft-oauth';

interface MicrosoftConnectionStatus {
  connected: boolean;
  email?: string;
  error?: string;
  guidance?: string[];
  debug?: any;
  needsReauth?: boolean;
  needsConnection?: boolean;
}

export default function MicrosoftAccountConnection() {
  const { user } = useUser();
  const [status, setStatus] = useState<MicrosoftConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(false);

  const checkConnectionStatus = async () => {
    try {
      // Use server action to avoid API route issues
      const result = await checkMicrosoftOAuthServerAction();
      
      setStatus({ 
        connected: result.hasConnection,
        error: result.error,
        guidance: result.guidance,
        debug: result.debug,
        needsReauth: result.needsReauth || false,
        needsConnection: !result.hasConnection && !result.needsReauth
      });
    } catch (error: any) {
      console.error('Error checking Microsoft OAuth status:', error);
      setStatus({ 
        connected: false, 
        error: 'Failed to check connection status',
        guidance: [
          'Error occurred while checking Microsoft connection',
          'This may be a server issue',
          'Try refreshing the page or contact support if this persists'
        ],
        needsConnection: true
      });
    }
  };

  const connectMicrosoft = async () => {
    setLoading(true);
    try {
      let message = '';
      
      if (status.needsReauth) {
        message = `Microsoft OAuth connection needs refresh.\n\nSteps:\n1. Go to your Clerk account settings\n2. Disconnect your Microsoft account\n3. Reconnect your Microsoft account\n4. Grant all requested permissions\n\nThis will generate fresh OAuth tokens.`;
      } else if (status.needsConnection) {
        message = `Microsoft account needs to be connected.\n\nSteps:\n1. Go to your Clerk account settings\n2. Add Microsoft as a connected account\n3. Complete the OAuth flow\n4. Grant required permissions:\n   • User.Read\n   • OnlineMeetings.ReadWrite`;
      } else {
        message = `Microsoft OAuth needs to be set up.\n\nSteps:\n1. Configure Microsoft OAuth in Clerk Dashboard\n2. Add required scopes and permissions\n3. Connect your Microsoft account\n4. Test the integration`;
      }
      
      alert(message);
      
      // Refresh status after showing the message
      setTimeout(() => {
        checkConnectionStatus();
      }, 1000);
    } catch (error) {
      console.error('Error connecting to Microsoft:', error);
      setStatus(prev => ({ ...prev, error: 'Failed to initiate connection' }));
    } finally {
      setLoading(false);
    }
  };

  const disconnectMicrosoft = async () => {
    setLoading(true);
    try {
      // For Clerk OAuth, disconnection should be done through Clerk's UI
      // You can redirect users to their account management page
      alert('To disconnect your Microsoft account, please go to your account settings and remove the Microsoft connection.');
      setStatus({ connected: false });
    } catch (error) {
      console.error('Error disconnecting Microsoft:', error);
      setStatus({ connected: true, error: 'Failed to disconnect' });
    } finally {
      setLoading(false);
    }
  };

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
            M
          </div>
          Microsoft Teams Integration
        </CardTitle>
        <CardDescription>
          Connect your Microsoft account to create Teams meetings for tutoring sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Connected to Microsoft</span>
            </div>
            {status.email && (
              <p className="text-sm text-gray-600">Account: {status.email}</p>
            )}
            <Button 
              variant="outline" 
              onClick={disconnectMicrosoft}
              disabled={loading}
              className="w-full"
            >
              Disconnect Microsoft Account
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-500">
              <AlertCircle className="w-5 h-5" />
              <span>Microsoft account not connected</span>
            </div>
            {status.error && (
              <div className="space-y-2">
                <p className="text-sm text-red-600">{status.error}</p>
                {status.guidance && status.guidance.length > 0 && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-blue-900">Setup Required:</p>
                        <ul className="text-xs text-blue-800 space-y-1">
                          {status.guidance.map((item, index) => (
                            <li key={index} className="list-disc list-inside">{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
                {status.debug && process.env.NODE_ENV === 'development' && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600">Debug Info</summary>
                    <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(status.debug, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
            <Button 
              onClick={connectMicrosoft}
              disabled={loading}
              className={`w-full ${
                status.needsReauth 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {status.needsReauth 
                ? 'Reconnect Microsoft Account'
                : status.needsConnection
                ? 'Connect Microsoft Account'
                : 'Set Up Microsoft Account'
              }
            </Button>
            <p className="text-xs text-gray-500">
              This will allow the app to create Teams meetings on your behalf when appointments are scheduled.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}