import { Link } from "@tanstack/react-router";
import { clinicConfig } from "@clinic/config";
import { FirstAid, LockKey, Phone } from "@phosphor-icons/react";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-xl">
      <nav className="page-wrap flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 sm:py-4">
        {/* Clinic Identity & Doctor info */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 text-inherit no-underline">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#1A5BFA] text-white shadow-lg shadow-blue-500/25">
              <FirstAid size={22} weight="bold" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-[var(--sea-ink)] leading-tight">
                {clinicConfig.identity.clinicName}
              </span>
              <span className="block text-xs text-[var(--sea-ink-soft)] font-medium">
                {clinicConfig.identity.doctorName} •{" "}
                {clinicConfig.identity.doctorTitle.split(",")[0]}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation links */}
        <div className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-1 pb-1 text-sm font-semibold sm:order-none sm:w-auto sm:flex-nowrap sm:pb-0">
          <Link to="/" className="nav-link" activeProps={{ className: "nav-link is-active" }}>
            Home
          </Link>
          <Link to="/book" className="nav-link" activeProps={{ className: "nav-link is-active" }}>
            Services & Booking
          </Link>
          <Link
            to="/patient"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            My Appointments
          </Link>
          <Link
            to="/clinic"
            className="nav-link inline-flex items-center gap-1 font-mono text-xs px-2.5 py-1 rounded-full border border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
            activeProps={{ className: "nav-link is-active" }}
          >
            <LockKey size={13} weight="bold" />
            <span>Clinic Staff</span>
          </Link>
        </div>

        {/* Action button & Phone */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href={`tel:${clinicConfig.contact.phone}`}
            className="hidden lg:inline-flex items-center gap-1.5 text-xs font-mono font-semibold px-3 py-1.5 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] no-underline"
          >
            <Phone size={14} weight="bold" />
            <span>{clinicConfig.contact.formattedPhone}</span>
          </a>

          <Link
            to="/book"
            className="demo-button text-xs sm:text-sm font-bold bg-[#1A5BFA] hover:bg-[#1548C7] text-white border-transparent px-4 py-2 shadow-md shadow-blue-500/20"
          >
            Book Now
          </Link>

          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
