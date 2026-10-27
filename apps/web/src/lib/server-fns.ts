import { createServerFn } from "@tanstack/react-start";
import { clinicConfig } from "@clinic/config";
import {
  calculateAvailableSlots,
  doesOverlap,
  validatePatientIntake,
  canCancelOrReschedule,
  generateOtp,
  isOtpExpired,
  maskRecipient,
  validateOtpFormat,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
} from "@clinic/core";
import type {
  Appointment,
  DoctorBreak,
  DoctorSchedule,
  OtpRecord,
  SendBookingOtpInput,
  SendBookingOtpResult,
  VerifyBookingOtpInput,
} from "@clinic/core";
import { dispatchOtpNotification } from "./notifications";
import { clinicStore } from "./store";

// 1. Get Clinic Configuration & Branding
export const getConfigFn = createServerFn({ method: "GET" }).handler(async () => {
  return clinicConfig;
});

// 2. Get Clinic Services
export const getServicesFn = createServerFn({ method: "GET" }).handler(async () => {
  const servicesList = Array.from(clinicStore.services.values()).filter((s) => s.isActive);
  return {
    services: servicesList,
  };
});

// 3. Get Available Slots (with Cloudflare KV caching)
export const getSlotsFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { date: string; serviceId: string })
  .handler(async ({ data }) => {
    const { date: dateStr, serviceId } = data;

    if (!serviceId || !dateStr) {
      throw new Error("Missing date or serviceId");
    }

    const service = clinicStore.services.get(serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    // Check Cloudflare KV Cache
    const cacheKey = `slots:${dateStr}:${serviceId}`;
    const cached = clinicStore.getKv(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return { ...parsed, fromCache: true };
      } catch {
        // Fallback on corrupt cache
      }
    }

    // Cache Miss: Compute from DB
    const targetDate = new Date(`${dateStr}T12:00:00Z`);
    const dayOfWeek = targetDate.getUTCDay();

    const schedule = Array.from(clinicStore.schedules.values()).find(
      (s) => s.dayOfWeek === dayOfWeek,
    );

    const breaks = Array.from(clinicStore.breaks.values()).filter(
      (b) => !b.scheduleId || (schedule && b.scheduleId === schedule.id),
    );

    const override = clinicStore.overrides.get(dateStr) ?? null;

    const existingAppointments = Array.from(clinicStore.appointments.values())
      .filter((a) => a.startTime.startsWith(dateStr) && a.status === "confirmed")
      .map((a) => ({
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
      }));

    const result = calculateAvailableSlots({
      dateStr,
      service,
      schedule,
      breaks,
      override,
      existingAppointments,
    });

    const responseData = {
      date: dateStr,
      serviceId,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      isBlockedDay: result.isBlockedDay,
      blockReason: result.blockReason,
      slots: result.slots,
      fromCache: false,
    };

    // Cache in Cloudflare KV for 5 minutes
    clinicStore.setKv(cacheKey, JSON.stringify(responseData), 300);

    return responseData;
  });

// 4. Book Appointment (Atomic Overlap Check + KV Invalidation)
export interface BookAppointmentInput {
  serviceId: string;
  startTime: string; // ISO string
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  chiefComplaint: string;
  isFirstVisit: boolean;
  accessibilityNeeds?: string;
}

