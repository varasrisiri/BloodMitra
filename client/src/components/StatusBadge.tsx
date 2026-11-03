import { Badge } from "@/components/ui/badge";
import type { RequestStatus, RequestPriority } from "@shared/schema";

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

interface PriorityBadgeProps {
  priority: RequestPriority;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: "Pending",
      classes: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    },
    accepted: {
      label: "Accepted",
      classes: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    },
    completed: {
      label: "Completed",
      classes: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    },
    cancelled: {
      label: "Cancelled",
      classes: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant="outline"
      className={`${config.classes} ${className}`}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const priorityConfig = {
    normal: {
      label: "Normal",
      classes: "bg-secondary text-secondary-foreground border-secondary",
    },
    emergency: {
      label: "Emergency",
      classes: "bg-red-600 text-white dark:bg-red-700 border-red-700 animate-pulse",
    },
  };

  const config = priorityConfig[priority];

  return (
    <Badge
      variant="outline"
      className={`${config.classes} ${className}`}
      data-testid={`badge-priority-${priority}`}
    >
      {config.label}
    </Badge>
  );
}

interface AvailabilityBadgeProps {
  available: boolean;
  className?: string;
}

export function AvailabilityBadge({ available, className = "" }: AvailabilityBadgeProps) {
  if (available) {
    return (
      <Badge
        variant="outline"
        className={`bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 ${className}`}
        data-testid="badge-available"
      >
        <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
        Available
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`bg-muted text-muted-foreground border-muted ${className}`}
      data-testid="badge-unavailable"
    >
      <span className="w-2 h-2 rounded-full bg-muted-foreground/50 mr-1.5" />
      Unavailable
    </Badge>
  );
}
