import { describe, expect, it } from "vite-plus/test";
import {
  calculateAvailableSlots,
  doesOverlap,
  canCancelOrReschedule,
  timeStringToMinutes,
  minutesToFormattedTime,
} from "../src/index.js";
import type { DoctorBreak, DoctorSchedule, Service } from "../src/types.js";

describe("Time & Slot Math", () => {
  it("converts HH:MM strings to minutes and formats back", () => {
    expect(timeStringToMinutes("09:00")).toBe(540);
    expect(timeStringToMinutes("12:30")).toBe(750);
    expect(timeStringToMinutes("17:00")).toBe(1020);

    expect(minutesToFormattedTime(540)).toBe("9:00 AM");
    expect(minutesToFormattedTime(750)).toBe("12:30 PM");
    expect(minutesToFormattedTime(1020)).toBe("5:00 PM");
  });

  it("accurately detects interval overlaps", () => {
    const startA = "2026-10-26T10:00:00Z";
    const endA = "2026-10-26T10:30:00Z";

    // Completely before
    expect(doesOverlap(startA, endA, "2026-10-26T09:00:00Z", "2026-10-26T09:30:00Z")).toBe(false);

    // Adjacent / touching (non-overlapping)
    expect(doesOverlap(startA, endA, "2026-10-26T10:30:00Z", "2026-10-26T11:00:00Z")).toBe(false);
    expect(doesOverlap(startA, endA, "2026-10-26T09:30:00Z", "2026-10-26T10:00:00Z")).toBe(false);

    // Overlapping partially
    expect(doesOverlap(startA, endA, "2026-10-26T10:15:00Z", "2026-10-26T10:45:00Z")).toBe(true);

    // Exact match
    expect(doesOverlap(startA, endA, "2026-10-26T10:00:00Z", "2026-10-26T10:30:00Z")).toBe(true);
  });
});

describe("Slot Generation Engine", () => {
  const sampleService: Service = {
    id: "srv-consult",
    name: "General Consultation",
    description: "Standard visit",
    durationMinutes: 30,
    bufferMinutes: 10,
    priceCents: 12000,
    isActive: true,
  };

  const schedule: DoctorSchedule = {
    id: "sch-mon",
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "12:00",
    isWorkingDay: true,
  };

  const lunchBreak: DoctorBreak = {
    id: "brk-lunch",
    title: "Lunch",
    startTime: "12:00",
    endTime: "13:00",
  };

  it("calculates candidate slots within doctor working hours", () => {
    const result = calculateAvailableSlots({
      dateStr: "2026-11-02", // Future date
      service: sampleService,
      schedule,
      breaks: [lunchBreak],
      currentTime: new Date("2026-10-25T00:00:00Z"),
    });

    expect(result.isBlockedDay).toBe(false);
    expect(result.slots.length).toBeGreaterThan(0);
    expect(result.slots[0].formattedTime).toBe("9:00 AM");
  });

  it("excludes slots that collide with existing confirmed appointments", () => {
    const appointment = {
      startTime: "2026-11-02T09:00:00.000Z",
      endTime: "2026-11-02T09:30:00.000Z",
      status: "confirmed",
    };

    const result = calculateAvailableSlots({
      dateStr: "2026-11-02",
      service: sampleService,
      schedule,
      breaks: [lunchBreak],
      existingAppointments: [appointment],
      currentTime: new Date("2026-10-25T00:00:00Z"),
    });

    // 9:00 AM should be excluded because of existing booking + buffer
    const slotTimes = result.slots.map((s) => s.formattedTime);
    expect(slotTimes).not.toContain("9:00 AM");
  });
});

describe("Clinic Cancellation Policy", () => {
  it("allows cancellation when outside notice window", () => {
    const aptTime = "2026-10-28T10:00:00Z";
    const now = new Date("2026-10-27T10:00:00Z"); // 24 hours before
    const check = canCancelOrReschedule(aptTime, 4, now);

    expect(check.allowed).toBe(true);
    expect(check.hoursRemaining).toBe(24);
  });

  it("rejects cancellation when within notice window (e.g. 2 hours before 4-hour policy)", () => {
    const aptTime = "2026-10-28T10:00:00Z";
    const now = new Date("2026-10-28T08:00:00Z"); // 2 hours before
    const check = canCancelOrReschedule(aptTime, 4, now);

    expect(check.allowed).toBe(false);
    expect(check.hoursRemaining).toBe(2);
    expect(check.message).toContain("4 hours");
  });
});
