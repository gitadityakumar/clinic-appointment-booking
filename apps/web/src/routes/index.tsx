import { createFileRoute, Link } from "@tanstack/react-router";
import { clinicConfig } from "@clinic/config";
import {
  ArrowRight,
  Phone,
  Check,
  MapPin,
  Clock,
  Car,
  Train,
  ShieldCheck,
} from "@phosphor-icons/react";
import { formatDuration, formatPrice } from "../lib/clinic";
import { getServicesFn } from "../lib/server-fns";

export const Route = createFileRoute("/")({
  loader: async () => {
    return await getServicesFn();
  },
  component: HomePage,
});

function HomePage() {
  const { services } = Route.useLoaderData();

  return (
    <div className="page-wrap py-8 sm:py-14 space-y-12 sm:space-y-16">
      {/* Hero Section */}
      <section className="demo-panel overflow-hidden border-[var(--line)] p-6 sm:p-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-mono font-bold text-blue-500">
              <span className="h-2 w-2 rounded-full bg-[#1A5BFA] animate-pulse" />
              {clinicConfig.identity.brandBadge}
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--sea-ink)] leading-[1.08]">
              Modern Clinical Care, Direct At The Edge.
            </h1>

            <p className="text-base sm:text-lg text-[var(--sea-ink-soft)] leading-relaxed">
              {clinicConfig.identity.doctorBio}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/book"
                className="demo-button inline-flex items-center gap-2 text-sm sm:text-base font-bold bg-[#1A5BFA] hover:bg-[#1548C7] text-white border-transparent px-6 py-3 shadow-lg shadow-blue-500/30"
              >
                <span>Schedule Consultation</span>
                <ArrowRight size={16} weight="bold" />
              </Link>
              <a
                href={`tel:${clinicConfig.contact.phone}`}
                className="demo-button demo-button-secondary inline-flex items-center gap-2 text-sm sm:text-base px-5 py-3 font-mono"
              >
                <Phone size={15} weight="bold" />
                <span>{clinicConfig.contact.formattedPhone}</span>
              </a>
            </div>

            {/* Doctor Credentials */}
            <div className="pt-5 border-t border-[var(--line)]">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--sea-ink-soft)] block mb-2">
                Board Certifications & Credentials
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--sea-ink-soft)]">
                {clinicConfig.identity.doctorQualifications.map((qual) => (
                  <li key={qual} className="flex items-start gap-1.5">
                    <Check size={14} weight="bold" className="text-blue-500 shrink-0 mt-0.5" />
                    <span>{qual}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-sm rounded-[15px] overflow-hidden border border-[var(--line)] shadow-2xl bg-[var(--surface-strong)]">
              <img
                src={clinicConfig.identity.avatarUrl}
                alt={clinicConfig.identity.doctorName}
                className="w-full h-80 object-cover object-top"
                loading="lazy"
              />
              <div className="p-4 bg-[var(--surface-strong)]">
                <h3 className="font-bold text-base text-[var(--sea-ink)]">
                  {clinicConfig.identity.doctorName}
                </h3>
                <p className="text-xs text-[var(--sea-ink-soft)] font-medium">
                  {clinicConfig.identity.doctorTitle}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs font-mono text-[var(--sea-ink-soft)] pt-2 border-t border-[var(--line)]">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} weight="bold" className="text-blue-500" />
                    <span>
                      {clinicConfig.contact.address.city}, {clinicConfig.contact.address.state}
                    </span>
                  </span>
                  <span className="text-emerald-500 font-semibold">● Open for Intake</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="island-kicker block mb-1">Clinical Catalog</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--sea-ink)] tracking-tight">
              Select Your Consultation
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--sea-ink-soft)] max-w-md">
            Individual, unhurried time with Dr. Jenkins. Real-time availability refreshed with
            Cloudflare KV edge caching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {services.map((service) => (
            <div
              key={service.id}
              className="feature-card rounded-[15px] p-6 border border-[var(--line)] flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-lg font-bold text-[var(--sea-ink)]">{service.name}</h3>
                  <span className="shrink-0 text-sm font-mono font-extrabold text-blue-500 px-2.5 py-1 rounded-md bg-blue-500/10">
                    {formatPrice(service.priceCents)}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--sea-ink-soft)] leading-relaxed">
                  {service.description}
                </p>
                <div className="flex items-center gap-3 text-xs font-mono text-[var(--sea-ink-soft)]">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} weight="bold" />
                    <span>{formatDuration(service.durationMinutes)}</span>
                  </span>
                  <span>•</span>
                  <span>Pay at Clinic Reception</span>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-[var(--line)]">
                <Link
                  to="/book/$serviceId"
                  params={{ serviceId: service.id }}
                  className="demo-button inline-flex items-center justify-center gap-1.5 w-full text-center text-xs sm:text-sm font-bold bg-[#1A5BFA] hover:bg-[#1548C7] text-white shadow-md shadow-blue-500/20"
                >
                  <span>Choose Time & Book</span>
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Location, Parking & Preparation */}
      <section className="demo-panel rounded-[15px] border-[var(--line)] p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <span className="island-kicker block">Office & Logistics</span>
            <h3 className="text-xl font-bold text-[var(--sea-ink)]">Clinic Location & Access</h3>
            <p className="text-xs sm:text-sm text-[var(--sea-ink-soft)] leading-relaxed">
              <strong>Address:</strong> {clinicConfig.contact.address.street},{" "}
              {clinicConfig.contact.address.suite}, {clinicConfig.contact.address.city},{" "}
              {clinicConfig.contact.address.state} {clinicConfig.contact.address.postalCode}
            </p>
            <p className="text-xs text-[var(--sea-ink-soft)] leading-relaxed flex items-center gap-1.5">
              <Car size={15} weight="bold" className="text-blue-500 shrink-0" />
              <span>
                <strong>Parking:</strong> {clinicConfig.contact.address.parkingInstructions}
              </span>
            </p>
            <p className="text-xs text-[var(--sea-ink-soft)] leading-relaxed flex items-center gap-1.5">
              <Train size={15} weight="bold" className="text-blue-500 shrink-0" />
              <span>
                <strong>Transit:</strong> {clinicConfig.contact.address.publicTransitNote}
              </span>
            </p>
            <a
              href={clinicConfig.contact.address.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 underline hover:text-blue-600"
            >
              <span>Open in Google Maps</span>
              <ArrowRight size={12} weight="bold" />
            </a>
          </div>

          <div className="space-y-4 border-t md:border-t-0 md:border-l border-[var(--line)] pt-6 md:pt-0 md:pl-8">
            <span className="island-kicker block">Preparation</span>
            <h3 className="text-xl font-bold text-[var(--sea-ink)]">Pre-Visit Checklist</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-[var(--sea-ink-soft)]">
              {clinicConfig.policies.intakeInstructions.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-blue-500 font-bold">●</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 p-3 rounded-[12px] bg-blue-500/10 text-xs text-blue-400 border border-blue-500/20 font-mono flex items-start gap-2">
              <ShieldCheck size={16} weight="bold" className="shrink-0 mt-0.5 text-blue-400" />
              <span>
                Plan to arrive {clinicConfig.policies.arrivalMinutesEarly} minutes early for
                front-desk check-in.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
