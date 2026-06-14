import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfigs: Record<string, { label: string; className: string }> = {
  // account_status & general active/inactive
  active: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/15",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/15",
  },
  suspended: {
    label: "Suspended",
    className: "bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/15",
  },
  disabled: {
    label: "Disabled",
    className: "bg-muted text-muted-foreground border border-muted-foreground/10",
  },

  // course_status & session status
  draft: {
    label: "Draft",
    className: "bg-sky-500/10 text-sky-650 border border-sky-500/20 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/15",
  },
  archived: {
    label: "Archived",
    className: "bg-zinc-500/10 text-zinc-650 border border-zinc-500/20 dark:text-zinc-400 dark:bg-zinc-800/40",
  },
  open: {
    label: "Open",
    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/15 font-bold animate-pulse",
  },
  closed: {
    label: "Closed",
    className: "bg-zinc-500/10 text-zinc-650 border border-zinc-500/15 dark:text-zinc-400 dark:bg-zinc-850/40",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-450 dark:bg-rose-500/10 dark:border-rose-500/15",
  },

  // enrolment_status
  withdrawn: {
    label: "Withdrawn",
    className: "bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-450 dark:bg-rose-500/10 dark:border-rose-500/15",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/15",
  },

  // attendance_status
  present: {
    label: "Present",
    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/15",
  },
  late: {
    label: "Late",
    className: "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/15",
  },
  manually_present: {
    label: "Manual",
    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/15",
  },
  excused: {
    label: "Excused",
    className: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/15",
  },
  absent: {
    label: "Absent",
    className: "bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-450 dark:bg-rose-500/10 dark:border-rose-500/15",
  },

  // review_status
  not_required: {
    label: "Not Required",
    className: "bg-zinc-500/10 text-zinc-500 border border-transparent dark:text-zinc-400",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/15",
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-450 dark:bg-rose-500/10 dark:border-rose-500/15",
  },

  // result states
  accepted: {
    label: "Accepted",
    className: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/15",
  },
  requires_review: {
    label: "Requires Review",
    className: "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/15",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toLowerCase().replace(/_/g, " ");
  const key = status.toLowerCase();
  
  // Find config matching exactly, or by partial keys
  let config = statusConfigs[key];
  if (!config) {
    // Attempt fallback normalized keys
    config = statusConfigs[normalized] || {
      label: status,
      className: "bg-secondary/80 text-secondary-foreground border border-border",
    };
  }

  return (
    <Badge
      className={cn(
        "px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider rounded-full shadow-sm select-none border backdrop-blur-md",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
