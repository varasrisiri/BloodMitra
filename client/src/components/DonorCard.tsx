import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BloodGroupBadge } from "./BloodGroupBadge";
import { AvailabilityBadge } from "./StatusBadge";
import { MapPin, Phone, Droplets, Send } from "lucide-react";
import type { User } from "@shared/schema";

interface DonorCardProps {
  donor: User;
  onRequestBlood?: (donorId: string) => void;
  showActions?: boolean;
}

export function DonorCard({ donor, onRequestBlood, showActions = true }: DonorCardProps) {
  const displayName = donor.name || "Anonymous Donor";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card
      className="hover-elevate transition-all duration-200"
      data-testid={`card-donor-${donor.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/20">
            <AvatarImage src={donor.profileImageUrl || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-semibold text-lg truncate" data-testid={`text-donor-name-${donor.id}`}>
                  {displayName}
                </h3>

              </div>
              {donor.bloodGroup && (
                <BloodGroupBadge bloodGroup={donor.bloodGroup} size="lg" />
              )}
            </div>

            <div className="mt-3 space-y-2">
              {donor.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{donor.location}</span>
                </div>
              )}
              {donor.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{donor.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Droplets className="h-4 w-4 shrink-0" />
                <span>{donor.donationCount || 0} donations</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
              <AvailabilityBadge available={donor.availabilityStatus || false} />

              {showActions && donor.availabilityStatus && onRequestBlood && (
                <Button
                  size="sm"
                  onClick={() => onRequestBlood(donor.id)}
                  data-testid={`button-request-blood-${donor.id}`}
                  className="shadow-[0_0_15px_rgba(239,68,68,0.4)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-shadow text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Request Blood
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
