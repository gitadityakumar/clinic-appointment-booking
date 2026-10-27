import {
  defaultServices,
  defaultWeeklySchedules,
  defaultBreaks,
  defaultDoctorUser,
  defaultDemoPatient,
} from "@clinic/db";
import type {
  Appointment,
  DoctorBreak,
  DoctorSchedule,
  ScheduleOverride,
  Service,
  User,
  OtpRecord,
} from "@clinic/core";

// In-memory persistent state for local dev and edge fallback
class ClinicStore {
  users: Map<string, User> = new Map();
  services: Map<string, Service> = new Map();
  schedules: Map<string, DoctorSchedule> = new Map();
  breaks: Map<string, DoctorBreak> = new Map();
  overrides: Map<string, ScheduleOverride> = new Map();
  appointments: Map<string, Appointment> = new Map();
  otpTokens: Map<string, OtpRecord> = new Map();
  lastOtpSentAt: Map<string, number> = new Map();
  kvCache: Map<string, { value: string; expiresAt: number }> = new Map();

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    // Seed users
    this.users.set(defaultDoctorUser.id, {
      ...defaultDoctorUser,
      createdAt: new Date().toISOString(),
    });
    this.users.set(defaultDemoPatient.id, {
      ...defaultDemoPatient,
      createdAt: new Date().toISOString(),
    });

    // Seed services
    for (const s of defaultServices) {
      this.services.set(s.id, s);
    }

    // Seed weekly schedules
    for (const sch of defaultWeeklySchedules) {
      this.schedules.set(sch.id, sch);
    }

    // Seed breaks
    for (const b of defaultBreaks) {
      this.breaks.set(b.id, b);
    }

    // Seed a couple sample appointments for testing today and tomorrow
    const today = new Date();
    const todayIso = today.toISOString().split("T")[0];

    const sampleApt1: Appointment = {
      id: "apt-sample-1",
      patientId: defaultDemoPatient.id,
      patientName: defaultDemoPatient.name,
      patientEmail: defaultDemoPatient.email,
      patientPhone: defaultDemoPatient.phone,
      serviceId: "srv-general-consult",
      serviceName: "General Health Consultation",
      startTime: `${todayIso}T10:00:00.000Z`,
      endTime: `${todayIso}T10:30:00.000Z`,
      status: "confirmed",
      chiefComplaint: "Routine annual blood pressure checkup and medication refill",
      isFirstVisit: false,
      accessibilityNeeds: undefined,
      doctorNotes: "Patient blood pressure stable at 122/78 on last visit.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    };

    this.appointments.set(sampleApt1.id, sampleApt1);
  }

  // KV simulation
  getKv(key: string): string | null {
    const item = this.kvCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.kvCache.delete(key);
      return null;
    }
    return item.value;
  }

  setKv(key: string, value: string, ttlSeconds: number = 300) {
    this.kvCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  deleteKv(key: string) {
    this.kvCache.delete(key);
  }

  clearKvPrefix(prefix: string) {
    for (const key of this.kvCache.keys()) {
      if (key.startsWith(prefix)) {
        this.kvCache.delete(key);
      }
    }
  }
}

// Global singleton instance across SSR requests in the same worker/node process
const globalForStore = globalThis as unknown as { clinicStore?: ClinicStore };
export const clinicStore = globalForStore.clinicStore ?? new ClinicStore();
if (process.env.NODE_ENV !== "production") {
  globalForStore.clinicStore = clinicStore;
}
