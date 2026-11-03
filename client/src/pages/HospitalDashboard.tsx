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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BloodGroupBadge } from "@/components/BloodGroupBadge";
import { AvailabilityBadge, StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { BloodInventoryCard } from "@/components/BloodInventoryCard";
import { StatsCard } from "@/components/StatsCard";
import { RequestCard } from "@/components/RequestCard";
import { Skeleton } from "@/components/ui/skeleton";
import { BloodMitraLogo } from "@/components/BloodMitraLogo";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from "@/components/ui/sidebar";
import {
  Droplets,
  LogOut,
  Users,
  Warehouse,
  AlertTriangle,
  Plus,
  Search,
  UserPlus,
  Activity,
  ClipboardList,
  Heart,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  UserCircle,
  Trash2,
  Megaphone
} from "lucide-react";
import type { User, BloodRequest, HospitalBloodStock, BloodGroup } from "@shared/schema";

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function HospitalHeader() {
  const { user, logoutMutation } = useAuth();
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <Droplets className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold hidden sm:inline">
            {user?.name ? `${user.name} Dashboard` : "Hospital Dashboard"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-hospital-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function DashboardOverview() {
  const { data: stats } = useQuery<{
    totalDonors: number;
    availableDonors: number;
    pendingRequests: number;
    completedDonations: number;
  }>({
    queryKey: ["/api", "hospital", "stats"],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Donors"
          value={stats?.totalDonors || 0}
          icon={Users}
          description="Registered in system"
        />
        <StatsCard
          title="Available Now"
          value={stats?.availableDonors || 0}
          icon={Activity}
          description="Ready to donate"
        />
        <StatsCard
          title="Pending Requests"
          value={stats?.pendingRequests || 0}
          icon={ClipboardList}
          description="Awaiting donors"
        />
        <StatsCard
          title="Completed Donations"
          value={stats?.completedDonations || 0}
          icon={Heart}
          description="This month"
        />
      </div>
    </div>
  );
}

function UserManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    bloodGroup: "" as BloodGroup | "",
    phone: "",
    location: "",
    canDonate: true,
    email: "",
    username: "",
    password: "",
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api", "hospital", "users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/hospital/users", newUser);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "users"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "stats"] });
      setIsCreateDialogOpen(false);
      setNewUser({ name: "", bloodGroup: "", phone: "", location: "", canDonate: true, email: "", username: "", password: "" });
      toast({ title: "Success", description: "User created successfully." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: "Failed to create user.", variant: "destructive" });
    },
  });

  const verifyUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", `/api/hospital/users/${userId}/verify`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "users"] });
      toast({ title: "Verified", description: "User has been verified successfully." });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to verify user.", variant: "destructive" });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string, data: { canDonate?: boolean, availabilityStatus?: boolean } }) => {
      await apiRequest("PATCH", `/api/hospital/users/${userId}/status`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "users"] });
      toast({
        title: "Status Updated",
        description: "User donation status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update user status.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/hospital/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "users"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "stats"] });
      toast({ title: "User Removed", description: "User has been permanently deleted." });
    },
    onError: (error) => {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    },
  });

  const filteredUsers = users?.filter((user) => {
    if (user.role === "hospital") return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = (user.name || "").toLowerCase();
      if (!name.includes(query) && !user.location?.toLowerCase().includes(query)) return false;
    }
    if (bloodGroupFilter !== "all" && user.bloodGroup !== bloodGroupFilter) return false;
    if (availabilityFilter === "available" && !user.availabilityStatus) return false;
    if (availabilityFilter === "unavailable" && user.availabilityStatus) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="user-name">Full Name *</Label>
                <Input
                  id="user-name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter full name"
                  data-testid="input-new-user-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-username">Username *</Label>
                <Input
                  id="user-username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="Enter username"
                  data-testid="input-new-user-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-password">Password *</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter password"
                  data-testid="input-new-user-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-blood-group">Blood Group *</Label>
                <Select
                  value={newUser.bloodGroup}
                  onValueChange={(value) => setNewUser({ ...newUser, bloodGroup: value as BloodGroup })}
                >
                  <SelectTrigger id="user-blood-group" data-testid="select-new-user-blood-group">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-phone">Phone Number</Label>
                <Input
                  id="user-phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="+91 9000000000"
                  data-testid="input-new-user-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-location">Location *</Label>
                <Input
                  id="user-location"
                  value={newUser.location}
                  onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                  placeholder="Enter your location"
                  data-testid="input-new-user-location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-email">Email (Optional)</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter Email"
                  data-testid="input-new-user-email"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createUserMutation.mutate()}
                disabled={!newUser.name || !newUser.bloodGroup || !newUser.location || !newUser.username || !newUser.password || createUserMutation.isPending}
                data-testid="button-submit-new-user"
              >
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-user-search"
              />
            </div>
            <div className="space-y-2">
              <Label>Blood Group</Label>
              <Select value={bloodGroupFilter} onValueChange={setBloodGroupFilter}>
                <SelectTrigger data-testid="select-user-blood-filter">
                  <SelectValue placeholder="All" />
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
              <Label>Availability</Label>
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger data-testid="select-user-availability-filter">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="available">Available Only</SelectItem>
                  <SelectItem value="unavailable">Unavailable Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search filters or add a new user.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>

                    <TableHead>Blood Group</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Can Donate</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>ID Proof</TableHead>
                    <TableHead>Donations</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profileImageUrl || undefined} alt={user.name} />
                            <AvatarFallback>
                              {(user.name || "U").substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name || "Unknown"}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {user.bloodGroup && <BloodGroupBadge bloodGroup={user.bloodGroup} size="sm" />}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.location || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.phone || "-"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.availabilityStatus || false}
                          onCheckedChange={(checked) =>
                            updateUserStatusMutation.mutate({
                              userId: user.id,
                              data: { availabilityStatus: checked }
                            })
                          }
                          disabled={updateUserStatusMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.canDonate || false}
                          onCheckedChange={(checked) =>
                            updateUserStatusMutation.mutate({
                              userId: user.id,
                              data: { canDonate: checked }
                            })
                          }
                          disabled={updateUserStatusMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        {user.isVerified ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Pending</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.idDocumentUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => window.open(user.idDocumentUrl!, "_blank")}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground text-center block">No ID</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {user.donationCount || 0}
                      </TableCell>
                      <TableCell>
                        {!user.isVerified && (
                          <div className="flex gap-2 justify-center">
                            {user.idDocumentUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-green-200 hover:border-green-300 hover:bg-green-50 text-green-700"
                                onClick={() => verifyUserMutation.mutate(user.id)}
                                disabled={verifyUserMutation.isPending}
                              >
                                Verify
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8"
                              onClick={() => {
                                if (confirm("Are you sure you want to permanently delete this user?")) {
                                  deleteUserMutation.mutate(user.id);
                                }
                              }}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BloodInventory() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: inventory, isLoading } = useQuery<HospitalBloodStock[]>({
    queryKey: ["/api", "hospital", "inventory"],
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async ({ bloodGroup, delta }: { bloodGroup: BloodGroup; delta: number }) => {
      await apiRequest("PATCH", "/api/hospital/inventory", { bloodGroup, delta });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "inventory"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: "Failed to update inventory.", variant: "destructive" });
    },
  });

  const getUnitsForBloodGroup = (bloodGroup: BloodGroup): number => {
    const stock = inventory?.find((item) => item.bloodGroup === bloodGroup);
    return stock?.unitsAvailable || 0;
  };

  const lowStockCount = BLOOD_GROUPS.filter((bg) => getUnitsForBloodGroup(bg) < 5).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Blood Inventory</h1>
        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">{lowStockCount} blood type(s) low on stock</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BLOOD_GROUPS.map((bg) => (
            <Card key={bg}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-16 mb-3" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BLOOD_GROUPS.map((bloodGroup) => (
            <BloodInventoryCard
              key={bloodGroup}
              bloodGroup={bloodGroup}
              units={getUnitsForBloodGroup(bloodGroup)}
              onAdd={() => updateInventoryMutation.mutate({ bloodGroup, delta: 1 })}
              onRemove={() => updateInventoryMutation.mutate({ bloodGroup, delta: -1 })}
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Inventory Summary
          </CardTitle>
          <CardDescription>Current stock levels across all blood types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">
                {inventory?.reduce((sum, item) => sum + (item.unitsAvailable || 0), 0) || 0}
              </p>
              <p className="text-sm text-muted-foreground">Total Units</p>
            </div>
            <div className="text-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {BLOOD_GROUPS.filter((bg) => getUnitsForBloodGroup(bg) >= 10).length}
              </p>
              <p className="text-sm text-muted-foreground">Well Stocked</p>
            </div>
            <div className="text-center p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {BLOOD_GROUPS.filter((bg) => {
                  const units = getUnitsForBloodGroup(bg);
                  return units > 0 && units < 5;
                }).length}
              </p>
              <p className="text-sm text-muted-foreground">Low Stock</p>
            </div>
            <div className="text-center p-4 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {BLOOD_GROUPS.filter((bg) => getUnitsForBloodGroup(bg) === 0).length}
              </p>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RequestManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    bloodGroup: "" as BloodGroup | "",
    location: "",
    priority: "emergency" as "normal" | "emergency",
    unitsNeeded: 1,
    notes: "",
  });

  const { data: allRequests, isLoading } = useQuery<BloodRequest[]>({
    queryKey: ["/api", "hospital", "requests"],
  });

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/requests", newRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "requests"] });
      setIsCreateDialogOpen(false);
      setNewRequest({ bloodGroup: "", location: "", priority: "emergency", unitsNeeded: 1, notes: "" });
      toast({ title: "Emergency Request Created", description: "Matching donors will be notified." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: "Failed to create request.", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("PATCH", `/api/requests/${requestId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "stats"] });
      toast({ title: "Completed", description: "Donation marked as completed." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: "Failed to complete request.", variant: "destructive" });
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest("DELETE", `/api/requests/${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "hospital", "stats"] });
      toast({ title: "Deleted", description: "Request has been permanently deleted." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "Please log in again.", variant: "destructive" });
        return;
      }
      toast({ title: "Error", description: "Failed to delete request.", variant: "destructive" });
    }
  });

  const pendingRequests = allRequests?.filter((r) => r.status === "pending" || r.status === "accepted") || [];
  const emergencyRequests = pendingRequests.filter((r) => r.priority === "emergency");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Request Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" data-testid="button-emergency-request">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Emergency Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Create Emergency Blood Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="emergency-blood-group">Blood Group Required *</Label>
                <Select
                  value={newRequest.bloodGroup}
                  onValueChange={(value) => setNewRequest({ ...newRequest, bloodGroup: value as BloodGroup })}
                >
                  <SelectTrigger id="emergency-blood-group" data-testid="select-emergency-blood-group">
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
                <Label htmlFor="emergency-location">Hospital/Location *</Label>
                <Input
                  id="emergency-location"
                  value={newRequest.location}
                  onChange={(e) => setNewRequest({ ...newRequest, location: e.target.value })}
                  placeholder="Hospital location"
                  data-testid="input-emergency-location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-units">Units Needed *</Label>
                <Input
                  id="emergency-units"
                  type="number"
                  min={1}
                  max={20}
                  value={newRequest.unitsNeeded}
                  onChange={(e) => setNewRequest({ ...newRequest, unitsNeeded: parseInt(e.target.value) || 1 })}
                  data-testid="input-emergency-units"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-notes">Additional Notes</Label>
                <Textarea
                  id="emergency-notes"
                  value={newRequest.notes}
                  onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                  placeholder="Enter any additional information..."
                  data-testid="textarea-emergency-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => createRequestMutation.mutate()}
                disabled={!newRequest.bloodGroup || !newRequest.location || createRequestMutation.isPending}
                data-testid="button-submit-emergency"
              >
                {createRequestMutation.isPending ? "Creating..." : "Create Emergency Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {emergencyRequests.length > 0 && (
        <Card className="border-red-500/50 dark:border-red-500/30 bg-red-50/50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              Active Emergency Requests ({emergencyRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {emergencyRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                variant="hospital"
                onComplete={(id) => completeMutation.mutate(id)}
                onDelete={(id) => deleteRequestMutation.mutate(id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Pending Requests</CardTitle>
          <CardDescription>Manage and track blood requests</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
              <p className="text-muted-foreground">
                All blood requests have been fulfilled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.filter((r) => r.priority !== "emergency").map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  variant="hospital"
                  onComplete={(id) => completeMutation.mutate(id)}
                  onDelete={(id) => deleteRequestMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


function AnnouncementsManagement() {
  const { toast } = useToast();
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    targetBloodGroup: "all" as string,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...newAnnouncement,
        targetBloodGroup: newAnnouncement.targetBloodGroup === "all" ? null : newAnnouncement.targetBloodGroup,
      };
      await apiRequest("POST", "/api/announcements", data);
    },
    onSuccess: () => {
      setIsDataOpen(false);
      setNewAnnouncement({ title: "", message: "", targetBloodGroup: "all" });
      toast({ title: "Success", description: "Announcement posted successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post announcement.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Announcements</h1>
        <Dialog open={isDataOpen} onOpenChange={setIsDataOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <CardDescription>Post an update for donors.</CardDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="ann-title">Title *</Label>
                <Input
                  id="ann-title"
                  placeholder="Enter title"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-target">Target Audience</Label>
                <Select
                  value={newAnnouncement.targetBloodGroup}
                  onValueChange={(val) => setNewAnnouncement({ ...newAnnouncement, targetBloodGroup: val })}
                >
                  <SelectTrigger id="ann-target">
                    <SelectValue placeholder="All Donors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Donors</SelectItem>
                    {BLOOD_GROUPS.map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg} Only</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-message">Message *</Label>
                <Textarea
                  id="ann-message"
                  placeholder="Enter details"
                  className="min-h-[100px]"
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDataOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!newAnnouncement.title || !newAnnouncement.message || createMutation.isPending}
              >
                {createMutation.isPending ? "Posting..." : "Post Announcement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>Only announcements targeting specific groups or global announcements created by you would appear here (if we fetched them).</p>
          <p className="text-sm mt-2">Currently, this view only allows creation.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function HospitalDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("overview");

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

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  const menuItems = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "users", label: "User Management", icon: Users },
    { id: "inventory", label: "Blood Inventory", icon: Warehouse },
    { id: "requests", label: "Requests", icon: ClipboardList },
    { id: "announcements", label: "Announcements", icon: Megaphone },
  ];

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b">
            <div className="flex items-center gap-2">
              <BloodMitraLogo size={32} />
              <span className="font-bold text-lg">BloodMitra</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(item.id)}
                        isActive={activeSection === item.id}
                        data-testid={`nav-${item.id}`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <HospitalHeader />
          <main className="flex-1 overflow-auto p-6">
            {activeSection === "overview" && <DashboardOverview />}
            {activeSection === "users" && <UserManagement />}
            {activeSection === "inventory" && <BloodInventory />}
            {activeSection === "requests" && <RequestManagement />}
            {activeSection === "announcements" && <AnnouncementsManagement />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
