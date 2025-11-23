// Microsoft OAuth diagnostic page
import { runMicrosoftOAuthDiagnostic } from '@/app/actions/microsoft-diagnostic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react';

export default async function MicrosoftDiagnosticPage() {
  const diagnosticResults = await runMicrosoftOAuthDiagnostic();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">
                M
              </div>
              Microsoft OAuth Diagnostic Report
            </CardTitle>
            <p className="text-gray-600">
              This report helps identify issues with Microsoft OAuth integration and provides
              specific recommendations for resolving them.
            </p>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          {diagnosticResults.map((result, index) => (
            <Card key={index} className="border-l-4" 
                  style={{
                    borderLeftColor: 
                      result.status === 'success' ? '#10b981' :
                      result.status === 'warning' ? '#f59e0b' : '#ef4444'
                  }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.status)}
                    <div>
                      <h3 className="font-semibold">{result.step}</h3>
                      <p className="text-sm text-gray-600">{result.message}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(result.status)}>
                    {result.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              {(result.details || result.recommendations) && (
                <CardContent className="pt-0">
                  {result.details && (
                    <div className="mb-4">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Details:</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <pre className="text-xs text-gray-600 overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                  
                  {result.recommendations && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Recommendations:</h4>
                      <div className="bg-blue-50 border-l-4 border-blue-200 p-3 rounded-md">
                        <ul className="text-sm text-gray-700 space-y-1">
                          {result.recommendations.map((rec, recIndex) => (
                            <li key={recIndex} className={rec.trim() === '' ? 'h-2' : ''}>
                              {rec.startsWith('  ') ? (
                                <span className="ml-4 text-gray-600">{rec.trim()}</span>
                              ) : rec.trim() === '' ? (
                                ''
                              ) : (
                                <span className="font-medium">{rec}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              🚨 OAuth Token Retrieval Error - Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-orange-800 mb-2">Immediate User Action</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li className="font-medium">Go to your Clerk account settings/profile</li>
                  <li className="font-medium">Find "Connected Accounts" or "Social Connections"</li>
                  <li className="font-medium text-red-600">Disconnect your Microsoft account completely</li>
                  <li className="font-medium text-green-600">Reconnect your Microsoft account</li>
                  <li className="font-medium">During reconnection, carefully grant ALL permissions when prompted</li>
                  <li>Return here and refresh to verify the fix</li>
                </ol>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Admin Configuration Check</h3>
                <p className="text-sm text-blue-700 mb-3">
                  If user reconnection doesn't work, the issue is likely in the app configuration:
                </p>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium text-blue-800">1. Clerk Dashboard Configuration:</h4>
                    <ul className="list-disc list-inside ml-4 text-blue-700 space-y-1">
                      <li>Go to Clerk Dashboard → Configure → SSO Connections</li>
                      <li>Verify Microsoft OAuth provider is configured</li>
                      <li>Ensure these scopes are included:
                        <div className="bg-blue-100 p-2 rounded mt-1 font-mono text-xs">
                          https://graph.microsoft.com/User.Read<br/>
                          https://graph.microsoft.com/OnlineMeetings.ReadWrite<br/>
                          offline_access
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-blue-800">2. Azure AD App Registration:</h4>
                    <ul className="list-disc list-inside ml-4 text-blue-700 space-y-1">
                      <li>Go to Azure AD → App Registrations → Your App</li>
                      <li>Navigate to "API Permissions"</li>
                      <li>Verify these permissions are added:
                        <div className="bg-blue-100 p-2 rounded mt-1 text-xs">
                          • Microsoft Graph → User.Read (Delegated)<br/>
                          • Microsoft Graph → OnlineMeetings.ReadWrite (Delegated)
                        </div>
                      </li>
                      <li className="font-medium text-red-600">Click "Grant admin consent" for your organization</li>
                      <li>Verify "Admin consent required" shows "Yes" and status is "Granted"</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-blue-800">3. Authentication Configuration:</h4>
                    <ul className="list-disc list-inside ml-4 text-blue-700 space-y-1">
                      <li>In Azure AD app → Authentication</li>
                      <li>Verify Clerk's redirect URI is configured</li>
                      <li>Enable "Access tokens" and "ID tokens"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Testing After Fix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>After making the above changes:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Refresh this diagnostic page</li>
                <li>"OAuth Token Retrieval" should show SUCCESS ✅</li>
                <li>Test creating a Teams meeting from the app</li>
                <li>Verify the meeting link works</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}