export const bookAppointmentFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as BookAppointmentInput)
  .handler(async ({ data }) => {
    const {
      serviceId,
      startTime,
      patientName,
      patientEmail,
      patientPhone,
      chiefComplaint,
      isFirstVisit,
      accessibilityNeeds,
    } = data;

    if (!serviceId || !startTime || !patientName || !patientEmail) {
      throw new Error("Missing required fields for appointment booking.");
    }

    const service = clinicStore.services.get(serviceId);
    if (!service) {
      throw new Error("Selected service not found.");
    }

    // Validate patient intake
    const intakeValidation = validatePatientIntake({
      chiefComplaint,
      isFirstVisit,
      accessibilityNeeds,
    });

    if (!intakeValidation.isValid) {
      throw new Error(
        intakeValidation.errors.chiefComplaint || "Please fill in all intake fields correctly.",
      );
    }

    const slotStartDate = new Date(startTime);
    const slotEndDate = new Date(slotStartDate.getTime() + service.durationMinutes * 60 * 1000);
    const slotWithBufferEndDate = new Date(
      slotStartDate.getTime() +
        (service.durationMinutes + (service.bufferMinutes || 0)) * 60 * 1000,
    );

    // ATOMIC D1 OVERLAP VERIFICATION
    const activeAppointments = Array.from(clinicStore.appointments.values()).filter(
      (a) => a.status === "confirmed",
    );

    for (const existing of activeAppointments) {
      if (doesOverlap(slotStartDate, slotWithBufferEndDate, existing.startTime, existing.endTime)) {
        throw new Error(
          "CONFLICT_SLOT_TAKEN: This slot was just reserved by another patient. Please choose an alternative time.",
        );
      }
    }

    // Patient record
    let patient = Array.from(clinicStore.users.values()).find(
      (u) => u.email.toLowerCase() === patientEmail.toLowerCase(),
    );

    if (!patient) {
      patient = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: patientName,
        email: patientEmail,
        phone: patientPhone || null,
        role: "patient",
        createdAt: new Date().toISOString(),
      };
      clinicStore.users.set(patient.id, patient);
    }

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patientId: patient.id,
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone,
      serviceId: service.id,
      serviceName: service.name,
      startTime: slotStartDate.toISOString(),
      endTime: slotEndDate.toISOString(),
      status: "confirmed",
      chiefComplaint: chiefComplaint.trim(),
      isFirstVisit: Boolean(isFirstVisit),
      accessibilityNeeds: accessibilityNeeds || null,
      createdAt: new Date().toISOString(),
    };

    clinicStore.appointments.set(newAppointment.id, newAppointment);

    // Invalidate KV cache for this date
    const dateStr = slotStartDate.toISOString().split("T")[0];
    clinicStore.clearKvPrefix(`slots:${dateStr}`);

    return {
      success: true,
      appointment: newAppointment,
    };
  });

