import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DonorCard } from "@/components/DonorCard";
import { RequestCard } from "@/components/RequestCard";
import { BloodGroupBadge } from "@/components/BloodGroupBadge";
import { AvailabilityBadge, VerificationBadge } from "@/components/StatusBadge";
import { AvailabilityToggle } from "@/components/AvailabilityToggle";
import { StatsCard } from "@/components/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Droplets,
  LogOut,
  Search,
  Plus,
  Inbox,
  Send,
  History,
  MapPin,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  UserCircle,
  Calendar,
  Heart,
  Users,
  AlertCircle,
  Megaphone,
  Clock
} from "lucide-react";
import type { User, BloodRequest, BloodGroup, Announcement } from "@shared/schema";
import { AnnouncementCard } from "@/components/AnnouncementCard";
import { BloodMitraLogo } from "@/components/BloodMitraLogo";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

interface CreateRequestFormData {
  bloodGroup: BloodGroup | "";
  location: string;
  priority: "normal" | "emergency";
  unitsNeeded: number;
  notes: string;
  hospitalId: string;
}

function ProfileCard({ user, onToggleAvailability, isUpdating }: {
  user: User;
  onToggleAvailability: (val: boolean, field: "canDonate" | "availabilityStatus") => void;
  isUpdating: boolean;
}) {
  const { toast } = useToast();
  const displayName = user.name || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      await apiRequest("POST", "/api/users/me/avatar", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "auth", "user"] });
      toast({ title: "Success", description: "Profile picture updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload profile picture.", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
        return;
      }
      uploadAvatarMutation.mutate(file);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start gap-6 flex-wrap">
          <div className="relative group">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <label
              htmlFor="avatar-upload"
              className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity"
            >
              <div className="text-xs font-medium text-center px-2">
                {uploadAvatarMutation.isPending ? "..." : "Change"}
              </div>
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadAvatarMutation.isPending}
            />
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold" data-testid="text-user-name">
                  {displayName}
                </h2>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {user.bloodGroup && (
                    <BloodGroupBadge bloodGroup={user.bloodGroup} size="md" />
                  )}
                  <AvailabilityBadge available={user.availabilityStatus || false} />
                  <VerificationBadge isVerified={user.isVerified || false} status={(user as any).verificationStatus} />
                </div>
              </div>

              <div className="flex flex-col gap-4 items-end">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground mr-2">Donation Capability</span>
                  <Switch
                    checked={user.canDonate || false}
                    onCheckedChange={(checked) => onToggleAvailability(checked, "canDonate")}
                    disabled={isUpdating}
                    className="data-[state=checked]:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-shadow"
                  />
                </div>

                {user.canDonate && (
                  <AvailabilityToggle
                    available={user.availabilityStatus || false}
                    onToggle={(checked) => onToggleAvailability(checked, "availabilityStatus")}
                    disabled={isUpdating}
                    size="lg"
                  />
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t">
              {user.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate max-w-[200px]">{user.location}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <Droplets className="h-4 w-4 shrink-0" />
                <span>{user.donationCount || 0} donations</span>
              </div>
              {user.lastDonationDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Last: {new Date(user.lastDonationDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DonorSearch({ onOpenCreateDialog }: { onOpenCreateDialog: (initialData?: Partial<CreateRequestFormData>) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

  const { data: donors, isLoading } = useQuery<User[]>({
    queryKey: ["/api/donors", bloodGroupFilter, locationFilter, showOnlyAvailable],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/donors?bloodGroup=${encodeURIComponent(bloodGroupFilter)}&location=${locationFilter}&available=${showOnlyAvailable}`);
      return res.json();
    }
  });

  const filteredDonors = donors?.filter((donor) => {
    if (donor.id === user?.id) return false;
    if (bloodGroupFilter !== "all" && donor.bloodGroup !== bloodGroupFilter) return false;
    if (locationFilter && !donor.location?.toLowerCase().includes(locationFilter.toLowerCase())) return false;
    if (showOnlyAvailable && !donor.availabilityStatus) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Donors
          </CardTitle>
          <CardDescription>Find available blood donors in your area</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="blood-group-filter">Blood Group</Label>
              <Select value={bloodGroupFilter} onValueChange={setBloodGroupFilter}>
                <SelectTrigger id="blood-group-filter" data-testid="select-blood-group-filter">
                  <SelectValue placeholder="All blood groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Blood Groups</SelectItem>
                  {BLOOD_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-filter">Location</Label>
              <Input
                id="location-filter"
                placeholder="Search by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                data-testid="input-location-filter"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant={showOnlyAvailable ? "default" : "outline"}
                onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                className={`w-full ${!showOnlyAvailable ? "border-primary text-primary hover:bg-primary/10 hover:text-primary" : ""}`}
                data-testid="button-toggle-available"
              >
                {showOnlyAvailable ? "Showing Available Only" : "Show All"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDonors.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No donors found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search filters or check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDonors.map((donor) => (
            <DonorCard
              key={donor.id}
              donor={donor}
              onRequestBlood={(donorId) => {
                if (!user?.isVerified) {
                  toast({
                    title: "Verification Required",
                    description: "Please wait for a hospital to verify your account.",
                    variant: "destructive",
                  });
                  return;
                }
                onOpenCreateDialog({
                  bloodGroup: donor.bloodGroup as BloodGroup,
                  location: donor.location || "",
                });
              }}
              showActions={user?.id !== donor.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MyRequests({
  onOpenCreateDialog,
  acceptMutation,
  cancelMutation,
  completeMutation
}: {
  onOpenCreateDialog: () => void;
  acceptMutation: any;
  cancelMutation: any;
  completeMutation: any;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: myRequests, isLoading: loadingMyRequests } = useQuery<BloodRequest[]>({
    queryKey: ["/api/requests", "my"],
  });

  const { data: incomingRequests, isLoading: loadingIncoming } = useQuery<BloodRequest[]>({
    queryKey: ["/api/requests", "incoming"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold">Blood Requests</h2>
        <Button
          onClick={() => onOpenCreateDialog()}
          data-testid="button-create-request"
          className="shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-shadow"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Request
        </Button>
      </div>

      <Tabs defaultValue="outgoing" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="outgoing" className="gap-2" data-testid="tab-outgoing">
            <Send className="h-4 w-4" />
            My Requests
          </TabsTrigger>
          <TabsTrigger value="incoming" className="gap-2" data-testid="tab-incoming">
            <Inbox className="h-4 w-4" />
            Incoming
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outgoing" className="mt-6">
          {loadingMyRequests ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-24 mb-3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !myRequests?.length ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a blood request to find available donors.
                </p>
                <Button
                  onClick={() => onOpenCreateDialog()}
                  data-testid="button-create-first-request"
                  className="shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-shadow"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  currentUserId={user?.id}
                  variant="outgoing"
                  onCancel={(id) => cancelMutation.mutate(id)}
                  onComplete={(id) => completeMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="incoming" className="mt-6">
          {loadingIncoming ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-24 mb-3" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !incomingRequests?.length ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No incoming requests</h3>
                <p className="text-muted-foreground">
                  {user?.availabilityStatus
                    ? "You'll see blood requests matching your profile here."
                    : "Turn on your availability to receive blood requests."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  currentUserId={user?.id}
                  variant="incoming"
                  onAccept={(id) => {
                    if (!user?.isVerified) {
                      toast({
                        title: "Verification Required",
                        description: "You must be verified by a hospital before you can accept blood requests.",
                        variant: "destructive",
                      });
                      return;
                    }
                    acceptMutation.mutate(id);
                  }}
                  onReject={(id) => cancelMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div >
  );
}

function DonationHistory() {
  const { user } = useAuth();

  const { data: completedDonations, isLoading } = useQuery<BloodRequest[]>({
    queryKey: ["/api/requests", "completed"],
  });

  const donationCount = user?.donationCount || 0;
  const lastDonation = user?.lastDonationDate
    ? new Date(user.lastDonationDate).toLocaleDateString()
    : "No donations yet";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Donations"
          value={donationCount}
          icon={Droplets}
          description="Your lifetime contribution"
        />
        <StatsCard
          title="Last Donation"
          value={lastDonation}
          icon={Calendar}
          description="Keep up the great work!"
        />
        <StatsCard
          title="Lives Impacted"
          value={donationCount * 3}
          icon={Heart}
          description="Each donation saves up to 3 lives"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Donation History
          </CardTitle>
          <CardDescription>Your completed blood donations</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : !completedDonations?.length ? (
            <div className="text-center py-12">
              <Droplets className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No donations recorded</h3>
              <p className="text-muted-foreground">
                Your completed donations will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedDonations.map((donation) => (
                <div
                  key={donation.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                >
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Droplets className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BloodGroupBadge bloodGroup={donation.bloodGroup} size="sm" />
                      <span className="text-sm text-muted-foreground">
                        {donation.location}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {donation.createdAt && new Date(donation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



function AnnouncementsSection() {
  const { data: announcements, isLoading } = useQuery<(Announcement & { creatorName: string })[]>({
    queryKey: ["/api", "announcements"],
  });

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!announcements?.length) {
    return (
      <Card className="mb-8 border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <Megaphone className="h-12 w-12 mb-4 opacity-20" />
          <h3 className="text-lg font-semibold">No New Announcements</h3>
          <p className="text-sm">Check back later for updates from hospitals and the community.</p>
        </CardContent>
      </Card>
    );
  }

  const isRecent = (date: Date | string | null) => {
    if (!date) return false;
    const now = new Date();
    const annDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - annDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Latest Announcements</h2>
      </div>
      <div className="grid gap-4">
        {announcements.map((announcement) => (
          <AnnouncementCard
            key={announcement.id}
            announcement={announcement}
            isNew={isRecent(announcement.createdAt)}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { user, isLoading, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState<CreateRequestFormData>({
    bloodGroup: "",
    location: "",
    priority: "normal",
    unitsNeeded: 1,
    notes: "",
    hospitalId: "",
  });

  const { data: hospitals } = useQuery<{ id: string; name: string; location: string }[]>({
    queryKey: ["/api/hospitals"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/requests", newRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "requests"] });
      setIsCreateDialogOpen(false);
      setNewRequest({ bloodGroup: "", location: "", priority: "normal", unitsNeeded: 1, notes: "", hospitalId: "" });
      toast({ title: "Success", description: "Blood request created successfully." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create request.", variant: "destructive" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("PATCH", `/api/requests/${requestId}/accept`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "requests"] });
      toast({ title: "Accepted", description: "You have accepted the blood request." });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        return;
      }

      let description = "Failed to accept request.";
      try {
        const match = error.message.match(/^\d+: (.*)$/);
        if (match) {
          const json = JSON.parse(match[1]);
          if (json.message) description = json.message;
        }
      } catch (e) { }

      toast({ title: "Error", description, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("PATCH", `/api/requests/${requestId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "requests"] });
      toast({ title: "Cancelled", description: "Request has been cancelled." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: "Failed to cancel request.", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("PATCH", `/api/requests/${requestId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth", "user"] });
      toast({ title: "Completed", description: "Donation marked as completed. Thank you!" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: "Failed to complete request.", variant: "destructive" });
    },
  });

  const openCreateDialog = (initialData?: Partial<CreateRequestFormData>) => {
    if (initialData) {
      setNewRequest(prev => ({
        ...prev,
        ...initialData,
      }));
    } else {
      setNewRequest({ bloodGroup: "", location: "", priority: "normal", unitsNeeded: 1, notes: "", hospitalId: "" });
    }
    setIsCreateDialogOpen(true);
  };

  // No longer needed as Router handles redirection

  const updateAvailabilityMutation = useMutation({
    mutationFn: async ({ value, field }: { value: boolean, field: "canDonate" | "availabilityStatus" }) => {
      await apiRequest("PATCH", "/api/users/me", { [field]: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "auth", "user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/donors"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        setTimeout(() => { window.location.href = "/api/login"; }, 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update availability.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Droplets className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (user.role === "hospital") {
    window.location.href = "/hospital";
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BloodMitraLogo size={32} />
              <span className="text-xl font-bold">BloodMitra</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="destructive"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {(user as any).verificationStatus === "rejected" && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">Identity Verification Rejected</h4>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                Your submitted identity document was reviewed and rejected by hospital staff. Please check your Alerts tab for details or contact hospital support.
              </p>
            </div>
          </div>
        )}
        {!user.isVerified && (user as any).verificationStatus !== "rejected" && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Identity Document Under Review</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Your submitted ID document is pending verification by a hospital administrator. You will be able to create blood requests and accept donation requests once verified.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Request */}
          <ProfileCard
            user={user}
            onToggleAvailability={(value, field) => updateAvailabilityMutation.mutate({ value, field })}
            isUpdating={updateAvailabilityMutation.isPending}
          />

          <Tabs defaultValue="announcements" className="w-full lg:col-span-2">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
              <TabsTrigger value="announcements" className="gap-2" data-testid="tab-announcements">
                <Megaphone className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
                <span className="sm:hidden">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="gap-2" data-testid="tab-search">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Find Donors</span>
                <span className="sm:hidden">Search</span>
              </TabsTrigger>
              <TabsTrigger value="requests" className="gap-2" data-testid="tab-requests">
                <Inbox className="h-4 w-4" />
                Requests
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2" data-testid="tab-history">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="announcements">
              <AnnouncementsSection />
            </TabsContent>

            <TabsContent value="search">
              <DonorSearch onOpenCreateDialog={openCreateDialog} />
            </TabsContent>

            <TabsContent value="requests">
              <MyRequests
                onOpenCreateDialog={openCreateDialog}
                acceptMutation={acceptMutation}
                cancelMutation={cancelMutation}
                completeMutation={completeMutation}
              />
            </TabsContent>

            <TabsContent value="history">
              <DonationHistory />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Blood Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="request-blood-group">Blood Group Required *</Label>
              <Select
                value={newRequest.bloodGroup}
                onValueChange={(value) => setNewRequest({ ...newRequest, bloodGroup: value as BloodGroup })}
              >
                <SelectTrigger id="request-blood-group" data-testid="select-request-blood-group">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUPS.map((group) => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-hospital">Hospital *</Label>
              <Select
                value={newRequest.hospitalId}
                onValueChange={(value) => setNewRequest({ ...newRequest, hospitalId: value })}
              >
                <SelectTrigger id="request-hospital">
                  <SelectValue placeholder="Select a hospital" />
                </SelectTrigger>
                <SelectContent>
                  {!hospitals?.length ? (
                    <SelectItem value="none" disabled>No hospitals found</SelectItem>
                  ) : (
                    hospitals.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.name} ({h.location})</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-location">Location *</Label>
              <Input
                id="request-location"
                placeholder="Hospital location"
                value={newRequest.location}
                onChange={(e) => setNewRequest({ ...newRequest, location: e.target.value })}
                data-testid="input-request-location"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="request-priority">Priority</Label>
                <Select
                  value={newRequest.priority}
                  onValueChange={(value) => setNewRequest({ ...newRequest, priority: value as "normal" | "emergency" })}
                >
                  <SelectTrigger id="request-priority" data-testid="select-request-priority">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-units">Units Needed</Label>
                <Input
                  id="request-units"
                  type="number"
                  min={1}
                  max={10}
                  value={newRequest.unitsNeeded}
                  onChange={(e) => setNewRequest({ ...newRequest, unitsNeeded: parseInt(e.target.value) || 1 })}
                  data-testid="input-request-units"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-notes">Additional Notes</Label>
              <Textarea
                id="request-notes"
                placeholder="Enter any additional information..."
                value={newRequest.notes}
                onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                data-testid="textarea-request-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newRequest.bloodGroup || !newRequest.location || !newRequest.hospitalId || createMutation.isPending}
              data-testid="button-submit-request"
            >
              {createMutation.isPending ? "Creating..." : "Create Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
