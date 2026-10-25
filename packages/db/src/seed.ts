export const defaultServices = [
  {
    id: "srv-general-consult",
    name: "General Health Consultation",
    description:
      "Standard 30-minute evaluation for new or existing health concerns, acute issues, and wellness guidance.",
    durationMinutes: 30,
    bufferMinutes: 10,
    priceCents: 12000, // $120.00
    isActive: true,
  },
  {
    id: "srv-comprehensive-intake",
    name: "Comprehensive Intake & Physical Exam",
    description:
      "In-depth 60-minute initial visit including head-to-toe examination, family history, and personalized care planning.",
    durationMinutes: 60,
    bufferMinutes: 15,
    priceCents: 22000, // $220.00
    isActive: true,
  },
  {
    id: "srv-follow-up",
    name: "Follow-up & Lab Review",
    description:
      "Targeted 15-minute consultation to review recent lab results, monitor ongoing treatment, or adjust medications.",
    durationMinutes: 15,
    bufferMinutes: 5,
    priceCents: 7500, // $75.00
    isActive: true,
  },
  {
    id: "srv-preventive-wellness",
    name: "Preventive Wellness & Lifestyle Review",
    description:
      "45-minute consultation focusing on cardiovascular risk reduction, nutrition, sleep, and longevity goals.",
    durationMinutes: 45,
    bufferMinutes: 15,
    priceCents: 16000, // $160.00
    isActive: true,
  },
];

export const defaultWeeklySchedules = [
  { id: "sch-mon", dayOfWeek: 1, startTime: "08:30", endTime: "17:00", isWorkingDay: true },
  { id: "sch-tue", dayOfWeek: 2, startTime: "08:30", endTime: "17:00", isWorkingDay: true },
  { id: "sch-wed", dayOfWeek: 3, startTime: "08:30", endTime: "17:00", isWorkingDay: true },
  { id: "sch-thu", dayOfWeek: 4, startTime: "08:30", endTime: "17:00", isWorkingDay: true },
  { id: "sch-fri", dayOfWeek: 5, startTime: "08:30", endTime: "16:30", isWorkingDay: true },
  { id: "sch-sat", dayOfWeek: 6, startTime: "09:00", endTime: "13:00", isWorkingDay: false },
  { id: "sch-sun", dayOfWeek: 0, startTime: "09:00", endTime: "13:00", isWorkingDay: false },
];

export const defaultBreaks = [
  {
    id: "brk-lunch-mon",
    scheduleId: "sch-mon",
    title: "Lunch Break",
    startTime: "12:30",
    endTime: "13:30",
  },
  {
    id: "brk-lunch-tue",
    scheduleId: "sch-tue",
    title: "Lunch Break",
    startTime: "12:30",
    endTime: "13:30",
  },
  {
    id: "brk-lunch-wed",
    scheduleId: "sch-wed",
    title: "Lunch Break",
    startTime: "12:30",
    endTime: "13:30",
  },
  {
    id: "brk-lunch-thu",
    scheduleId: "sch-thu",
    title: "Lunch Break",
    startTime: "12:30",
    endTime: "13:30",
  },
  {
    id: "brk-lunch-fri",
    scheduleId: "sch-fri",
    title: "Lunch Break",
    startTime: "12:30",
    endTime: "13:30",
  },
];

export const defaultDoctorUser = {
  id: "usr-doctor-sarah",
  name: "Dr. Sarah Jenkins",
  email: "doctor@apexwellnessclinic.com",
  phone: "(555) 019-4821",
  role: "doctor" as const,
  emailVerified: true,
};

export const defaultDemoPatient = {
  id: "usr-patient-john",
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "(555) 234-5678",
  role: "patient" as const,
  emailVerified: true,
};