// 4a. Request Booking Verification OTP (WhatsApp, SMS, or Email)
export const sendBookingOtpFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as SendBookingOtpInput)
  .handler(async ({ data }) => {
    const {
      channel,
      patientName,
      patientEmail,
      patientPhone,
      serviceId,
      startTime,
      chiefComplaint,
      isFirstVisit,
      accessibilityNeeds,
    } = data;

    if (!patientName?.trim() || !patientEmail?.trim() || !serviceId || !startTime) {
      throw new Error("Missing required fields for appointment booking.");
    }

    if (channel === "whatsapp" || channel === "sms") {
      if (!patientPhone?.trim()) {
        throw new Error(
          `A valid phone number is required to receive verification via ${channel === "whatsapp" ? "WhatsApp" : "SMS"}.`,
        );
      }
      const digits = patientPhone.replace(/\D/g, "");
      if (digits.length < 7) {
        throw new Error("Please enter a valid contact phone number (at least 7 digits).");
      }
    } else {
      if (!patientEmail.includes("@")) {
        throw new Error("Please enter a valid email address.");
      }
    }

    const service = clinicStore.services.get(serviceId);
    if (!service) {
      throw new Error("Selected service not found.");
    }

    // Validate intake data
    const intakeValidation = validatePatientIntake({
      chiefComplaint,
      isFirstVisit,
      accessibilityNeeds,
    });
    if (!intakeValidation.isValid) {
      throw new Error(
        intakeValidation.errors.chiefComplaint || "Please fill in all intake fields correctly.",
      );
    }

    // Check slot availability
    const slotStartDate = new Date(startTime);
    const slotWithBufferEndDate = new Date(
      slotStartDate.getTime() +
        (service.durationMinutes + (service.bufferMinutes || 0)) * 60 * 1000,
    );

    const activeAppointments = Array.from(clinicStore.appointments.values()).filter(
      (a) => a.status === "confirmed",
    );
    for (const existing of activeAppointments) {
      if (doesOverlap(slotStartDate, slotWithBufferEndDate, existing.startTime, existing.endTime)) {
        throw new Error(
          "CONFLICT_SLOT_TAKEN: This slot was just reserved by another patient. Please choose an alternative time.",
        );
      }
    }

    const recipient = (channel === "email" ? patientEmail : patientPhone)!.trim();

    // Check resend cooldown (60 seconds)
    const lastSent = clinicStore.lastOtpSentAt.get(recipient) || 0;
    const timeSinceLast = Date.now() - lastSent;
    if (timeSinceLast < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeSinceLast) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting another code.`);
    }

    const code = generateOtp(6);
    const tokenId = `otp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    const otpRecord: OtpRecord = {
      id: tokenId,
      identifier: recipient,
      code,
      channel,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    clinicStore.otpTokens.set(tokenId, otpRecord);
    clinicStore.lastOtpSentAt.set(recipient, Date.now());

    // Dispatch via Resend or Twilio (emulated in local dev via emulate.dev)
    await dispatchOtpNotification({
      channel,
      recipient,
      code,
      patientName: patientName.trim(),
    });

    const isDev = process.env.NODE_ENV !== "production";

    return {
      success: true,
      token: tokenId,
      channel,
      maskedRecipient: maskRecipient(recipient, channel),
      expiresAt,
      devCode: isDev ? code : undefined,
    } as SendBookingOtpResult;
  });

// 4b. Resend Verification OTP
export const resendBookingOtpFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { token: string; bookingData: SendBookingOtpInput })
  .handler(async ({ data }) => {
    const { token, bookingData } = data;

    const recipient = (
      bookingData.channel === "email" ? bookingData.patientEmail : bookingData.patientPhone
    )?.trim();

    if (!recipient) {
      throw new Error("Recipient contact information is missing.");
    }

    const lastSent = clinicStore.lastOtpSentAt.get(recipient) || 0;
    const timeSinceLast = Date.now() - lastSent;
    if (timeSinceLast < OTP_RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - timeSinceLast) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new code.`);
    }

    const code = generateOtp(6);
    const expiresAt = Date.now() + OTP_EXPIRY_MS;

    const updatedRecord: OtpRecord = {
      id: token,
      identifier: recipient,
      code,
      channel: bookingData.channel,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    clinicStore.otpTokens.set(token, updatedRecord);
    clinicStore.lastOtpSentAt.set(recipient, Date.now());

    await dispatchOtpNotification({
      channel: bookingData.channel,
      recipient,
      code,
      patientName: bookingData.patientName.trim(),
    });

    const isDev = process.env.NODE_ENV !== "production";

    return {
      success: true,
      token,
      channel: bookingData.channel,
      maskedRecipient: maskRecipient(recipient, bookingData.channel),
      expiresAt,
      devCode: isDev ? code : undefined,
    } as SendBookingOtpResult;
  });

// 4c. Verify OTP and Finalize Appointment Booking
export const verifyBookingOtpAndBookFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as VerifyBookingOtpInput)
  .handler(async ({ data }) => {
    const { token, code, bookingData } = data;

    const validation = validateOtpFormat(code);
    if (!validation.isValid) {
      throw new Error(validation.error || "Please enter a valid 6-digit code.");
    }

    const record = clinicStore.otpTokens.get(token);
    if (!record) {
      throw new Error("Verification session not found or expired. Please request a new code.");
    }

    if (isOtpExpired(record.expiresAt)) {
      clinicStore.otpTokens.delete(token);
      throw new Error("Verification code has expired. Please request a new code.");
    }

    if (record.attempts >= record.maxAttempts) {
      clinicStore.otpTokens.delete(token);
      throw new Error("Too many failed attempts. For your security, please request a new code.");
    }

    if (record.code !== code.trim()) {
      record.attempts += 1;
      const remaining = record.maxAttempts - record.attempts;
      if (remaining <= 0) {
        clinicStore.otpTokens.delete(token);
        throw new Error(
          "Too many incorrect attempts. For security, please request a new verification code.",
        );
      }
      throw new Error(
        `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      );
    }

    // OTP is valid! Invalidate token so it cannot be reused
    clinicStore.otpTokens.delete(token);

    const {
      serviceId,
      startTime,
      patientName,
      patientEmail,
      patientPhone,
      chiefComplaint,
      isFirstVisit,
      accessibilityNeeds,
      channel,
    } = bookingData;

    const service = clinicStore.services.get(serviceId);
    if (!service) {
      throw new Error("Selected service not found.");
    }

    const slotStartDate = new Date(startTime);
    const slotEndDate = new Date(slotStartDate.getTime() + service.durationMinutes * 60 * 1000);
    const slotWithBufferEndDate = new Date(
      slotStartDate.getTime() +
        (service.durationMinutes + (service.bufferMinutes || 0)) * 60 * 1000,
    );

    // ATOMIC D1 OVERLAP VERIFICATION
    const activeAppointments = Array.from(clinicStore.appointments.values()).filter(
      (a) => a.status === "confirmed",
    );

    for (const existing of activeAppointments) {
      if (doesOverlap(slotStartDate, slotWithBufferEndDate, existing.startTime, existing.endTime)) {
        throw new Error(
          "CONFLICT_SLOT_TAKEN: This slot was just reserved by another patient. Please choose an alternative time.",
        );
      }
    }

    // Create or update verified patient record
    let patient = Array.from(clinicStore.users.values()).find(
      (u) => u.email.toLowerCase() === patientEmail.toLowerCase(),
    );

    if (!patient) {
      patient = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: patientName.trim(),
        email: patientEmail.trim().toLowerCase(),
        phone: patientPhone?.trim() || null,
        role: "patient",
        emailVerified: channel === "email",
        phoneVerified: channel !== "email",
        authMethod: channel,
        createdAt: new Date().toISOString(),
      };
      clinicStore.users.set(patient.id, patient);
    } else {
      if (channel === "email") {
        patient.emailVerified = true;
      } else {
        patient.phoneVerified = true;
      }
      patient.authMethod = channel;
      if (patientPhone?.trim()) {
        patient.phone = patientPhone.trim();
      }
      clinicStore.users.set(patient.id, patient);
    }

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patientId: patient.id,
      patientName: patient.name,
      patientEmail: patient.email,
      patientPhone: patient.phone,
      serviceId: service.id,
      serviceName: service.name,
      startTime: slotStartDate.toISOString(),
      endTime: slotEndDate.toISOString(),
      status: "confirmed",
      chiefComplaint: chiefComplaint.trim(),
      isFirstVisit: Boolean(isFirstVisit),
      accessibilityNeeds: accessibilityNeeds?.trim() || null,
      createdAt: new Date().toISOString(),
    };

    clinicStore.appointments.set(newAppointment.id, newAppointment);

    // Invalidate KV cache for this date
    const dateStr = slotStartDate.toISOString().split("T")[0];
    clinicStore.clearKvPrefix(`slots:${dateStr}`);

    return {
      success: true,
      appointment: newAppointment,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        emailVerified: patient.emailVerified,
        phoneVerified: patient.phoneVerified,
      },
    };
  });

