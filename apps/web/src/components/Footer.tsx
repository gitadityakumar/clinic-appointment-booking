import { clinicConfig } from "@clinic/config";
import { CheckCircle, ShieldCheck, ArrowRight } from "@phosphor-icons/react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-[var(--line)] bg-[var(--header-bg)] px-4 pb-14 pt-12 text-[var(--sea-ink-soft)]">
      <div className="page-wrap grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {/* Clinic & Doctor Details */}
        <div>
          <h3 className="font-bold text-[var(--sea-ink)] text-base mb-2">
            {clinicConfig.identity.clinicName}
          </h3>
          <p className="text-xs text-[var(--sea-ink-soft)] mb-3 leading-relaxed">
            {clinicConfig.identity.doctorName}, {clinicConfig.identity.doctorTitle}
          </p>
          <p className="text-xs leading-relaxed text-[var(--sea-ink-soft)]">
            {clinicConfig.identity.tagline}
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 font-semibold border border-teal-500/20">
            <CheckCircle size={14} weight="bold" />
            <span>{clinicConfig.identity.brandBadge}</span>
          </div>
        </div>

        {/* Location & Directions */}
        <div>
          <h3 className="font-bold text-[var(--sea-ink)] text-base mb-2">
            Clinic Location & Hours
          </h3>
          <address className="not-italic text-xs leading-relaxed text-[var(--sea-ink-soft)] mb-3">
            {clinicConfig.contact.address.street}
            {clinicConfig.contact.address.suite ? `, ${clinicConfig.contact.address.suite}` : ""}
            <br />
            {clinicConfig.contact.address.city}, {clinicConfig.contact.address.state}{" "}
            {clinicConfig.contact.address.postalCode}
          </address>
          <p className="text-xs text-[var(--sea-ink-soft)] mb-3">
            <strong>Hours:</strong> {clinicConfig.contact.hoursDisplay}
          </p>
          <a
            href={clinicConfig.contact.address.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400 underline hover:text-teal-800"
          >
            <span>Get Directions on Google Maps</span>
            <ArrowRight size={12} weight="bold" />
          </a>
        </div>

        {/* Payment & Policies */}
        <div>
          <h3 className="font-bold text-[var(--sea-ink)] text-base mb-2">
            Payment & Notice Policies
          </h3>
          <p className="text-xs mb-2">
            <strong>Accepted at Check-in:</strong>
          </p>
          <ul className="text-xs space-y-1 list-disc list-inside mb-4">
            {clinicConfig.policies.acceptedPaymentMethods.map((method) => (
              <li key={method}>{method}</li>
            ))}
          </ul>
          <p className="text-xs text-[var(--sea-ink-soft)] leading-relaxed">
            <strong>Cancellation Notice:</strong> Cancellations permitted up to{" "}
            {clinicConfig.policies.cancellationNoticeHours} hours before scheduled appointment.
          </p>
        </div>
      </div>

      <div className="page-wrap border-t border-[var(--line)] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <p className="m-0">
          &copy; {year} {clinicConfig.identity.clinicName}. All medical rights reserved.
        </p>
        <p className="m-0 text-[var(--sea-ink-soft)] inline-flex items-center gap-1.5">
          <ShieldCheck size={14} weight="bold" className="text-blue-500" />
          <span>{clinicConfig.identity.clinicName} • Official Patient Booking Portal</span>
        </p>
      </div>
    </footer>
  );
}
