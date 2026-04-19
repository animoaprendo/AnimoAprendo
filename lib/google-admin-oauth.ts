const JITSI_ONLY_ERROR =
  'Google Admin OAuth is disabled. This app uses Jitsi meetings only.';

export function getAdminOAuthClient(): never {
  throw new Error(JITSI_ONLY_ERROR);
}

export function getAdminCallbackUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/auth/google-admin-callback`;
}

export function getAdminLoginUrl(): string {
  throw new Error(JITSI_ONLY_ERROR);
}

export async function exchangeCodeForRefreshToken(_code: string): Promise<string> {
  throw new Error(JITSI_ONLY_ERROR);
}

export async function getAdminAccessToken(_refreshToken: string): Promise<string> {
  throw new Error(JITSI_ONLY_ERROR);
}

export function validateAdminOAuthConfig(): { isValid: boolean; errors: string[] } {
  return {
    isValid: false,
    errors: [JITSI_ONLY_ERROR],
  };
}
