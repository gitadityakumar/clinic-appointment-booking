import type { OtpChannel } from "./types.js";

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const OTP_MAX_ATTEMPTS = 3;

/**
 * Generates a cryptographically secure numeric OTP of the specified length.
 * Defaults to 6 digits (e.g. "849201").
 */
export function generateOtp(length: number = 6): string {
  const digits = "0123456789";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += digits[array[i] % digits.length];
  }
  return result;
}

/**
 * Validates the format of a user-submitted OTP code.
 */
export function validateOtpFormat(
  code: string,
  expectedLength: number = 6,
): { isValid: boolean; error?: string } {
  const cleaned = code.trim();
  if (!cleaned) {
    return { isValid: false, error: "Please enter the verification code." };
  }
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, error: "Verification code must contain digits only." };
  }
  if (cleaned.length !== expectedLength) {
    return { isValid: false, error: `Verification code must be exactly ${expectedLength} digits.` };
  }
  return { isValid: true };
}

/**
 * Determines if an OTP has expired.
 */
export function isOtpExpired(expiresAt: number, now: number = Date.now()): boolean {
  return now > expiresAt;
}

/**
 * Safely masks a recipient string (email or phone) for UI display.
 * E.g. "patient@example.com" -> "p***t@example.com"
 * E.g. "+15551234567" -> "+1 (•••) •••-4567"
 */
export function maskRecipient(recipient: string, channel: OtpChannel): string {
  const trimmed = recipient.trim();
  if (channel === "email") {
    const [localPart, domain] = trimmed.split("@");
    if (!domain) return trimmed;
    if (localPart.length <= 2) {
      return `${localPart[0]}*@${domain}`;
    }
    return `${localPart[0]}${"*".repeat(Math.min(localPart.length - 2, 4))}${localPart[localPart.length - 1]}@${domain}`;
  }

  // Phone / SMS / WhatsApp
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 4) return trimmed;
  const last4 = digits.slice(-4);
  return `(•••) •••-${last4}`;
}
