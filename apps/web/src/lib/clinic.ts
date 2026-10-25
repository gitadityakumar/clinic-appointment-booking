import { clinicConfig } from "@clinic/config";

export { clinicConfig };

export function formatPrice(cents: number): string {
  if (cents === 0) return "Complimentary / In-Network";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours} hour${hours > 1 ? "s" : ""}`;
}
