import type { DoctorBreak, DoctorSchedule, ScheduleOverride, Service, TimeSlot } from "./types.js";

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap.
 */
export function doesOverlap(
  startA: Date | string | number,
  endA: Date | string | number,
  startB: Date | string | number,
  endB: Date | string | number,
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  return sA < eB && eA > sB;
}

/**
 * Parses "HH:MM" into minutes from start of day (0..1439).
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Formats minutes from midnight into 12-hour AM/PM string.
 */
export function minutesToFormattedTime(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const paddedMinutes = minutes.toString().padStart(2, "0");
  return `${hours12}:${paddedMinutes} ${period}`;
}

/**
 * Generates available appointment slots for a specific date given the doctor's schedule,
 * breaks, overrides, and existing confirmed appointments.
 */
export function calculateAvailableSlots(params: {
  dateStr: string; // "YYYY-MM-DD"
  service: Service;
  schedule?: DoctorSchedule | null;
  breaks?: DoctorBreak[];
  override?: ScheduleOverride | null;
  existingAppointments?: Array<{ startTime: string; endTime: string; status: string }>;
  currentTime?: Date;
  slotIntervalStepMinutes?: number; // Granularity step, defaults to 15 mins
}): {
  isBlockedDay: boolean;
  blockReason?: string | null;
  slots: TimeSlot[];
} {
  const {
    dateStr,
    service,
    schedule,
    breaks = [],
    override,
    existingAppointments = [],
    currentTime = new Date(),
    slotIntervalStepMinutes = 15,
  } = params;

  // 1. Check if the day is an explicit holiday or blocked override
  if (override?.isBlocked) {
    return {
      isBlockedDay: true,
      blockReason: override.reason || "Doctor out of office / Clinic closed",
      slots: [],
    };
  }

  // 2. Check if doctor works on this day
  const isWorkingDay = override?.customStartTime ? true : (schedule?.isWorkingDay ?? false);
  if (!isWorkingDay) {
    return {
      isBlockedDay: true,
      blockReason: "Clinic is closed on this day",
      slots: [],
    };
  }

  // 3. Determine working hours for this day
  const startDayTimeStr = override?.customStartTime || schedule?.startTime || "09:00";
  const endDayTimeStr = override?.customEndTime || schedule?.endTime || "17:00";

  const workStartMinutes = timeStringToMinutes(startDayTimeStr);
  const workEndMinutes = timeStringToMinutes(endDayTimeStr);

  const totalNeededDuration = service.durationMinutes + (service.bufferMinutes || 0);

  // Active confirmed/pending appointments on this day
  const activeBookings = existingAppointments.filter((apt) => apt.status === "confirmed");

  const slots: TimeSlot[] = [];

  // 4. Step through intervals
  for (
    let slotStartMin = workStartMinutes;
    slotStartMin + service.durationMinutes <= workEndMinutes;
    slotStartMin += slotIntervalStepMinutes
  ) {
    const slotEndMin = slotStartMin + service.durationMinutes;

    // Convert slot start and end to consistent UTC Date instances
    const slotStartDate = new Date(`${dateStr}T00:00:00.000Z`);
    slotStartDate.setUTCMinutes(slotStartMin);

    const slotEndDate = new Date(`${dateStr}T00:00:00.000Z`);
    slotEndDate.setUTCMinutes(slotEndMin);

    // Buffer end (for buffer collisions)
    const slotBufferEndDate = new Date(`${dateStr}T00:00:00.000Z`);
    slotBufferEndDate.setUTCMinutes(slotStartMin + totalNeededDuration);

    // Check if slot is in the past
    if (slotStartDate.getTime() <= currentTime.getTime()) {
      continue;
    }

    // Check collision with doctor breaks (e.g. Lunch)
    let overlapsBreak = false;
    for (const b of breaks) {
      const breakStartMin = timeStringToMinutes(b.startTime);
      const breakEndMin = timeStringToMinutes(b.endTime);

      if (slotStartMin < breakEndMin && slotEndMin > breakStartMin) {
        overlapsBreak = true;
        break;
      }
    }
    if (overlapsBreak) {
      continue;
    }

    // Check collision with existing appointments
    let overlapsBooking = false;
    for (const apt of activeBookings) {
      if (doesOverlap(slotStartDate, slotBufferEndDate, apt.startTime, apt.endTime)) {
        overlapsBooking = true;
        break;
      }
    }
    if (overlapsBooking) {
      continue;
    }

    slots.push({
      startTime: slotStartDate.toISOString(),
      endTime: slotEndDate.toISOString(),
      formattedTime: minutesToFormattedTime(slotStartMin),
      formattedEndTime: minutesToFormattedTime(slotEndMin),
      available: true,
    });
  }

  return {
    isBlockedDay: false,
    slots,
  };
}
