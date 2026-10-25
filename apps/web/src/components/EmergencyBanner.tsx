import { clinicConfig } from "@clinic/config";
import { Warning, Phone } from "@phosphor-icons/react";

export function EmergencyBanner() {
  return (
    <aside
      aria-label="Emergency Medical Notice"
      className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/25 px-4 py-2 text-xs md:text-sm text-amber-900 dark:text-amber-200"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
            <Warning size={16} weight="bold" />
            <span>MEDICAL NOTICE:</span>
          </span>
          <span className="hidden sm:inline">{clinicConfig.policies.emergencyNotice}</span>
          <span className="sm:hidden">
            In case of medical emergency, please dial 911 immediately.
          </span>
        </div>
        <a
          href={`tel:${clinicConfig.contact.emergencyPhone}`}
          className="shrink-0 inline-flex items-center gap-1 font-bold underline hover:text-amber-950 dark:hover:text-white"
        >
          <Phone size={14} weight="bold" />
          <span>Call 911</span>
        </a>
      </div>
    </aside>
  );
}
