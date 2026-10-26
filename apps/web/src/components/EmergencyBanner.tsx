import { clinicConfig } from "@clinic/config";
import { Warning, Phone } from "@phosphor-icons/react";

export function EmergencyBanner() {
  return (
    <aside
      aria-label="Emergency Medical Notice"
      className="bg-[#0b1736] dark:bg-[#070e22] border-b border-[#1b2d56] px-4 py-2 text-xs md:text-sm text-slate-100 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <span className="shrink-0 inline-flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/35">
            <Warning size={14} weight="bold" className="text-amber-400" />
            <span>Medical Notice</span>
          </span>
          <span className="text-slate-200 hidden sm:inline leading-snug">
            {clinicConfig.policies.emergencyNotice}
          </span>
          <span className="text-slate-200 sm:hidden leading-snug">
            In case of medical emergency, please dial 911 immediately.
          </span>
        </div>
        <a
          href={`tel:${clinicConfig.contact.emergencyPhone}`}
          className="shrink-0 inline-flex items-center gap-1.5 font-bold text-xs !text-white bg-rose-600 hover:bg-rose-500 px-3 py-1 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95 !no-underline"
        >
          <Phone size={13} weight="fill" className="!text-white" />
          <span>Call 911</span>
        </a>
      </div>
    </aside>
  );
}
