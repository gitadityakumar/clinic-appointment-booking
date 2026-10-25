import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role", { enum: ["patient", "doctor"] })
    .notNull()
    .default("patient"),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  bufferMinutes: integer("buffer_minutes").notNull().default(10),
  priceCents: integer("price_cents").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const doctorSchedules = sqliteTable("doctor_schedules", {
  id: text("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: text("start_time").notNull(), // "08:30"
  endTime: text("end_time").notNull(), // "17:00"
  isWorkingDay: integer("is_working_day", { mode: "boolean" }).notNull().default(true),
});

export const doctorBreaks = sqliteTable("doctor_breaks", {
  id: text("id").primaryKey(),
  scheduleId: text("schedule_id").references(() => doctorSchedules.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Break"),
  startTime: text("start_time").notNull(), // "12:30"
  endTime: text("end_time").notNull(), // "13:30"
});

export const scheduleOverrides = sqliteTable("schedule_overrides", {
  id: text("id").primaryKey(),
  date: text("date").notNull().unique(), // "YYYY-MM-DD"
  isBlocked: integer("is_blocked", { mode: "boolean" }).notNull().default(true),
  customStartTime: text("custom_start_time"), // optional if not blocked
  customEndTime: text("custom_end_time"),
  reason: text("reason"),
});

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  patientId: text("patient_id")
    .notNull()
    .references(() => users.id),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  startTime: text("start_time").notNull(), // ISO 8601 UTC
  endTime: text("end_time").notNull(), // ISO 8601 UTC
  status: text("status", { enum: ["confirmed", "cancelled", "completed", "no_show"] })
    .notNull()
    .default("confirmed"),
  chiefComplaint: text("chief_complaint"),
  isFirstVisit: integer("is_first_visit", { mode: "boolean" }).notNull().default(false),
  accessibilityNeeds: text("accessibility_needs"),
  doctorNotes: text("doctor_notes"),
  cancellationReason: text("cancellation_reason"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
