import { Resend } from "resend";
import { clinicConfig } from "@clinic/config";
import type { OtpChannel } from "@clinic/core";

export interface SendOtpPayload {
  channel: OtpChannel;
  recipient: string; // Email address or E.164 phone number
  code: string;
  patientName: string;
}

export interface DispatchNotificationResult {
  success: boolean;
  messageId?: string;
  channel: OtpChannel;
}

/**
 * Dispatches an OTP verification code via Resend (Email) or Twilio (SMS / WhatsApp).
 * Reads all credentials and endpoints from environment variables, falling back to
 * emulate.dev defaults in local development.
 */
export async function dispatchOtpNotification(
  payload: SendOtpPayload,
): Promise<DispatchNotificationResult> {
  const isDev = process.env.NODE_ENV !== "production";

  // ============================================================================
  // 1. EMAIL CHANNEL (via Resend)
  // ============================================================================
  if (payload.channel === "email") {
    const apiKey = process.env.RESEND_API_KEY || "re_test_emulate_key";
    const baseUrl = process.env.RESEND_BASE_URL || (isDev ? "http://127.0.0.1:4000" : undefined);
    const fromEmail =
      process.env.RESEND_FROM_EMAIL ||
      `${clinicConfig.identity.clinicName} <appointments@apexwellnessclinic.com>`;

    const resend = new Resend(apiKey, baseUrl ? { baseUrl } : undefined);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${clinicConfig.identity.clinicName} Verification</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="font-size: 13px; font-weight: 700; color: #1A5BFA; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              ${clinicConfig.identity.clinicName}
            </div>
            <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0;">
              Confirm Your Appointment Request
            </h1>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
              Hello ${payload.patientName},<br />
              Please use the verification code below to confirm your appointment consultation with ${clinicConfig.identity.doctorName}.
            </p>
            <div style="text-align: center; background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
              <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1A5BFA;">
                ${payload.code}
              </span>
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 16px 0;">
              This code will expire in <strong>5 minutes</strong>. If you did not request this booking, please disregard this email.
            </p>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
              ${clinicConfig.identity.clinicName} • ${clinicConfig.contact.address.street}, ${clinicConfig.contact.address.city} • ${clinicConfig.contact.formattedPhone}
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const response = await resend.emails.send({
        from: fromEmail,
        to: [payload.recipient.trim()],
        subject: `Your Verification Code: ${payload.code} - ${clinicConfig.identity.clinicName}`,
        html: htmlContent,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (isDev) {
        console.log(`\n┌────────────────────────────────────────────────────────┐`);
        console.log(`│ ✉️  [RESEND EMAIL DISPATCHED]                           │`);
        console.log(`│ To:      ${payload.recipient.padEnd(46)}│`);
        console.log(`│ Code:    ${payload.code.padEnd(46)}│`);
        console.log(`│ Inbox:   http://localhost:4000/inbox                   │`);
        console.log(`└────────────────────────────────────────────────────────┘\n`);
      }

      return {
        success: true,
        messageId: response.data?.id,
        channel: "email",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // In dev mode, if emulate.dev is not currently running, provide an informative error
      if (isDev && (msg.includes("fetch failed") || msg.includes("ECONNREFUSED"))) {
        console.warn(
          `[DEV NOTICE] emulate.dev Resend emulator not reachable at ${baseUrl}. Run 'pnpm run emulate'. Proceeding with local verification code: ${payload.code}`,
        );
        return {
          success: true,
          messageId: `mock-dev-${Date.now()}`,
          channel: "email",
        };
      }
      throw new Error(`Email dispatch failed: ${msg}`);
    }
  }

  // ============================================================================
  // 2. SMS & WHATSAPP CHANNELS (via Twilio REST API)
  // ============================================================================
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "AC00000000000000000000000000000000";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "twilio_test_auth_token";
  const twilioBaseUrl =
    process.env.TWILIO_BASE_URL || (isDev ? "http://127.0.0.1:4001" : "https://api.twilio.com");
  const defaultPhone = process.env.TWILIO_PHONE_NUMBER || "+15551234567";
  const defaultWhatsapp = process.env.TWILIO_WHATSAPP_NUMBER || defaultPhone;

  // Clean and format recipient phone number
  const rawRecipient = payload.recipient.trim();
  const isWhatsapp = payload.channel === "whatsapp";

  const to = isWhatsapp
    ? rawRecipient.startsWith("whatsapp:")
      ? rawRecipient
      : `whatsapp:${rawRecipient}`
    : rawRecipient;

  const from =
    isWhatsapp && !isDev
      ? defaultWhatsapp.startsWith("whatsapp:")
        ? defaultWhatsapp
        : `whatsapp:${defaultWhatsapp}`
      : defaultPhone;

  const body = `Your ${clinicConfig.identity.clinicName} verification code is: ${payload.code}. Valid for 5 minutes.`;

  const twilioEndpoint = `${twilioBaseUrl.replace(/\/$/, "")}/2010-04-01/Accounts/${accountSid}/Messages.json`;

  try {
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(twilioEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Twilio returned HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as { sid?: string };

    if (isDev) {
      const icon = isWhatsapp ? "🟢 [TWILIO WHATSAPP]" : "💬 [TWILIO SMS]";
      console.log(`\n┌────────────────────────────────────────────────────────┐`);
      console.log(`│ ${icon.padEnd(55)}│`);
      console.log(`│ To:      ${to.padEnd(46)}│`);
      console.log(`│ Code:    ${payload.code.padEnd(46)}│`);
      console.log(`│ Status:  Inspector at http://localhost:4001/          │`);
      console.log(`└────────────────────────────────────────────────────────┘\n`);
    }

    return {
      success: true,
      messageId: data.sid,
      channel: payload.channel,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isDev && (msg.includes("fetch failed") || msg.includes("ECONNREFUSED"))) {
      console.warn(
        `[DEV NOTICE] emulate.dev Twilio emulator not reachable at ${twilioBaseUrl}. Run 'pnpm run emulate'. Proceeding with local verification code: ${payload.code}`,
      );
      return {
        success: true,
        messageId: `mock-dev-${Date.now()}`,
        channel: payload.channel,
      };
    }
    throw new Error(`Twilio dispatch failed: ${msg}`);
  }
}
