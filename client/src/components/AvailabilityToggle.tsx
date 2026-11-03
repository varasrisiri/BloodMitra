import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Droplets, CircleOff } from "lucide-react";

interface AvailabilityToggleProps {
  available: boolean;
  onToggle: (available: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function AvailabilityToggle({
  available,
  onToggle,
  disabled = false,
  size = "md",
}: AvailabilityToggleProps) {
  const sizeClasses = {
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-medium",
  };

  return (
    <div className={`flex items-center ${sizeClasses[size]}`}>
      {available ? (
        <Droplets className={`${iconSizes[size]} text-green-600 dark:text-green-400`} />
      ) : (
        <CircleOff className={`${iconSizes[size]} text-muted-foreground`} />
      )}

      <div className="flex items-center gap-2">
        <Switch
          id="availability-toggle"
          checked={available}
          onCheckedChange={onToggle}
          disabled={disabled}
          data-testid="switch-availability"
          className="data-[state=checked]:bg-green-600 data-[state=checked]:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-shadow"
        />
        <Label
          htmlFor="availability-toggle"
          className={`cursor-pointer ${textSizes[size]} ${available
            ? "text-green-600 dark:text-green-400 font-medium"
            : "text-muted-foreground"
            }`}
        >
          {available ? "Available to Donate" : "Not Available"}
        </Label>
      </div>
    </div>
  );
}
