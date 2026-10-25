import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { clinicConfig } from "@clinic/config";
import type { TimeSlot } from "@clinic/core";
import { Lightning, Check, ArrowRight } from "@phosphor-icons/react";
import { formatDuration, formatPrice } from "../../lib/clinic";
import { bookAppointmentFn, getServicesFn, getSlotsFn } from "../../lib/server-fns";
import { useToast } from "../../components/Toast";

export const Route = createFileRoute("/book/$serviceId")({
  loader: async ({ params }) => {
    const { services } = await getServicesFn();
    const service = services.find((s) => s.id === params.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const initialDateStr = tomorrow.toISOString().split("T")[0];

    const slotData = await getSlotsFn({
      data: {
        date: initialDateStr,
        serviceId: service.id,
      },
    });

    return {
      service,
      initialDateStr,
      initialSlots: slotData,
    };
  },
  component: BookSlotPage,
});

function BookSlotPage() {
  const { service, initialDateStr, initialSlots } = Route.useLoaderData();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(initialDateStr);
  const [slotData, setSlotData] = useState(initialSlots);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Intake form state
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle changing dates
  const handleDateChange = async (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedSlot(null);
    setIsLoadingSlots(true);
    setFormError(null);

    try {
      const data = await getSlotsFn({
        data: {
          date: newDate,
          serviceId: service.id,
        },
      });
      setSlotData(data);
    } catch {
      toast({
        type: "error",
        title: "Schedule Unavailable",
        message: "Unable to retrieve appointment slots for this date.",
      });
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Submit booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedSlot) {
      setFormError("Please select an available appointment time slot.");
      toast({
        type: "info",
        title: "Slot Required",
        message: "Please choose an available time slot on the left before confirming.",
      });
      return;
    }

    if (!patientName.trim()) {
      setFormError("Please enter your legal name.");
      return;
    }

    if (!patientEmail.trim() || !patientEmail.includes("@")) {
      setFormError("Please enter a valid contact email.");
      return;
    }

    if (chiefComplaint.trim().length < 5) {
      setFormError("Please provide a brief reason for your visit (at least 5 characters).");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await bookAppointmentFn({
        data: {
          serviceId: service.id,
          startTime: selectedSlot.startTime,
          patientName,
          patientEmail,
          patientPhone,
          chiefComplaint,
          isFirstVisit,
          accessibilityNeeds: accessibilityNeeds.trim() || undefined,
        },
      });

      if (result.success && result.appointment) {
        toast({
          type: "success",
          title: "Appointment Reserved",
          message: `Confirmed for ${selectedSlot.formattedTime}.`,
        });
        await navigate({
          to: "/book/confirmation",
          search: { id: result.appointment.id } as never,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error booking appointment.";
      if (msg.includes("CONFLICT_SLOT_TAKEN")) {
        toast({
          type: "error",
          title: "Slot Conflict",
          message:
            "This slot was just reserved by another patient. Please choose an alternative time.",
        });
        await handleDateChange(selectedDate);
      } else {
        setFormError(msg);
        toast({
          type: "error",
          title: "Booking Failed",
          message: msg,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const candidateDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { dateStr, dayName, dayNum };
  });

  return (
    <div className="page-wrap py-8 sm:py-12 space-y-8 max-w-4xl">
      {/* Service Header Card */}
      <div className="demo-panel p-6 border-[var(--line)] rounded-[15px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="island-kicker">Step 2 & 3 of 3</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--sea-ink)] tracking-tight">
            {service.name}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--sea-ink-soft)] mt-1 font-mono">
            {clinicConfig.identity.doctorName} • {formatDuration(service.durationMinutes)}
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="text-xl font-mono font-extrabold text-blue-500">
            {formatPrice(service.priceCents)}
          </span>
          <span className="block text-xs text-[var(--sea-ink-soft)] font-mono">
            Pay at reception
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Date & Slot Selection */}
        <div className="md:col-span-6 space-y-5">
          <h2 className="text-lg font-bold text-[var(--sea-ink)]">1. Select Date & Time</h2>

          {/* Quick Date Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {candidateDates.map((item) => {
              const isSelected = selectedDate === item.dateStr;
              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => handleDateChange(item.dateStr)}
                  className={`shrink-0 flex flex-col items-center justify-center p-3 rounded-[15px] border text-center transition ${
                    isSelected
                      ? "border-[#1A5BFA] bg-[#1A5BFA] text-white font-bold shadow-lg shadow-blue-500/25"
                      : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)] hover:border-blue-500/40"
                  }`}
                >
                  <span className="text-xs font-mono uppercase">{item.dayName}</span>
                  <span className="text-sm font-bold font-mono">{item.dayNum}</span>
                </button>
              );
            })}
          </div>

          {/* Available Slots Grid */}
          <div className="demo-card p-4 border-[var(--line)] rounded-[15px] min-h-[220px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-[var(--sea-ink-soft)]">
                {new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              {slotData?.fromCache && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                  <Lightning size={11} weight="fill" />
                  <span>Edge Cache</span>
                </span>
              )}
            </div>

            {isLoadingSlots ? (
              <div className="flex items-center justify-center h-32 text-xs font-mono text-[var(--sea-ink-soft)]">
                Evaluating practitioner schedule...
              </div>
            ) : slotData?.isBlockedDay ? (
              <div className="p-4 rounded-[12px] bg-amber-500/10 text-amber-400 text-xs text-center border border-amber-500/20 font-mono">
                {slotData.blockReason || "Clinic closed on this day."}
              </div>
            ) : slotData?.slots?.length === 0 ? (
              <div className="p-4 rounded-[12px] bg-slate-800/30 text-xs text-center text-[var(--sea-ink-soft)] font-mono">
                No slots available on this day. Please select another date.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slotData?.slots?.map((slot: TimeSlot) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime;
                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-[12px] border text-xs font-mono font-semibold transition ${
                        isSelected
                          ? "border-[#1A5BFA] bg-[#1A5BFA] text-white shadow-md shadow-blue-500/30"
                          : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink)] hover:border-blue-500/40"
                      }`}
                    >
                      {slot.formattedTime}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pre-Visit Patient Intake & Triage Form */}
        <div className="md:col-span-6 space-y-5">
          <h2 className="text-lg font-bold text-[var(--sea-ink)]">
            2. Patient Information & Intake
          </h2>

          <form
            onSubmit={handleBookingSubmit}
            className="demo-card p-5 border-[var(--line)] rounded-[15px] space-y-4"
          >
            {formError && (
              <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
                {formError}
              </div>
            )}

            {/* Selected Slot Recap */}
            <div className="p-3 rounded-[12px] bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-mono flex items-center justify-between">
              <span>
                <strong>Selected:</strong>{" "}
                {selectedSlot
                  ? `${selectedSlot.formattedTime} - ${selectedSlot.formattedEndTime}`
                  : "Choose slot on left"}
              </span>
              {selectedSlot && (
                <span className="inline-flex items-center gap-1 font-bold text-blue-400">
                  <Check size={14} weight="bold" />
                  <span>Ready</span>
                </span>
              )}
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="patient-name"
                className="block text-xs font-semibold text-[var(--sea-ink)] mb-1"
              >
                Full Legal Name *
              </label>
              <input
                id="patient-name"
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="demo-input text-xs"
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="patient-email"
                  className="block text-xs font-semibold text-[var(--sea-ink)] mb-1"
                >
                  Email Address *
                </label>
                <input
                  id="patient-email"
                  type="email"
                  required
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="demo-input text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="patient-phone"
                  className="block text-xs font-semibold text-[var(--sea-ink)] mb-1"
                >
                  Phone (Optional)
                </label>
                <input
                  id="patient-phone"
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="demo-input text-xs font-mono"
                />
              </div>
            </div>

            {/* Reason for Visit / Chief Complaint */}
            <div>
              <label
                htmlFor="chief-complaint"
                className="block text-xs font-semibold text-[var(--sea-ink)] mb-1"
              >
                Reason for Visit / Primary Symptoms *
              </label>
              <textarea
                id="chief-complaint"
                required
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Briefly describe what you'd like Dr. Jenkins to evaluate..."
                rows={3}
                className="demo-textarea text-xs min-h-[70px]"
              />
            </div>

            {/* First-Time Visit Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="first-time-patient"
                type="checkbox"
                checked={isFirstVisit}
                onChange={(e) => setIsFirstVisit(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--line)] text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="first-time-patient"
                className="text-xs text-[var(--sea-ink)] font-medium cursor-pointer"
              >
                This is my first time visiting Dr. Jenkins
              </label>
            </div>

            {/* Accessibility needs */}
            <div>
              <label
                htmlFor="accessibility"
                className="block text-xs font-semibold text-[var(--sea-ink-soft)] mb-1"
              >
                Special Requests or Accessibility Needs (Optional)
              </label>
              <input
                id="accessibility"
                type="text"
                value={accessibilityNeeds}
                onChange={(e) => setAccessibilityNeeds(e.target.value)}
                placeholder="e.g. Wheelchair assistance, translation assistance"
                className="demo-input text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedSlot}
              className="demo-button inline-flex items-center justify-center gap-1.5 w-full font-bold bg-[#1A5BFA] hover:bg-[#1548C7] text-white disabled:opacity-50 py-3 shadow-lg shadow-blue-500/25"
            >
              {isSubmitting ? (
                "Confirming Appointment..."
              ) : (
                <>
                  <span>Confirm & Book Appointment</span>
                  <ArrowRight size={15} weight="bold" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
