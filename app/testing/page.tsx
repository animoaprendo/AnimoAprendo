import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Settings, ExternalLink } from 'lucide-react';

export default function TestingIndexPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Microsoft OAuth Testing & Setup</h1>
        <p className="text-gray-600">
          Tools and guides for diagnosing and configuring Microsoft OAuth integration
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        
        {/* Diagnostic Tool */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              OAuth Diagnostic Tool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-700 mb-4">
              Run comprehensive diagnostics to identify OAuth token issues and get specific troubleshooting guidance.
            </p>
            <div className="flex gap-3">
              <Link
                href="/testing/microsoft-diagnostic"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                Run Diagnostic
              </Link>
              <Badge variant="secondary">Recommended First Step</Badge>
            </div>
            <div className="mt-3 text-xs text-green-600">
              ✓ Checks Clerk authentication<br/>
              ✓ Verifies Microsoft account connection<br/>
              ✓ Tests OAuth token retrieval<br/>
              ✓ Provides specific error analysis
            </div>
          </CardContent>
        </Card>

        {/* Setup Guide */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Settings className="h-5 w-5" />
              Complete Setup Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700 mb-4">
              Comprehensive setup instructions, environment variable checks, and Azure AD verification checklists.
            </p>
            <div className="flex gap-3">
              <Link
                href="/testing/microsoft-setup"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Settings className="h-4 w-4" />
                Setup Guide
              </Link>
              <Badge variant="secondary">For Initial Configuration</Badge>
            </div>
            <div className="mt-3 text-xs text-blue-600">
              ✓ Environment variables verification<br/>
              ✓ Azure AD app registration checklist<br/>
              ✓ Clerk configuration steps<br/>
              ✓ Common issues & solutions
            </div>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Current Issue Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">OAuth Token Retrieval Error</Badge>
                <span className="text-orange-700">Active Issue</span>
              </div>
              
              <p className="text-orange-700">
                <strong>Error:</strong> <code>oauth_token_retrieval_error</code> - Token retrieval failed from OAuth provider
              </p>
              
              <div className="bg-white p-3 rounded border border-orange-200">
                <p className="font-medium text-orange-800 mb-2">Most Likely Causes:</p>
                <ul className="text-orange-700 text-xs space-y-1">
                  <li>• OAuth tokens expired or insufficient scopes</li>
                  <li>• Microsoft app registration missing API permissions</li>
                  <li>• Admin consent not granted in Azure AD</li>
                  <li>• User needs to disconnect/reconnect Microsoft account</li>
                </ul>
              </div>
              
              <div className="flex gap-2">
                <Link
                  href="/testing/microsoft-diagnostic"
                  className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors"
                >
                  Diagnose Issue
                </Link>
                <Link
                  href="/testing/microsoft-setup"
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  Check Setup
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <a 
                href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4 text-blue-600" />
                <span>Azure AD App Registrations</span>
              </a>
              
              <a 
                href="https://dashboard.clerk.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4 text-purple-600" />
                <span>Clerk Dashboard</span>
              </a>
              
              <Link
                href="/components/MicrosoftAccountConnection"
                className="flex items-center gap-2 p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
              >
                <Settings className="h-4 w-4 text-green-600" />
                <span>Test Account Connection</span>
              </Link>
              
              <Link
                href="/tutor/dashboard"
                className="flex items-center gap-2 p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
              >
                <CheckCircle className="h-4 w-4 text-indigo-600" />
                <span>Return to Tutor Dashboard</span>
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}