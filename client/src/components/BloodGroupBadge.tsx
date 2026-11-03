import { Badge } from "@/components/ui/badge";
import type { BloodGroup } from "@shared/schema";

interface BloodGroupBadgeProps {
  bloodGroup: BloodGroup;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BloodGroupBadge({ bloodGroup, size = "md", className = "" }: BloodGroupBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-2xl font-bold px-4 py-2",
  };

  return (
    <Badge
      variant="outline"
      className={`bg-primary/10 text-primary border-primary/30 font-semibold ${sizeClasses[size]} ${className}`}
      data-testid={`badge-blood-group-${bloodGroup}`}
    >
      {bloodGroup}
    </Badge>
  );
}
