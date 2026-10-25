import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { clinicConfig } from "@clinic/config";
import type { Appointment, DoctorBreak, DoctorSchedule } from "@clinic/core";
import {
  LockKey,
  ArrowRight,
  Plus,
  SignOut,
  Star,
  Wheelchair,
  Coffee,
  FloppyDisk,
} from "@phosphor-icons/react";
import {
  getAppointmentsFn,
  loginStaffFn,
  quickBlockFn,
  updateScheduleFn,
} from "../../lib/server-fns";
import { clinicStore } from "../../lib/store";
import { useToast } from "../../components/Toast";

export const Route = createFileRoute("/clinic/")({
  loader: async () => {
    const { appointments } = await getAppointmentsFn();
    const schedules = Array.from(clinicStore.schedules.values());
    const breaks = Array.from(clinicStore.breaks.values());
    return {
      appointments,
      schedules,
      breaks,
    };
  },
  component: ClinicPortalPage,
});

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ClinicPortalPage() {
  const {
    appointments,
    schedules: initialSchedules,
    breaks: initialBreaks,
  } = Route.useLoaderData();
  const router = useRouter();
  const { toast } = useToast();

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPasscode, setAuthPasscode] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check persistent session on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = window.sessionStorage.getItem("clinic_staff_token");
      if (savedToken) {
        setIsAuthenticated(true);
      }
    }
  }, []);

  // Staff Schedule State
  const [schedules, setSchedules] = useState<DoctorSchedule[]>(initialSchedules);
  const [breaks, setBreaks] = useState<DoctorBreak[]>(initialBreaks);
  const [activeTab, setActiveTab] = useState<"agenda" | "schedule">("agenda");
  const [isBlocking, setIsBlocking] = useState(false);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await loginStaffFn({
        data: {
          email: authEmail,
          passcode: authPasscode,
        },
      });

      if (res.success) {
        setIsAuthenticated(true);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("clinic_staff_token", res.token);
        }
        toast({
          type: "success",
          title: "Authenticated Successfully",
          message: `Welcome back, ${res.doctor.name}.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setLoginError(msg);
      toast({
        type: "error",
        title: "Access Denied",
        message: msg,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("clinic_staff_token");
    }
    toast({
      type: "info",
      title: "Signed Out",
      message: "Clinical staff session closed.",
    });
  };

  // Quick Demo Auto-Fill
  const handleFillDemo = () => {
    setAuthEmail("doctor@apexwellnessclinic.com");
    setAuthPasscode("clinic2026");
  };

  // Quick Walk-In Blocker action
  const handleQuickBlock = async (durationMinutes: number) => {
    setIsBlocking(true);
    try {
      const res = await quickBlockFn({
        data: {
          durationMinutes,
          reason: "Walk-in patient consultation",
        },
      });
      if (res.success) {
        toast({
          type: "success",
          title: "Slot Reserved",
          message: res.message,
        });
        await router.invalidate();
      }
    } catch (err: unknown) {
      toast({
        type: "error",
        title: "Error",
        message: err instanceof Error ? err.message : "Error reserving block",
      });
    } finally {
      setIsBlocking(false);
    }
  };

  // Toggle working day
  const handleToggleDay = (dayIndex: number) => {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayIndex ? { ...s, isWorkingDay: !s.isWorkingDay } : s)),
    );
  };

  // Update schedule time
  const handleScheduleTimeChange = (
    dayIndex: number,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayIndex ? { ...s, [field]: value } : s)),
    );
  };

  // Update break time
  const handleBreakTimeChange = (
    breakId: string,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    setBreaks((prev) => prev.map((b) => (b.id === breakId ? { ...b, [field]: value } : b)));
  };

  // Save schedule changes
  const handleSaveSchedule = async () => {
    try {
      const res = await updateScheduleFn({
        data: {
          schedules,
          breaks,
        },
      });
      if (res.success) {
        toast({
          type: "success",
          title: "Schedule Saved",
          message: "Doctor working hours and lunch breaks successfully updated.",
        });
        await router.invalidate();
      }
    } catch (err: unknown) {
      toast({
        type: "error",
        title: "Save Failed",
        message: err instanceof Error ? err.message : "Error saving schedule",
      });
    }
  };

  // -------------------------------------------------------------
  // VIEW A: If NOT authenticated, render Staff Login Form
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="page-wrap py-12 sm:py-20 max-w-md mx-auto">
        <div className="demo-panel p-8 border-[var(--line)] shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white mx-auto shadow-lg shadow-blue-500/30">
              <LockKey size={26} weight="bold" />
            </div>
            <span className="island-kicker block">Authorized Personnel Only</span>
            <h1 className="text-2xl font-extrabold text-[var(--sea-ink)]">
              Clinical Operations Login
            </h1>
            <p className="text-xs text-[var(--sea-ink-soft)] leading-relaxed">
              Sign in with your practitioner credentials to access schedule controls and patient
              records.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500 text-xs">
                {loginError}
              </div>
            )}

            <div>
              <label
                htmlFor="staff-email"
                className="block text-xs font-semibold text-[var(--sea-ink)] mb-1"
              >
                Staff Email Address
              </label>
              <input
                id="staff-email"
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="doctor@apexwellnessclinic.com"
                className="demo-input text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="staff-passcode"
                className="block text-xs font-semibold text-[var(--sea-ink)] mb-1"
              >
                Security Passcode
              </label>
              <input
                id="staff-passcode"
                type="password"
                required
                value={authPasscode}
                onChange={(e) => setAuthPasscode(e.target.value)}
                placeholder="••••••••"
                className="demo-input text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="demo-button inline-flex items-center justify-center gap-1.5 w-full font-bold bg-[#1A5BFA] hover:bg-[#1548C7] text-white py-3 shadow-lg shadow-blue-500/20"
            >
              {isLoggingIn ? (
                "Verifying Credentials..."
              ) : (
                <>
                  <span>Access Doctor Console</span>
                  <ArrowRight size={14} weight="bold" />
                </>
              )}
            </button>

            {/* Demo Helper Button */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-xs font-mono text-blue-500 hover:text-blue-400 underline cursor-pointer"
              >
                [Demo: Autofill Dr. Sarah's Credentials]
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-[var(--line)] text-[11px] text-[var(--sea-ink-soft)] text-center leading-relaxed">
            Strictly protected under clinic data compliance. All authentication attempts are logged.
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW B: Authenticated Doctor & Staff Operational Console
  // -------------------------------------------------------------
  const confirmedAppointments = appointments.filter((a) => a.status === "confirmed");

  return (
    <div className="page-wrap py-8 sm:py-12 space-y-8 max-w-5xl">
      {/* Console Header */}
      <div className="demo-panel p-6 border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="demo-pill bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              ● Live Practitioner Session
            </span>
            <span className="text-xs font-mono text-[var(--sea-ink-soft)]">
              Dr. Sarah Jenkins (MD)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--sea-ink)]">
            Clinical Operations Console
          </h1>
          <p className="text-xs sm:text-sm text-[var(--sea-ink-soft)] mt-0.5">
            {clinicConfig.identity.clinicName} • Secure Medical Administration
          </p>
        </div>

        {/* Action Controls & Sign Out */}
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isBlocking}
              onClick={() => handleQuickBlock(30)}
              className="demo-button inline-flex items-center gap-1 text-xs font-bold py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus size={12} weight="bold" />
              <span>Block 30m Walk-in</span>
            </button>
            <button
              type="button"
              disabled={isBlocking}
              onClick={() => handleQuickBlock(60)}
              className="demo-button inline-flex items-center gap-1 text-xs font-bold py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus size={12} weight="bold" />
              <span>Block 1hr</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="demo-button demo-button-secondary inline-flex items-center gap-1.5 text-xs font-semibold py-2 px-3 text-red-400 hover:text-red-300 border-red-500/20"
          >
            <SignOut size={14} weight="bold" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--line)] gap-6 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("agenda")}
          className={`pb-3 transition cursor-pointer ${
            activeTab === "agenda"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
          }`}
        >
          Patient Appointments ({confirmedAppointments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("schedule")}
          className={`pb-3 transition cursor-pointer ${
            activeTab === "schedule"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
          }`}
        >
          Weekly Hours & Lunch Breaks
        </button>
      </div>

      {/* Tab 1: Appointments Agenda */}
      {activeTab === "agenda" && (
        <section className="space-y-4">
          <div className="demo-table-shell border-[var(--line)]">
            <table className="demo-table text-xs">
              <thead>
                <tr>
                  <th>Time / Date</th>
                  <th>Patient</th>
                  <th>Service</th>
                  <th>Intake & Triage Notes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[var(--sea-ink-soft)]">
                      No appointments recorded yet.
                    </td>
                  </tr>
                ) : (
                  appointments.map((apt: Appointment) => {
                    const start = new Date(apt.startTime);
                    const formattedDate = start.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                    const formattedTime = start.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={apt.id}>
                        <td className="whitespace-nowrap font-mono font-semibold">
                          <div>{formattedDate}</div>
                          <div className="text-blue-400">{formattedTime}</div>
                        </td>
                        <td>
                          <div className="font-bold text-[var(--sea-ink)]">{apt.patientName}</div>
                          <div className="text-[11px] text-[var(--sea-ink-soft)] font-mono">
                            {apt.patientEmail}
                          </div>
                          {apt.patientPhone && (
                            <div className="text-[11px] text-[var(--sea-ink-soft)] font-mono">
                              {apt.patientPhone}
                            </div>
                          )}
                        </td>
                        <td className="font-medium whitespace-nowrap">{apt.serviceName}</td>
                        <td className="max-w-xs">
                          {apt.chiefComplaint ? (
                            <p className="line-clamp-2 italic text-[var(--sea-ink)]">
                              "{apt.chiefComplaint}"
                            </p>
                          ) : (
                            <span className="text-[var(--sea-ink-soft)]">—</span>
                          )}
                          {apt.isFirstVisit && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-bold font-mono">
                              <Star size={11} weight="fill" />
                              <span>New Patient Intake</span>
                            </span>
                          )}
                          {apt.accessibilityNeeds && (
                            <div className="inline-flex items-center gap-1 text-[10px] text-amber-400 mt-1 font-mono">
                              <Wheelchair size={13} weight="bold" />
                              <span>{apt.accessibilityNeeds}</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                              apt.status === "confirmed"
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                                : apt.status === "cancelled"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : "bg-slate-700/20 text-slate-400"
                            }`}
                          >
                            {apt.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 2: Weekly Hours & Lunch Breaks */}
      {activeTab === "schedule" && (
        <section className="demo-card p-6 border-[var(--line)] space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--sea-ink)]">
              Weekly Practice Operating Hours
            </h2>
            <p className="text-xs text-[var(--sea-ink-soft)] mt-0.5">
              Available slots for patients are automatically generated based on these hours,
              excluding configured lunch breaks.
            </p>
          </div>

          <div className="space-y-3">
            {schedules.map((schedule) => {
              const dayBreak = breaks.find((b) => b.scheduleId === schedule.id);

              return (
                <div
                  key={schedule.id}
                  className="p-3.5 rounded-[15px] border border-[var(--line)] bg-[var(--surface-strong)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 w-36 shrink-0">
                    <input
                      type="checkbox"
                      id={`day-${schedule.dayOfWeek}`}
                      checked={schedule.isWorkingDay}
                      onChange={() => handleToggleDay(schedule.dayOfWeek)}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`day-${schedule.dayOfWeek}`}
                      className="font-bold text-sm text-[var(--sea-ink)] cursor-pointer"
                    >
                      {DAY_NAMES[schedule.dayOfWeek]}
                    </label>
                  </div>

                  {schedule.isWorkingDay ? (
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Hours */}
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--sea-ink-soft)] font-mono">Hours:</span>
                        <input
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) =>
                            handleScheduleTimeChange(
                              schedule.dayOfWeek,
                              "startTime",
                              e.target.value,
                            )
                          }
                          className="demo-input demo-input-fit py-1 px-2 text-xs font-mono"
                        />
                        <span>to</span>
                        <input
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) =>
                            handleScheduleTimeChange(schedule.dayOfWeek, "endTime", e.target.value)
                          }
                          className="demo-input demo-input-fit py-1 px-2 text-xs font-mono"
                        />
                      </div>

                      {/* Break */}
                      {dayBreak && (
                        <div className="flex items-center gap-1.5 border-l border-[var(--line)] pl-3 text-[var(--sea-ink-soft)]">
                          <span className="inline-flex items-center gap-1">
                            <Coffee size={14} weight="bold" />
                            <span>Lunch:</span>
                          </span>
                          <input
                            type="time"
                            value={dayBreak.startTime}
                            onChange={(e) =>
                              handleBreakTimeChange(dayBreak.id, "startTime", e.target.value)
                            }
                            className="demo-input demo-input-fit py-1 px-1.5 text-xs font-mono"
                          />
                          <span>-</span>
                          <input
                            type="time"
                            value={dayBreak.endTime}
                            onChange={(e) =>
                              handleBreakTimeChange(dayBreak.id, "endTime", e.target.value)
                            }
                            className="demo-input demo-input-fit py-1 px-1.5 text-xs font-mono"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[var(--sea-ink-soft)] italic font-mono">
                      Closed (Weekend / Off-Duty)
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[var(--line)] flex justify-end">
            <button
              type="button"
              onClick={handleSaveSchedule}
              className="demo-button inline-flex items-center gap-1.5 text-xs font-bold bg-[#1A5BFA] hover:bg-[#1548C7] text-white px-6 py-2.5 shadow-lg shadow-blue-500/20"
            >
              <FloppyDisk size={15} weight="bold" />
              <span>Save Schedule Settings</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
