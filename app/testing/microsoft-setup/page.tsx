import { getAzureADVerificationChecklist, getMicrosoftOAuthSetupInstructions } from '@/lib/microsoft-oauth-status';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

export default function MicrosoftSetupPage() {
  const setupInstructions = getMicrosoftOAuthSetupInstructions();
  const azureChecklist = getAzureADVerificationChecklist();
  
  const envCheck = {
    clientId: !!process.env.MICROSOFT_CLIENT_ID,
    clientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
    tenantId: !!process.env.MICROSOFT_CLIENT_TENANT_ID
  };
  
  const allEnvConfigured = envCheck.clientId && envCheck.clientSecret && envCheck.tenantId;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Microsoft OAuth Setup Guide</h1>
        <p className="text-gray-600">
          Complete setup and verification guide for Microsoft OAuth integration with Clerk
        </p>
      </div>

      {/* Environment Variables Check */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {allEnvConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            Environment Variables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">MICROSOFT_CLIENT_ID</span>
              <Badge variant={envCheck.clientId ? 'default' : 'destructive'}>
                {envCheck.clientId ? '✅ Set' : '❌ Missing'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">MICROSOFT_CLIENT_SECRET</span>
              <Badge variant={envCheck.clientSecret ? 'default' : 'destructive'}>
                {envCheck.clientSecret ? '✅ Set' : '❌ Missing'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">MICROSOFT_CLIENT_TENANT_ID</span>
              <Badge variant={envCheck.tenantId ? 'default' : 'destructive'}>
                {envCheck.tenantId ? '✅ Set' : '❌ Missing'}
              </Badge>
            </div>
            
            {!allEnvConfigured && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Missing environment variables!</strong> Add these to your <code>.env.local</code> file:
                </p>
                <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded overflow-x-auto">
{`MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret  
MICROSOFT_CLIENT_TENANT_ID=your-tenant-id`}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Quick Access Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <a 
              href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Azure AD App Registrations</span>
            </a>
            
            <a 
              href="https://dashboard.clerk.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Clerk Dashboard</span>
            </a>
            
            <a 
              href="/testing/microsoft-diagnostic" 
              className="flex items-center gap-2 p-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Run Diagnostic Test</span>
            </a>
            
            {process.env.MICROSOFT_CLIENT_ID && (
              <div className="p-3 bg-white border border-blue-300 rounded-lg">
                <div className="text-sm text-blue-700">
                  <strong>Your Client ID:</strong>
                </div>
                <code className="text-xs font-mono bg-blue-100 px-1 py-0.5 rounded">
                  {process.env.MICROSOFT_CLIENT_ID}
                </code>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Complete Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {setupInstructions.map((instruction, index) => (
              <div key={index}>
                {instruction === '' ? (
                  <div className="h-2" />
                ) : instruction.startsWith('📋') ? (
                  <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">{instruction}</h3>
                ) : instruction.match(/^\d+\./) ? (
                  <h4 className="font-medium text-gray-700 mt-3 mb-1">{instruction}</h4>
                ) : (
                  <p className={`${instruction.startsWith('   •') || instruction.startsWith('     -') ? 'ml-4 text-gray-600' : 'text-gray-700'}`}>
                    {instruction}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Azure AD Verification */}
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">Azure AD Verification Checklist</CardTitle>
          <p className="text-sm text-orange-700">
            Use this checklist to verify your Azure AD app registration is configured correctly
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {azureChecklist.map((item, index) => (
              <div key={index}>
                {item === '' ? (
                  <div className="h-2" />
                ) : item.startsWith('🔍') ? (
                  <h3 className="text-lg font-semibold text-orange-800 mt-4 mb-2">{item}</h3>
                ) : item.match(/^\d+\./) ? (
                  <h4 className="font-medium text-orange-700 mt-3 mb-1">{item}</h4>
                ) : (
                  <p className={`${item.startsWith('   •') || item.startsWith('     ') ? 'ml-4 text-orange-600' : 'text-orange-700'}`}>
                    {item}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Common Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="text-red-800">Common Issues & Solutions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold text-red-800">"oauth_token_retrieval_error"</h4>
              <p className="text-red-700 mb-2">This error typically means:</p>
              <ul className="list-disc list-inside ml-4 text-red-600 space-y-1">
                <li>OAuth scopes are insufficient in Clerk configuration</li>
                <li>Microsoft app permissions are not granted or admin-consented</li>
                <li>User needs to disconnect and reconnect their Microsoft account</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-yellow-500 pl-4">
              <h4 className="font-semibold text-yellow-800">"insufficient_scope" or "unauthorized_client"</h4>
              <p className="text-yellow-700 mb-2">Check these settings:</p>
              <ul className="list-disc list-inside ml-4 text-yellow-600 space-y-1">
                <li>Ensure API permissions include User.Read and OnlineMeetings.ReadWrite</li>
                <li>Verify admin consent is granted for the permissions</li>
                <li>Check that the client secret hasn't expired</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-blue-800">"invalid_redirect_uri"</h4>
              <p className="text-blue-700 mb-2">Verify redirect URI configuration:</p>
              <ul className="list-disc list-inside ml-4 text-blue-600 space-y-1">
                <li>Check Azure AD Authentication tab has correct Clerk redirect URI</li>
                <li>Ensure the URI exactly matches what Clerk provides</li>
                <li>Verify platform is set to "Web"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}