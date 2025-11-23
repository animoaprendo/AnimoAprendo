"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, Loader2 } from "lucide-react";

function AuthSuccessContent() {
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = searchParams.get('access_token') || "";
    const expires = searchParams.get('expires_at') || "";
    
    setAccessToken(token);
    setExpiresAt(expires);
  }, [searchParams]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accessToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const expirationDate = expiresAt ? new Date(parseInt(expiresAt) * 1000).toLocaleString() : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-green-900 flex items-center justify-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Microsoft Authentication Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              You've successfully connected your Microsoft account. You can now create Teams meetings.
            </p>
          </div>

          {accessToken && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Access Token (expires: {expirationDate})
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-gray-100 rounded-md font-mono text-xs break-all">
                    {accessToken.substring(0, 50)}...
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                  <li>Copy the access token above</li>
                  <li>Use it in your Teams meeting creation calls</li>
                  <li>Store it securely (expires in ~1 hour)</li>
                  <li>Implement token refresh for production use</li>
                </ol>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Security Notice:</h3>
                <p className="text-sm text-yellow-800">
                  This is a demo implementation. In production, store tokens securely in your database, 
                  not in URL parameters. Implement proper session management and token refresh.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => window.location.href = '/tutor/dashboard'}
              className="bg-green-600 hover:bg-green-700"
            >
              Go to Dashboard
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/auth/microsoft'}
            >
              Re-authenticate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-green-900 flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
            Loading Authentication Result...
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-gray-600">
            Processing your Microsoft authentication...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthSuccessContent />
    </Suspense>
  );
}