import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BloodGroupBadge } from "./BloodGroupBadge";
import { Progress } from "@/components/ui/progress";
import { Plus, Minus, AlertTriangle } from "lucide-react";
import type { BloodGroup } from "@shared/schema";

interface BloodInventoryCardProps {
  bloodGroup: BloodGroup;
  units: number;
  maxUnits?: number;
  onAdd?: () => void;
  onRemove?: () => void;
  readonly?: boolean;
}

export function BloodInventoryCard({
  bloodGroup,
  units,
  maxUnits = 50,
  onAdd,
  onRemove,
  readonly = false,
}: BloodInventoryCardProps) {
  const percentage = Math.min((units / maxUnits) * 100, 100);
  const isLowStock = units < 5;
  const isCritical = units === 0;

  return (
    <Card 
      className={`hover-elevate transition-all duration-200 ${
        isCritical 
          ? "border-red-500/50 dark:border-red-500/30 bg-red-50/50 dark:bg-red-950/20" 
          : isLowStock 
            ? "border-amber-500/50 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20"
            : ""
      }`}
      data-testid={`card-inventory-${bloodGroup}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <BloodGroupBadge bloodGroup={bloodGroup} size="lg" />
          {(isLowStock || isCritical) && (
            <AlertTriangle className={`h-5 w-5 ${
              isCritical ? "text-red-500" : "text-amber-500"
            }`} />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold" data-testid={`text-units-${bloodGroup}`}>
              {units}
            </span>
            <span className="text-sm text-muted-foreground">units</span>
          </div>

          <Progress 
            value={percentage} 
            className={`h-2 ${
              isCritical 
                ? "[&>div]:bg-red-500" 
                : isLowStock 
                  ? "[&>div]:bg-amber-500" 
                  : "[&>div]:bg-green-500"
            }`}
          />

          {isLowStock && (
            <p className={`text-xs font-medium ${
              isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
            }`}>
              {isCritical ? "Out of stock!" : "Low stock warning"}
            </p>
          )}
        </div>

        {!readonly && (
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="icon"
              variant="outline"
              onClick={onRemove}
              disabled={units === 0}
              data-testid={`button-remove-${bloodGroup}`}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={onAdd}
              data-testid={`button-add-${bloodGroup}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