// 5. Get Appointments

export const getAppointmentsFn = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { patientId?: string } | undefined)
  .handler(async ({ data }) => {
    let list = Array.from(clinicStore.appointments.values());
    if (data?.patientId) {
      list = list.filter((a) => a.patientId === data.patientId);
    }

    list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return {
      appointments: list,
    };
  });

// 6. Cancel Appointment (with Clinic Notice Policy Enforcement)
export const cancelAppointmentFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { appointmentId: string; reason?: string })
  .handler(async ({ data }) => {
    const { appointmentId, reason = "Patient requested cancellation" } = data;
    const appointment = clinicStore.appointments.get(appointmentId);

    if (!appointment) {
      throw new Error("Appointment not found.");
    }

    if (appointment.status === "cancelled") {
      throw new Error("Appointment is already cancelled.");
    }

    const policyCheck = canCancelOrReschedule(
      appointment.startTime,
      clinicConfig.policies.cancellationNoticeHours,
    );

    if (!policyCheck.allowed) {
      throw new Error(policyCheck.message || "Cannot cancel within notice window.");
    }

    appointment.status = "cancelled";
    appointment.cancellationReason = reason;
    clinicStore.appointments.set(appointment.id, appointment);

    const dateStr = appointment.startTime.split("T")[0];
    clinicStore.clearKvPrefix(`slots:${dateStr}`);

    return {
      success: true,
      message: "Appointment cancelled successfully.",
      appointment,
    };
  });

