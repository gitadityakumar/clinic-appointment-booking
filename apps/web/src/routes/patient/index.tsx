import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { clinicConfig } from "@clinic/config";
import type { Appointment } from "@clinic/core";
import { PlusIcon, XIcon, CalendarIcon } from "@phosphor-icons/react";
import { cancelAppointmentFn, getAppointmentsFn } from "../../lib/server-fns";
import { useToast } from "../../components/Toast";

export const Route = createFileRoute("/patient/")({
  loader: async () => {
    return await getAppointmentsFn();
  },
  component: PatientPortalPage,
});

function PatientPortalPage() {
  const { appointments: initialAppointments } = Route.useLoaderData();
  const router = useRouter();
  const { toast } = useToast();

  const [appointments, setAppointments] = useState(initialAppointments);
  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Trigger cancellation flow
  const handleConfirmCancel = async () => {
    if (!cancellingApt) return;

    setIsSubmittingCancel(true);
    try {
      const res = await cancelAppointmentFn({
        data: {
          appointmentId: cancellingApt.id,
          reason: cancelReason.trim() || "Patient cancelled via web portal",
        },
      });

      if (res.success) {
        toast({
          type: "success",
          title: "Appointment Cancelled",
          message: `Your appointment for ${cancellingApt.serviceName} has been cancelled.`,
        });

        setAppointments((prev) =>
          prev.map((a) => (a.id === cancellingApt.id ? { ...a, status: "cancelled" } : a)),
        );
        setCancellingApt(null);
        setCancelReason("");
        await router.invalidate();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to cancel appointment.";
      toast({
        type: "error",
        title: "Cancellation Policy Notice",
        message: msg,
        clinicPhone: clinicConfig.contact.formattedPhone,
      });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const upcoming = appointments.filter(
    (a) => a.status === "confirmed" && new Date(a.endTime).getTime() >= Date.now(),
  );
  const pastOrCancelled = appointments.filter(
    (a) => a.status !== "confirmed" || new Date(a.endTime).getTime() < Date.now(),
  );

  return (
    <div className="page-wrap py-8 sm:py-12 space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="island-kicker">Patient Portal</span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[var(--sea-ink)] tracking-tight">
            My Appointments
          </h1>
          <p className="text-xs sm:text-sm text-[var(--sea-ink-soft)] mt-1">
            Review and manage your scheduled consultations with {clinicConfig.identity.doctorName}.
          </p>
        </div>

        <Link
          to="/book"
          className="demo-button inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold bg-[#1A5BFA] hover:bg-[#1548C7] text-white shrink-0 shadow-lg shadow-blue-500/25"
        >
          <PlusIcon size={14} weight="bold" />
          <span>Schedule New Consultation</span>
        </Link>
      </div>

      {/* In-Place Cancellation Confirmation Dialog */}
      {cancellingApt && (
        <div className="demo-panel p-6 border-red-500/30 bg-red-950/15 backdrop-blur-xl rounded-[15px] space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider block">
                Confirm Cancellation
              </span>
              <h3 className="text-lg font-bold text-[var(--sea-ink)]">
                Cancel {cancellingApt.serviceName}?
              </h3>
              <p className="text-xs text-[var(--sea-ink-soft)] mt-1">
                Notice Policy: Cancellations are permitted up to{" "}
                {clinicConfig.policies.cancellationNoticeHours} hours before the visit.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCancellingApt(null)}
              className="text-xs text-slate-400 hover:text-white p-1 rounded cursor-pointer"
            >
              <XIcon size={14} weight="bold" />
            </button>
          </div>

          <div>
            <label
              htmlFor="cancel-reason"
              className="block text-xs font-semibold text-[var(--sea-ink)] mb-1"
            >
              Reason for Cancellation (Optional)
            </label>
            <input
              id="cancel-reason"
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule conflict, feeling better, need to reschedule"
              className="demo-input text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCancellingApt(null)}
              className="demo-button demo-button-secondary text-xs"
            >
              Keep Appointment
            </button>
            <button
              type="button"
              disabled={isSubmittingCancel}
              onClick={handleConfirmCancel}
              className="demo-button demo-button-danger text-xs font-bold"
            >
              {isSubmittingCancel ? "Processing Cancellation..." : "Confirm Cancellation"}
            </button>
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-[var(--sea-ink)] flex items-center gap-2">
          <span>Active Bookings</span>
          <span className="demo-pill">{upcoming.length}</span>
        </h2>

        {upcoming.length === 0 ? (
          <div className="demo-panel p-8 text-center text-xs text-[var(--sea-ink-soft)] space-y-3">
            <p>You have no active appointments scheduled.</p>
            <Link to="/book" className="demo-button text-xs font-bold bg-[#1A5BFA] text-white">
              Schedule Your Next Consultation
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((apt) => {
              const startDate = new Date(apt.startTime);
              const formattedDate = startDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const formattedTime = startDate.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={apt.id}
                  className="feature-card p-5 rounded-[15px] border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-bold uppercase tracking-wider border border-blue-500/20">
                        ● Confirmed
                      </span>
                      <h3 className="text-base font-bold text-[var(--sea-ink)]">
                        {apt.serviceName}
                      </h3>
                    </div>

                    <p className="text-xs text-[var(--sea-ink-soft)] font-medium font-mono flex items-center gap-1.5">
                      <CalendarIcon size={13} weight="bold" className="text-blue-500" />
                      <span>
                        {formattedDate} at {formattedTime} • {clinicConfig.identity.doctorName}
                      </span>
                    </p>

                    {apt.chiefComplaint && (
                      <p className="text-xs text-[var(--sea-ink-soft)] italic">
                        "{apt.chiefComplaint}"
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Link
                      to="/book/confirmation"
                      search={{ id: apt.id } as never}
                      className="demo-button demo-button-secondary text-xs"
                    >
                      View iCal & Details
                    </Link>
                    <button
                      type="button"
                      onClick={() => setCancellingApt(apt)}
                      className="demo-button demo-button-danger text-xs"
                    >
                      Cancel Visit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Past & Cancelled Appointments */}
      {pastOrCancelled.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-[var(--line)]">
          <h2 className="text-base font-bold text-[var(--sea-ink-soft)]">Past & Cancelled</h2>
          <div className="space-y-2 opacity-80">
            {pastOrCancelled.map((apt) => {
              const startDate = new Date(apt.startTime);
              const formattedDate = startDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={apt.id}
                  className="demo-card p-3 rounded-[15px] border-[var(--line)] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-[var(--sea-ink)]">{apt.serviceName}</span>
                    <span className="text-[var(--sea-ink-soft)] font-mono ml-2">
                      • {formattedDate}
                    </span>
                  </div>
                  <span
                    className={`font-mono capitalize text-[10px] px-2 py-0.5 rounded-full ${
                      apt.status === "cancelled"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : "bg-slate-700/20 text-slate-400"
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
