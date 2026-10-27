export type UserRole = "patient" | "doctor";
export type OtpChannel = "email" | "sms" | "whatsapp";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  authMethod?: OtpChannel;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number;
  priceCents: number;
  isActive: boolean;
}

export type AppointmentStatus = "confirmed" | "cancelled" | "completed" | "no_show";

export interface PatientIntakeData {
  chiefComplaint: string;
  isFirstVisit: boolean;
  accessibilityNeeds?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string | null;
  serviceId: string;
  serviceName: string;
  startTime: string; // ISO 8601 UTC string
  endTime: string; // ISO 8601 UTC string
  status: AppointmentStatus;
  chiefComplaint?: string | null;
  isFirstVisit: boolean;
  accessibilityNeeds?: string | null;
  doctorNotes?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
}

export interface DoctorSchedule {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday
  startTime: string; // "08:30"
  endTime: string; // "17:00"
  isWorkingDay: boolean;
}

export interface DoctorBreak {
  id: string;
  scheduleId?: string;
  title: string; // e.g. "Lunch Break"
  startTime: string; // "12:30"
  endTime: string; // "13:30"
}

export interface ScheduleOverride {
  id: string;
  date: string; // "YYYY-MM-DD"
  isBlocked: boolean; // true = Holiday/Vacation
  customStartTime?: string | null;
  customEndTime?: string | null;
  reason?: string | null;
}

export interface TimeSlot {
  startTime: string; // ISO 8601 UTC string
  endTime: string; // ISO 8601 UTC string
  formattedTime: string; // "09:00 AM"
  formattedEndTime: string; // "09:45 AM"
  available: boolean;
}

export interface DailySlotAvailability {
  date: string; // YYYY-MM-DD
  serviceId: string;
  slots: TimeSlot[];
  isBlockedDay: boolean;
  blockReason?: string | null;
}

export interface OtpRecord {
  id: string;
  identifier: string; // email address or phone number
  code: string;
  channel: OtpChannel;
  attempts: number;
  maxAttempts: number;
  expiresAt: number; // timestamp in milliseconds
  createdAt: string; // ISO string
}

export interface SendBookingOtpInput {
  channel: OtpChannel;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  serviceId: string;
  startTime: string; // ISO string
  chiefComplaint: string;
  isFirstVisit: boolean;
  accessibilityNeeds?: string;
}

export interface SendBookingOtpResult {
  success: boolean;
  token: string;
  channel: OtpChannel;
  maskedRecipient: string;
  expiresAt: number;
  devCode?: string;
}

export interface VerifyBookingOtpInput {
  token: string;
  code: string;
  bookingData: SendBookingOtpInput;
}