// 7. Admin: Update Doctor Schedules & Breaks
export const updateScheduleFn = createServerFn({ method: "POST" })
  .validator(
    (d: unknown) =>
      d as {
        schedules?: DoctorSchedule[];
        breaks?: DoctorBreak[];
      },
  )
  .handler(async ({ data }) => {
    if (data.schedules) {
      for (const s of data.schedules) {
        clinicStore.schedules.set(s.id, s);
      }
    }

    if (data.breaks) {
      clinicStore.breaks.clear();
      for (const b of data.breaks) {
        clinicStore.breaks.set(b.id, b);
      }
    }

    clinicStore.clearKvPrefix("slots:");

    return {
      success: true,
      message: "Doctor schedule updated successfully.",
    };
  });

// 8. Admin: Quick Walk-In / Out-of-Office Block
export const quickBlockFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { durationMinutes?: number; reason?: string })
  .handler(async ({ data }) => {
    const durationMinutes = data?.durationMinutes || 30;
    const reason = data?.reason || "Walk-in patient / Doctor break";

    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    now.setMinutes(roundedMinutes, 0, 0);

    const end = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const blockAppointment: Appointment = {
      id: `apt-block-${Date.now()}`,
      patientId: "usr-walkin",
      patientName: "Walk-in / Doctor Block",
      patientEmail: "doctor@apexwellnessclinic.com",
      serviceId: "srv-general-consult",
      serviceName: "Walk-in Hold",
      startTime: now.toISOString(),
      endTime: end.toISOString(),
      status: "confirmed",
      chiefComplaint: reason,
      isFirstVisit: false,
      doctorNotes: "Reserved by clinic staff directly",
      createdAt: new Date().toISOString(),
    };

    clinicStore.appointments.set(blockAppointment.id, blockAppointment);

    const dateStr = now.toISOString().split("T")[0];
    clinicStore.clearKvPrefix(`slots:${dateStr}`);

    return {
      success: true,
      message: `Reserved ${durationMinutes} minutes starting at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      appointment: blockAppointment,
    };
  });

// 9. Clinical Staff / Doctor Authentication
export const loginStaffFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { email: string; passcode: string })
  .handler(async ({ data }) => {
    const { email, passcode } = data;

    if (!email || !passcode) {
      throw new Error("Staff email and passcode are required.");
    }

    // Check staff credentials
    const validEmails = ["doctor@apexwellnessclinic.com", "admin@apexwellnessclinic.com"];
    const isEmailValid = validEmails.includes(email.toLowerCase().trim());
    const isPasscodeValid = passcode.trim() === "clinic2026" || passcode.trim() === "doctor123";

    if (!isEmailValid || !isPasscodeValid) {
      throw new Error("Invalid credentials. Please verify your clinic email and passcode.");
    }

    const doctorUser = Array.from(clinicStore.users.values()).find((u) => u.role === "doctor");

    return {
      success: true,
      token: `token-${Date.now()}-staff-session`,
      doctor: {
        id: doctorUser?.id || "usr-doctor-sarah",
        name: doctorUser?.name || "Dr. Sarah Jenkins",
        email: doctorUser?.email || "doctor@apexwellnessclinic.com",
        role: "doctor" as const,
      },
    };
  });
