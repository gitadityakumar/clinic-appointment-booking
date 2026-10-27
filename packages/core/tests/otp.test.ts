import { describe, expect, it } from "vite-plus/test";
import {
  generateOtp,
  validateOtpFormat,
  isOtpExpired,
  maskRecipient,
  OTP_EXPIRY_MS,
} from "../src/otp.js";

describe("OTP Security and Formatting", () => {
  it("generates 6-digit numeric OTPs", () => {
    const code = generateOtp();
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it("generates different codes across invocations", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtp()));
    expect(codes.size).toBeGreaterThan(15);
  });

  it("validates OTP formats accurately", () => {
    expect(validateOtpFormat("123456").isValid).toBe(true);
    expect(validateOtpFormat(" 123456 ").isValid).toBe(true);

    expect(validateOtpFormat("").isValid).toBe(false);
    expect(validateOtpFormat("12345").isValid).toBe(false);
    expect(validateOtpFormat("1234567").isValid).toBe(false);
    expect(validateOtpFormat("12345a").isValid).toBe(false);
  });

  it("correctly calculates expiration", () => {
    const now = Date.now();
    const futureExpiry = now + OTP_EXPIRY_MS;
    const pastExpiry = now - 1000;

    expect(isOtpExpired(futureExpiry, now)).toBe(false);
    expect(isOtpExpired(pastExpiry, now)).toBe(true);
  });

  it("masks emails and phone numbers cleanly for user display", () => {
    expect(maskRecipient("jane@example.com", "email")).toBe("j**e@example.com");
    expect(maskRecipient("alexander@hospital.org", "email")).toBe("a****r@hospital.org");
    expect(maskRecipient("+15551234567", "whatsapp")).toBe("(•••) •••-4567");
    expect(maskRecipient("+15551234567", "sms")).toBe("(•••) •••-4567");
  });
});
