import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BloodGroupBadge } from "./BloodGroupBadge";
import { StatusBadge, PriorityBadge } from "./StatusBadge";
import { MapPin, Clock, User, Check, X, Droplets, Trash2 } from "lucide-react";
import type { BloodRequest, User as UserType } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface RequestCardProps {
  request: BloodRequest & {
    requester?: UserType;
    matchedDonor?: UserType;
  };
  currentUserId?: string;
  onAccept?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;

  onComplete?: (requestId: string) => void;
  onDelete?: (requestId: string) => void;
  variant?: "incoming" | "outgoing" | "hospital";
}

export function RequestCard({
  request,
  currentUserId,
  onAccept,
  onReject,
  onCancel,

  onComplete,
  onDelete,
  variant = "outgoing",
}: RequestCardProps) {
  const isOwnRequest = request.requestedById === currentUserId;
  const isMatchedDonor = request.matchedDonorId === currentUserId;
  const requesterName = request.requester?.name || "Unknown Requester";
  const donorName = request.matchedDonor?.name || "";

  const timeAgo = request.createdAt
    ? formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })
    : "";

  return (
    <Card
      className={`hover-elevate transition-all duration-200 ${request.priority === "emergency" ? "border-red-500/50 dark:border-red-500/30" : ""
        }`}
      data-testid={`card-request-${request.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <BloodGroupBadge bloodGroup={request.bloodGroup} size="md" />
            <StatusBadge status={request.status || "pending"} />
            {request.priority === "emergency" && (
              <PriorityBadge priority={request.priority} />
            )}
          </div>
          {request.unitsNeeded && request.unitsNeeded > 1 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Droplets className="h-4 w-4" />
              <span>{request.unitsNeeded} units</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{request.location}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          <span>{timeAgo}</span>
        </div>

        {variant !== "outgoing" && request.requester && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Requested by: <span className="font-medium">{requesterName}</span></span>
          </div>
        )}

        {request.matchedDonor && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Donor: <span className="font-medium text-green-600 dark:text-green-400">{donorName}</span></span>
          </div>
        )}

        {request.notes && (
          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
            {request.notes}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2 flex-wrap">
          {variant === "incoming" && request.status === "pending" && onAccept && onReject && (
            <>
              <Button
                size="sm"
                onClick={() => onAccept(request.id)}
                data-testid={`button-accept-request-${request.id}`}
                className="shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-shadow"
              >
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(request.id)}
                className="border-primary text-primary hover:bg-primary/10 hover:text-primary"
                data-testid={`button-reject-request-${request.id}`}
              >
                <X className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </>
          )}

          {isOwnRequest && request.status === "pending" && onCancel && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onCancel(request.id)}
              data-testid={`button-cancel-request-${request.id}`}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Request
            </Button>
          )}

          {(isOwnRequest || variant === "hospital") && request.status === "accepted" && onComplete && (
            <Button
              size="sm"
              onClick={() => onComplete(request.id)}
              data-testid={`button-complete-request-${request.id}`}
              className="shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-shadow"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark Completed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
