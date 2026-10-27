import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { clinicConfig } from "@clinic/config";
import type { TimeSlot, OtpChannel } from "@clinic/core";
import {
  LightningIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  WhatsappLogoIcon,
  EnvelopeSimpleIcon,
  ChatCircleDotsIcon,
  ShieldCheckIcon,
  ArrowCounterClockwiseIcon,
} from "@phosphor-icons/react";
import { formatDuration, formatPrice } from "../../lib/clinic";
import {
  getServicesFn,
  getSlotsFn,
  sendBookingOtpFn,
  resendBookingOtpFn,
  verifyBookingOtpAndBookFn,
} from "../../lib/server-fns";
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

  // Flow Step: "intake" | "verification"
  const [currentStep, setCurrentStep] = useState<"intake" | "verification">("intake");

  // Intake form state
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [authChannel, setAuthChannel] = useState<OtpChannel>("whatsapp");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState("");

  // OTP Verification state
  const [otpToken, setOtpToken] = useState<string>("");
  const [maskedRecipient, setMaskedRecipient] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

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

  // Step 2 Submission: Validate intake and dispatch OTP
  const handleIntakeSubmit = async (e: React.FormEvent) => {
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

    if ((authChannel === "whatsapp" || authChannel === "sms") && !patientPhone.trim()) {
      setFormError(
        `A mobile phone number is required to receive verification via ${authChannel === "whatsapp" ? "WhatsApp" : "SMS"}.`,
      );
      return;
    }

    if (chiefComplaint.trim().length < 5) {
      setFormError("Please provide a brief reason for your visit (at least 5 characters).");
      return;
    }

    setIsSubmittingIntake(true);
    try {
      const result = await sendBookingOtpFn({
        data: {
          channel: authChannel,
          serviceId: service.id,
          startTime: selectedSlot.startTime,
          patientName: patientName.trim(),
          patientEmail: patientEmail.trim(),
          patientPhone: patientPhone.trim() || undefined,
          chiefComplaint: chiefComplaint.trim(),
          isFirstVisit,
          accessibilityNeeds: accessibilityNeeds.trim() || undefined,
        },
      });

      if (result.success) {
        setOtpToken(result.token);
        setMaskedRecipient(result.maskedRecipient);
        setDevCode(result.devCode);
        setResendCooldown(60);
        setCurrentStep("verification");
        setEnteredOtp("");

        const channelLabel =
          authChannel === "whatsapp" ? "WhatsApp" : authChannel === "sms" ? "SMS" : "Email";

        toast({
          type: "success",
          title: "Verification Code Sent",
          message: `A 6-digit code was sent to ${result.maskedRecipient} via ${channelLabel}.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error initiating verification.";
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
          title: "Verification Request Failed",
          message: msg,
        });
      }
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  // Step 3 Submission: Validate OTP & Finalize Appointment
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanOtp = enteredOtp.trim();
    if (cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
      setFormError("Please enter a valid 6-digit verification code.");
      return;
    }

    if (!selectedSlot) {
      setFormError("Selected appointment slot is no longer active. Please choose a slot.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const result = await verifyBookingOtpAndBookFn({
        data: {
          token: otpToken,
          code: cleanOtp,
          bookingData: {
            channel: authChannel,
            serviceId: service.id,
            startTime: selectedSlot.startTime,
            patientName: patientName.trim(),
            patientEmail: patientEmail.trim(),
            patientPhone: patientPhone.trim() || undefined,
            chiefComplaint: chiefComplaint.trim(),
            isFirstVisit,
            accessibilityNeeds: accessibilityNeeds.trim() || undefined,
          },
        },
      });

      if (result.success && result.appointment) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            "clinic_patient_session",
            JSON.stringify({
              patientId: result.patient?.id,
              name: result.patient?.name,
              email: result.patient?.email,
              verifiedAt: new Date().toISOString(),
            }),
          );
        }

        toast({
          type: "success",
          title: "Identity Verified & Appointment Reserved",
          message: `Confirmed for ${selectedSlot.formattedTime}.`,
        });

        await navigate({
          to: "/book/confirmation",
          search: { id: result.appointment.id } as never,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error verifying code.";
      setFormError(msg);
      toast({
        type: "error",
        title: "Verification Failed",
        message: msg,
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Resend OTP Action
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !selectedSlot) return;

    setIsResendingOtp(true);
    setFormError(null);

    try {
      const result = await resendBookingOtpFn({
        data: {
          token: otpToken,
          bookingData: {
            channel: authChannel,
            serviceId: service.id,
            startTime: selectedSlot.startTime,
            patientName: patientName.trim(),
            patientEmail: patientEmail.trim(),
            patientPhone: patientPhone.trim() || undefined,
            chiefComplaint: chiefComplaint.trim(),
            isFirstVisit,
            accessibilityNeeds: accessibilityNeeds.trim() || undefined,
          },
        },
      });

      if (result.success) {
        setDevCode(result.devCode);
        setResendCooldown(60);
        toast({
          type: "success",
          title: "New Code Dispatched",
          message: `A fresh verification code was sent to ${result.maskedRecipient}.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error resending verification code.";
      setFormError(msg);
      toast({
        type: "error",
        title: "Resend Failed",
        message: msg,
      });
    } finally {
      setIsResendingOtp(false);
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
          <span className="island-kicker">
            {currentStep === "intake"
              ? "Step 2 of 3 • Patient Intake"
              : "Step 3 of 3 • Security Verification"}
          </span>
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--sea-ink)]">1. Select Date & Time</h2>
            {selectedSlot && (
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckIcon size={13} weight="bold" />
                <span>Slot Selected</span>
              </span>
            )}
          </div>

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
                  <LightningIcon size={11} weight="fill" />
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

        {/* Right Column: Step 2 Intake Form OR Step 3 Verification */}
        <div className="md:col-span-6 space-y-5">
          {currentStep === "intake" ? (
            <>
              <h2 className="text-lg font-bold text-[var(--sea-ink)]">
                2. Patient Information & Verification
              </h2>

              <form
                onSubmit={handleIntakeSubmit}
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
                      <CheckIcon size={14} weight="bold" />
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
                      Phone Number{" "}
                      {authChannel === "whatsapp" || authChannel === "sms" ? (
                        <span className="text-blue-400">* (Required)</span>
                      ) : (
                        "(Optional)"
                      )}
                    </label>
                    <input
                      id="patient-phone"
                      type="tel"
                      required={authChannel === "whatsapp" || authChannel === "sms"}
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="demo-input text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Authentication / OTP Channel Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--sea-ink)] mb-1.5">
                    Send Verification Code Via *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* WhatsApp option */}
                    <button
                      type="button"
                      onClick={() => setAuthChannel("whatsapp")}
                      className={`p-2.5 rounded-[12px] border text-left flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                        authChannel === "whatsapp"
                          ? "border-emerald-500/80 bg-emerald-500/15 text-emerald-400 font-bold shadow-md shadow-emerald-500/10"
                          : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink-soft)] hover:border-emerald-500/40"
                      }`}
                    >
                      <WhatsappLogoIcon
                        size={18}
                        weight={authChannel === "whatsapp" ? "fill" : "regular"}
                        className={
                          authChannel === "whatsapp" ? "text-emerald-400" : "text-emerald-500/70"
                        }
                      />
                      <span className="text-[11px] font-mono leading-none">WhatsApp</span>
                    </button>

                    {/* SMS option */}
                    <button
                      type="button"
                      onClick={() => setAuthChannel("sms")}
                      className={`p-2.5 rounded-[12px] border text-left flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                        authChannel === "sms"
                          ? "border-blue-500/80 bg-blue-500/15 text-blue-400 font-bold shadow-md shadow-blue-500/10"
                          : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink-soft)] hover:border-blue-500/40"
                      }`}
                    >
                      <ChatCircleDotsIcon
                        size={18}
                        weight={authChannel === "sms" ? "fill" : "regular"}
                        className={authChannel === "sms" ? "text-blue-400" : "text-blue-500/70"}
                      />
                      <span className="text-[11px] font-mono leading-none">SMS Text</span>
                    </button>

                    {/* Email option */}
                    <button
                      type="button"
                      onClick={() => setAuthChannel("email")}
                      className={`p-2.5 rounded-[12px] border text-left flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                        authChannel === "email"
                          ? "border-purple-500/80 bg-purple-500/15 text-purple-400 font-bold shadow-md shadow-purple-500/10"
                          : "border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink-soft)] hover:border-purple-500/40"
                      }`}
                    >
                      <EnvelopeSimpleIcon
                        size={18}
                        weight={authChannel === "email" ? "fill" : "regular"}
                        className={
                          authChannel === "email" ? "text-purple-400" : "text-purple-500/70"
                        }
                      />
                      <span className="text-[11px] font-mono leading-none">Email</span>
                    </button>
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
                  disabled={isSubmittingIntake || !selectedSlot}
                  className="demo-button inline-flex items-center justify-center gap-1.5 w-full font-bold bg-[#1A5BFA] hover:bg-[#1548C7] text-white disabled:opacity-50 py-3 shadow-lg shadow-blue-500/25"
                >
                  {isSubmittingIntake ? (
                    "Dispatching Verification Code..."
                  ) : (
                    <>
                      <span>Continue to Verification</span>
                      <ArrowRightIcon size={15} weight="bold" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* STEP 3: OTP VERIFICATION VIEW */
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--sea-ink)] flex items-center gap-2">
                  <ShieldCheckIcon size={20} weight="bold" className="text-blue-500" />
                  <span>3. Verify Your Contact Details</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentStep("intake")}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeftIcon size={12} weight="bold" />
                  <span>Edit Details</span>
                </button>
              </div>

              <div className="demo-panel p-6 border-[var(--line)] rounded-[15px] space-y-5">
                {formError && (
                  <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
                    {formError}
                  </div>
                )}

                {/* Delivery Notice */}
                <div className="p-4 rounded-[12px] bg-[var(--surface-strong)] border border-[var(--line)] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--sea-ink)]">
                    {authChannel === "whatsapp" && (
                      <WhatsappLogoIcon size={16} weight="fill" className="text-emerald-400" />
                    )}
                    {authChannel === "sms" && (
                      <ChatCircleDotsIcon size={16} weight="fill" className="text-blue-400" />
                    )}
                    {authChannel === "email" && (
                      <EnvelopeSimpleIcon size={16} weight="fill" className="text-purple-400" />
                    )}
                    <span>
                      Code sent via{" "}
                      {authChannel === "whatsapp"
                        ? "WhatsApp"
                        : authChannel === "sms"
                          ? "SMS Text"
                          : "Email"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--sea-ink-soft)] font-mono">
                    To: <strong className="text-[var(--sea-ink)]">{maskedRecipient}</strong>
                  </p>
                  <p className="text-[11px] text-[var(--sea-ink-soft)]">
                    Please enter the 6-digit confirmation code below to finalize your appointment
                    reservation.
                  </p>
                </div>

                {/* OTP Input Form */}
                <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="otp-code-input"
                      className="block text-xs font-semibold text-[var(--sea-ink)] mb-2 text-center"
                    >
                      Enter 6-Digit Code
                    </label>
                    <input
                      id="otp-code-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="\d{6}"
                      maxLength={6}
                      autoFocus
                      required
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••••"
                      className="demo-input text-center font-mono text-2xl font-extrabold tracking-[0.4em] py-3.5"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp || enteredOtp.length !== 6}
                    className="demo-button inline-flex items-center justify-center gap-1.5 w-full font-bold bg-[#1A5BFA] hover:bg-[#1548C7] text-white disabled:opacity-50 py-3 shadow-lg shadow-blue-500/25"
                  >
                    {isVerifyingOtp ? (
                      "Verifying & Confirming Reservation..."
                    ) : (
                      <>
                        <span>Verify & Confirm Booking</span>
                        <CheckIcon size={16} weight="bold" />
                      </>
                    )}
                  </button>
                </form>

                {/* Resend Action */}
                <div className="pt-2 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-[var(--sea-ink-soft)]">Didn't receive the code?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isResendingOtp}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1.5 font-bold font-mono text-blue-400 hover:text-blue-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowCounterClockwiseIcon size={13} weight="bold" />
                    <span>
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend Code Now"}
                    </span>
                  </button>
                </div>

                {/* Developer Testing Assistant (Shows when devCode is available) */}
                {devCode && (
                  <div className="p-3 rounded-[12px] bg-slate-900/60 border border-blue-500/30 text-[11px] font-mono space-y-2">
                    <div className="flex items-center justify-between text-blue-400 font-bold">
                      <span className="flex items-center gap-1">
                        <LightningIcon size={12} weight="fill" />
                        <span>Local Dev Testing Helper</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEnteredOtp(devCode)}
                        className="underline text-blue-300 hover:text-white cursor-pointer font-bold"
                      >
                        [Auto-fill Code: {devCode}]
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {authChannel === "email" ? (
                        <>
                          Resend is emulated via <code>emulate.dev</code>. View captured email in
                          browser:{" "}
                          <a
                            href="http://localhost:4000/inbox"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 underline"
                          >
                            http://localhost:4000/inbox
                          </a>
                        </>
                      ) : (
                        <>
                          Twilio is emulated via <code>emulate.dev</code>. View captured message in
                          browser:{" "}
                          <a
                            href="http://localhost:4001/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 underline"
                          >
                            http://localhost:4001/
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
