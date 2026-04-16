import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForRefreshToken } from '@/lib/google-admin-oauth';

/**
 * Handles Google OAuth callback
 * Exchanges authorization code for refresh token and displays it to user
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.error('[GoogleAdminCallback] OAuth error:', error);
    const errorDescription = searchParams.get('error_description') || 'Unknown error';
    
    return NextResponse.json(
      {
        error: 'Google OAuth Error',
        details: `${error}: ${errorDescription}`,
      },
      { status: 400 }
    );
  }

  if (!code) {
    console.error('[GoogleAdminCallback] Missing authorization code');
    return NextResponse.json(
      {
        error: 'Missing authorization code',
      },
      { status: 400 }
    );
  }

  try {
    console.log('[GoogleAdminCallback] Exchanging code for refresh token...');
    const refreshToken = await exchangeCodeForRefreshToken(code);
    
    console.log('[GoogleAdminCallback] Successfully obtained refresh token', {
      tokenLength: refreshToken.length,
      preview: refreshToken.substring(0, 20) + '...',
    });

    // Return HTML page with instructions
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Admin Setup - Animo Aprendo</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .success-box {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .token-box {
            background: white;
            border: 2px solid #007bff;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            word-break: break-all;
            background: #f8f9fa;
          }
          .instructions {
            background: white;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .instruction-step {
            margin: 15px 0;
            padding: 10px;
            background: #f0f0f0;
            border-left: 4px solid #007bff;
            padding-left: 15px;
          }
          code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
          }
          button:hover {
            background: #0056b3;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="success-box">
          <h2>✓ Google Authentication Successful!</h2>
          <p>Your account has been authenticated. Now you need to save the refresh token.</p>
        </div>

        <div class="instructions">
          <h3>Your Refresh Token:</h3>
          <div class="token-box" id="tokenBox">
            ${refreshToken}
          </div>
          <button onclick="copyToClipboard()">📋 Copy Token to Clipboard</button>
        </div>

        <div class="warning">
          <strong>⚠️ Important:</strong> Keep this token secure. It allows app-only access to create calendar events.
        </div>

        <div class="instructions">
          <h3>Next Steps:</h3>
          
          <div class="instruction-step">
            <strong>1. Open your .env.local file</strong> in the project root
          </div>

          <div class="instruction-step">
            <strong>2. Add or update this line:</strong><br>
            <code>GOOGLE_ADMIN_REFRESH_TOKEN="${refreshToken}"</code>
          </div>

          <div class="instruction-step">
            <strong>3. Save the file</strong> and restart your development server
          </div>

          <div class="instruction-step">
            <strong>4. Done!</strong> The app will now use this account to create Google Meet meetings automatically.
          </div>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 30px; border: 1px solid #e0e0e0;">
          <h3>Troubleshooting</h3>
          <ul>
            <li><strong>Token not appearing?</strong> Make sure you clicked "Allow" on the Google consent screen</li>
            <li><strong>Error about prompt?</strong> Go back and try again, checking "Allow all" when asked for permissions</li>
            <li><strong>Still having issues?</strong> Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set correctly in .env.local</li>
          </ul>
        </div>

        <script>
          function copyToClipboard() {
            const token = document.getElementById('tokenBox').innerText.trim();
            navigator.clipboard.writeText(token).then(() => {
              alert('✓ Token copied to clipboard!');
            }).catch(() => {
              alert('Failed to copy. Please select and copy manually.');
            });
          }
        </script>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('[GoogleAdminCallback] Error exchanging code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Admin Setup - Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .error-box {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 20px;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <div class="error-box">
          <h2>❌ Setup Error</h2>
          <p><strong>Error:</strong> ${errorMessage}</p>
          <p>Please try the setup again or check your configuration.</p>
        </div>
      </body>
      </html>
    `;
    
    return new NextResponse(html, {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
