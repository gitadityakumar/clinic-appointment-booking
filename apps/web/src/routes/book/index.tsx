import { createFileRoute, Link } from "@tanstack/react-router";
import { ClockIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { formatDuration, formatPrice } from "../../lib/clinic";
import { getServicesFn } from "../../lib/server-fns";

export const Route = createFileRoute("/book/")({
  loader: async () => {
    return await getServicesFn();
  },
  component: BookServicesPage,
});

function BookServicesPage() {
  const { services } = Route.useLoaderData();

  return (
    <div className="page-wrap py-8 sm:py-12 space-y-8 max-w-4xl">
      <div className="text-center space-y-2">
        <span className="island-kicker">Step 1 of 3</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--sea-ink)] tracking-tight">
          Select Your Consultation Type
        </h1>
        <p className="text-sm text-[var(--sea-ink-soft)] max-w-md mx-auto">
          Choose the service that best matches your healthcare needs to view real-time appointment
          availability.
        </p>
      </div>

      <div className="space-y-4">
        {services.map((service) => (
          <Link
            key={service.id}
            to="/book/$serviceId"
            params={{ serviceId: service.id }}
            className="block feature-card p-6 rounded-[15px] border border-[var(--line)] hover:border-blue-500/50 transition no-underline text-inherit"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-[var(--sea-ink)]">{service.name}</h2>
                  <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
                    <ClockIcon size={12} weight="bold" />
                    <span>{formatDuration(service.durationMinutes)}</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[var(--sea-ink-soft)] leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="shrink-0 flex items-center justify-between sm:flex-col sm:items-end gap-2">
                <span className="text-base font-mono font-extrabold text-blue-500">
                  {formatPrice(service.priceCents)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-400">
                  <span>Select Time & Date</span>
                  <ArrowRightIcon size={13} weight="bold" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
