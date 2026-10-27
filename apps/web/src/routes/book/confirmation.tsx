import { createFileRoute, Link } from "@tanstack/react-router";
import { clinicConfig } from "@clinic/config";
import {
  CheckCircleIcon,
  CalendarCheckIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  CheckIcon,
  MapPinIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from "@phosphor-icons/react";
import { getAppointmentsFn } from "../../lib/server-fns";
import { useToast } from "../../components/Toast";

export const Route = createFileRoute("/book/confirmation")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: (search.id as string) || "",
    };
  },
  loaderDeps: ({ search: { id } }) => ({ id }),
  loader: async ({ deps }) => {
    const { appointments } = await getAppointmentsFn();
    const appointment = appointments.find((a) => a.id === deps.id) || appointments[0];
    return {
      appointment,
    };
  },
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { appointment } = Route.useLoaderData();
  const { toast } = useToast();

  if (!appointment) {
    return (
      <div className="page-wrap py-12 text-center space-y-4">
        <h1 className="text-2xl font-bold">Appointment Record Not Found</h1>
        <Link to="/" className="demo-button">
          Return to Clinic Home
        </Link>
      </div>
    );
  }

  const startDate = new Date(appointment.startTime);
  const formattedDate = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const isoStart = startDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
  const endDate = new Date(appointment.endTime);
  const isoEnd = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
  const gcalTitle = encodeURIComponent(
    `${appointment.serviceName} - ${clinicConfig.identity.doctorName}`,
  );
  const gcalDetails = encodeURIComponent(
    `Consultation with ${clinicConfig.identity.doctorName} at ${clinicConfig.identity.clinicName}.\nAddress: ${clinicConfig.contact.address.street}, ${clinicConfig.contact.address.city}`,
  );
  const gcalLocation = encodeURIComponent(
    `${clinicConfig.contact.address.street}, ${clinicConfig.contact.address.city}, ${clinicConfig.contact.address.state}`,
  );
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${gcalTitle}&dates=${isoStart}/${isoEnd}&details=${gcalDetails}&location=${gcalLocation}`;

  const downloadIcs = () => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Apex Health//Clinic Booking//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${appointment.id}@apexwellnessclinic.com`,
      `DTSTAMP:${isoStart}`,
      `DTSTART:${isoStart}`,
      `DTEND:${isoEnd}`,
      `SUMMARY:${appointment.serviceName} - ${clinicConfig.identity.doctorName}`,
      `DESCRIPTION:${appointment.serviceName} with ${clinicConfig.identity.doctorName} at ${clinicConfig.identity.clinicName}.\\nPatient: ${appointment.patientName}`,
      `LOCATION:${clinicConfig.contact.address.street}\\, ${clinicConfig.contact.address.city}\\, ${clinicConfig.contact.address.state}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `appointment-${appointment.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      type: "success",
      title: "Calendar File Saved",
      message: "The .ics calendar invite has been downloaded to your device.",
    });
  };

  return (
    <div className="page-wrap py-10 sm:py-16 space-y-8 max-w-3xl">
      {/* Confirmation Banner */}
      <div className="demo-panel p-6 sm:p-10 border-[var(--line)] rounded-[15px] text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-500 mx-auto border border-blue-500/25">
          <CheckCircleIcon size={36} weight="bold" />
        </div>

        <span className="island-kicker block">Booking Confirmed</span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[var(--sea-ink)] tracking-tight">
          Confirmed for {appointment.patientName.split(" ")[0]}
        </h1>
        <p className="text-xs sm:text-sm text-[var(--sea-ink-soft)] max-w-lg mx-auto leading-relaxed">
          Your appointment is confirmed on {clinicConfig.identity.doctorName}'s schedule.
        </p>

        {/* Details Card */}
        <div className="demo-card max-w-md mx-auto p-5 text-left border-[var(--line)] rounded-[15px] space-y-3 text-xs sm:text-sm font-mono">
          <div className="flex justify-between border-b border-[var(--line)] pb-2">
            <span className="text-[var(--sea-ink-soft)] font-sans">Reference ID:</span>
            <span className="font-bold text-[var(--sea-ink)]">{appointment.id}</span>
          </div>
          <div className="flex justify-between border-b border-[var(--line)] pb-2">
            <span className="text-[var(--sea-ink-soft)] font-sans">Consultation:</span>
            <span className="font-bold text-[var(--sea-ink)] font-sans">
              {appointment.serviceName}
            </span>
          </div>
          <div className="flex justify-between border-b border-[var(--line)] pb-2">
            <span className="text-[var(--sea-ink-soft)] font-sans">Practitioner:</span>
            <span className="font-bold text-[var(--sea-ink)] font-sans">
              {clinicConfig.identity.doctorName}
            </span>
          </div>
          <div className="flex justify-between border-b border-[var(--line)] pb-2">
            <span className="text-[var(--sea-ink-soft)] font-sans">Date & Time:</span>
            <span className="font-bold text-blue-500">
              {formattedDate} at {formattedTime}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--sea-ink-soft)] font-sans">Payment Policy:</span>
            <span className="font-semibold text-emerald-500">Pay at Reception</span>
          </div>
        </div>

        {/* Calendar Sync Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noreferrer"
            className="demo-button inline-flex items-center gap-1.5 text-xs font-bold bg-[#1A5BFA] hover:bg-[#1548C7] text-white shadow-lg shadow-blue-500/20"
          >
            <CalendarCheckIcon size={16} weight="bold" />
            <span>Add to Google Calendar</span>
          </a>
          <button
            type="button"
            onClick={downloadIcs}
            className="demo-button demo-button-secondary inline-flex items-center gap-1.5 text-xs font-bold"
          >
            <DownloadSimpleIcon size={16} weight="bold" />
            <span>Download .ics File (Apple / Outlook)</span>
          </button>
        </div>
      </div>

      {/* Arrival Checklist & Preparation Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="feature-card p-5 rounded-[15px] border border-[var(--line)] space-y-3">
          <h3 className="font-bold text-sm text-[var(--sea-ink)] flex items-center gap-2">
            <FileTextIcon size={16} weight="bold" className="text-blue-500" />
            <span>Visit Checklist</span>
          </h3>
          <ul className="space-y-2 text-xs text-[var(--sea-ink-soft)]">
            {clinicConfig.policies.intakeInstructions.map((item) => (
              <li key={item} className="flex items-start gap-1.5">
                <CheckIcon size={14} weight="bold" className="text-blue-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] font-mono text-[var(--sea-ink-soft)] pt-2 border-t border-[var(--line)]">
            Arrive {clinicConfig.policies.arrivalMinutesEarly} minutes prior to {formattedTime}.
          </p>
        </div>

        <div className="feature-card p-5 rounded-[15px] border border-[var(--line)] space-y-3">
          <h3 className="font-bold text-sm text-[var(--sea-ink)] flex items-center gap-2">
            <MapPinIcon size={16} weight="bold" className="text-blue-500" />
            <span>Getting Here</span>
          </h3>
          <p className="text-xs text-[var(--sea-ink-soft)] leading-relaxed">
            {clinicConfig.contact.address.street}, {clinicConfig.contact.address.suite}
            <br />
            {clinicConfig.contact.address.city}, {clinicConfig.contact.address.state}
          </p>
          <p className="text-xs text-[var(--sea-ink-soft)] leading-relaxed">
            <strong>Parking:</strong> {clinicConfig.contact.address.parkingInstructions}
          </p>
          <a
            href={clinicConfig.contact.address.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 underline hover:text-blue-600"
          >
            <span>Open in Google Maps</span>
            <ArrowRightIcon size={12} weight="bold" />
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
        >
          <ArrowLeftIcon size={13} weight="bold" />
          <span>Return to Clinic Home</span>
        </Link>
        <Link
          to="/patient"
          className="demo-button demo-button-secondary inline-flex items-center gap-1.5 text-xs font-bold"
        >
          <span>View in My Appointments</span>
          <ArrowRightIcon size={13} weight="bold" />
        </Link>
      </div>
    </div>
  );
}
