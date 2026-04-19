// Legacy compatibility module.
// Google service-account token flow is disabled because the app uses Jitsi-only meetings.

const JITSI_ONLY_ERROR =
  'Google service-account flow is disabled. This app uses Jitsi meetings only.';

export function getServiceAccountAuth(): never {
  throw new Error(JITSI_ONLY_ERROR);
}

export async function getCalendarClient(): Promise<never> {
  throw new Error(JITSI_ONLY_ERROR);
}

export async function getServiceAccountAccessToken(): Promise<string> {
  throw new Error(JITSI_ONLY_ERROR);
}

export function validateServiceAccountConfig(): {
  isValid: boolean;
  errors: string[];
} {
  return {
    isValid: false,
    errors: [JITSI_ONLY_ERROR],
  };
}
