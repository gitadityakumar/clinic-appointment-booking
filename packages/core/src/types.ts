export type UserRole = "patient" | "doctor";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  emailVerified?: boolean;
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
