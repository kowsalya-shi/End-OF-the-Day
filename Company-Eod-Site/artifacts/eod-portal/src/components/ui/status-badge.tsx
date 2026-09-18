import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const displayStatus = status?.trim() || "Not set";
  const normalizedStatus = displayStatus.toLowerCase();

  const statusStyles: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    wip: "bg-amber-100 text-amber-800",
    yts: "bg-blue-100 text-blue-800",
    hold: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800",
    practicing: "bg-yellow-100 text-yellow-800",
    learning: "bg-orange-100 text-orange-800",
    pending: "bg-amber-100 text-amber-800",
    resubmitted: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const style = statusStyles[normalizedStatus] || "bg-gray-100 text-gray-800";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
        style,
        className
      )}
    >
      {displayStatus}
    </span>
  );
}

interface AttendanceBadgeProps {
  status?: string | null;
  className?: string;
}

export function AttendanceBadge({ status, className }: AttendanceBadgeProps) {
  const displayStatus = status?.trim() || "Not set";
  const normalizedStatus = displayStatus.toLowerCase();

  const statusStyles: Record<string, string> = {
    present: "bg-green-100 text-green-800",
    absent: "bg-red-100 text-red-800",
    leave: "bg-purple-100 text-purple-800",
    "half-day": "bg-orange-100 text-orange-800",
  };

  const style = statusStyles[normalizedStatus] || "bg-gray-100 text-gray-800";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
        style,
        className
      )}
    >
      {displayStatus.replace("-", " ")}
    </span>
  );
}

