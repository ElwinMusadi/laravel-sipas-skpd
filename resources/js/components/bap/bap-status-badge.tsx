import { Badge } from "@/components/ui/badge";

export type BapStatus =
  | "draft"
  | "submitted"
  | "under_verification"
  | "needs_clarification"
  | "waiting_reverification_phase_1"
  | "waiting_verification_phase_2"
  | "under_verification_phase_2"
  | "waiting_reverification_phase_2"
  | "verified_phase_2"
  | "completed";

const statusPresentation: Record<
  BapStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "border-border bg-muted text-muted-foreground",
  },
  submitted: {
    label: "Menunggu Verifikasi Tahap 1",
    className: "border-primary/30 bg-primary/15 text-primary",
  },
  under_verification: {
    label: "Sedang Diverifikasi Tahap 1",
    className: "border-primary/30 bg-primary/15 text-primary",
  },
  needs_clarification: {
    label: "Perlu Klarifikasi",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  waiting_reverification_phase_1: {
    label: "Menunggu Verifikasi Ulang Tahap 1",
    className: "border-primary/30 bg-primary/15 text-primary",
  },
  waiting_verification_phase_2: {
    label: "Menunggu Verifikasi Tahap 2",
    className:
      "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  under_verification_phase_2: {
    label: "Sedang Diverifikasi Tahap 2",
    className: "border-primary/30 bg-primary/15 text-primary",
  },
  waiting_reverification_phase_2: {
    label: "Menunggu Verifikasi Ulang Tahap 2",
    className:
      "border-amber-600/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  verified_phase_2: {
    label: "Lulus Verifikasi Tahap 2",
    className:
      "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  completed: {
    label: "Selesai Administratif",
    className:
      "border-emerald-600/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
};

/**
 * Status filter options in lifecycle order, using the same labels as the badge.
 */
export const bapStatusOptions: { value: BapStatus; label: string }[] = (
  Object.keys(statusPresentation) as BapStatus[]
).map((value) => ({ value, label: statusPresentation[value].label }));

export function BapStatusBadge({
  status,
  className,
}: {
  status: BapStatus;
  className?: string;
}) {
  const presentation = statusPresentation[status];

  return (
    <Badge
      variant="outline"
      className={`${presentation.className} ${className ?? ""}`}
    >
      {presentation.label}
    </Badge>
  );
}
