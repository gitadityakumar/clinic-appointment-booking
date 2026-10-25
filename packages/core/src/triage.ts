import type { PatientIntakeData } from "./types.js";

export function validatePatientIntake(data: Partial<PatientIntakeData>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!data.chiefComplaint || data.chiefComplaint.trim().length < 5) {
    errors.chiefComplaint = "Please provide a brief reason for your visit (at least 5 characters).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Checks whether an appointment can be cancelled according to clinic notice policy.
 */
export function canCancelOrReschedule(
  appointmentStartTime: string | Date,
  cancellationNoticeHours: number,
  now: Date = new Date(),
): {
  allowed: boolean;
  hoursRemaining: number;
  message?: string;
} {
  const start = new Date(appointmentStartTime).getTime();
  const current = now.getTime();
  const diffHours = (start - current) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return {
      allowed: false,
      hoursRemaining: 0,
      message: "This appointment has already passed or started.",
    };
  }

  if (diffHours < cancellationNoticeHours) {
    return {
      allowed: false,
      hoursRemaining: Math.max(0, Math.round(diffHours * 10) / 10),
      message: `Cancellations must be made at least ${cancellationNoticeHours} hours before the appointment. Please call the clinic directly at the office number.`,
    };
  }

  return {
    allowed: true,
    hoursRemaining: Math.round(diffHours * 10) / 10,
  };
}
