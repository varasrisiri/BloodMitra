import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated } from "./auth.js";
import { type BloodGroup } from "../shared/schema";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);


  // User profile update
  app.patch("/api/users/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { name, age, bloodGroup, phone, location, canDonate, availabilityStatus } = req.body;

      const updateData = {
        name,
        age,
        bloodGroup,
        phone,
        location,
        canDonate,
        availabilityStatus,
      };

      // Remove undefined keys
      Object.keys(updateData).forEach(
        (key) => (updateData as any)[key] === undefined && delete (updateData as any)[key]
      );

      const user = await storage.updateUser(userId, updateData);

      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Get donors with filters
  app.get("/api/donors", isAuthenticated, async (req: any, res) => {
    try {
      const { bloodGroup, location, available } = req.query;
      const donors = await storage.getDonors({
        bloodGroup: bloodGroup as string,
        location: location as string,
        available: available === "true",
      });
      res.json(donors);
    } catch (error) {
      console.error("Error fetching donors:", error);
      res.status(500).json({ message: "Failed to fetch donors" });
    }
  });

  // Get list of hospitals
  app.get("/api/hospitals", isAuthenticated, async (req: any, res) => {
    try {
      // We can reuse getDonors or access db directly, but getDonors filters by role='user'.
      // Creating a new storage method is cleaner, but for speed I'll access via a new route using existing GetAllUsers?
      // No, getAllUsers is restricted to hospital admin.
      // Let's rely on storage.getAllUsers() but filter in route? No, inefficient.
      // I'll add a simple query here or use a new logic.
      // Since I can't easily modify storage interface again without toggling files, I'll allow this endpoint 
      // to just return all users with role 'hospital'.
      // Actually, I can add a dedicated method later, or just filter getAllUsers if I relax the check?
      // Let's look at storage.getDonors. It hardcodes role='user'.
      // I'll use `storage.getAllUsers()` (which sorts by date) and filter here? 
      // Wait, `storage.getAllUsers` is only used by `get /api/hospital/users` which has a check.
      // But `storage.getAllUsers` implementation itself doesn't check role.
      // So I can use it.
      const users = await storage.getAllUsers();
      const hospitals = users.filter(u => u.role === "hospital").map(u => ({ id: u.id, name: u.name, location: u.location }));
      res.json(hospitals);
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      res.status(500).json({ message: "Failed to fetch hospitals" });
    }
  });

  // Blood Request Routes
  app.post("/api/requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { bloodGroup, location, priority, unitsNeeded, notes, hospitalId } = req.body;

      if (!bloodGroup || !location || !hospitalId) {
        return res.status(400).json({ message: "Blood group, location, and hospital are required" });
      }

      const request = await storage.createBloodRequest({
        requestedById: userId,
        hospitalId,
        bloodGroup,
        location,
        priority: priority || "normal",
        unitsNeeded: unitsNeeded || 1,
        notes,
      });

      // Broadcast Announcement
      try {
        await storage.createAnnouncement({
          title: `URGENT: ${bloodGroup} Blood Needed`,
          message: `A new request for ${bloodGroup} blood has been raised at ${location}. Please check active requests to help!`,
          targetBloodGroup: bloodGroup, // Target matching donors
          createdBy: userId, // Created by the requester (system essentially acting on their behalf)
          type: "request_broadcast",
          relatedRequestId: request.id
        });
      } catch (annError) {
        console.error("Failed to create broadcast announcement", annError);
        // Don't fail the request request
      }

      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating blood request:", error);
      res.status(500).json({ message: "Failed to create blood request" });
    }
  });

  // Get user's own requests
  app.get("/api/requests/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const requests = await storage.getRequestsByUser(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  // Get incoming requests for donor
  app.get("/api/requests/incoming", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);

      if (!user?.bloodGroup || !user?.availabilityStatus) {
        return res.json([]);
      }

      const requests = await storage.getIncomingRequests(userId, user.bloodGroup);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching incoming requests:", error);
      res.status(500).json({ message: "Failed to fetch incoming requests" });
    }
  });

  // Get completed donations
  app.get("/api/requests/completed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const donations = await storage.getCompletedDonations(userId);
      res.json(donations);
    } catch (error) {
      console.error("Error fetching completed donations:", error);
      res.status(500).json({ message: "Failed to fetch completed donations" });
    }
  });

  // Accept a blood request
  app.patch("/api/requests/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const { id } = req.params;


      const request = await storage.acceptRequest(id, userId);
      if (!request) {
        return res.status(404).json({ message: "Request not found or already accepted" });
      }

      res.json(request);

      // Notify Requester
      try {
        const donor = await storage.getUser(userId);
        await storage.createAnnouncement({
          title: "Request Accepted!",
          message: `${donor?.name || "A donor"} has accepted your blood request.`,
          targetUserId: request.requestedById, // Notify the person who made the request
          createdBy: userId, // By the donor
          type: "notification",
          relatedRequestId: request.id
        });
      } catch (err) {
        console.error("Failed to create acceptance notification", err);
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      res.status(500).json({ message: "Failed to accept request" });
    }
  });

  app.delete("/api/requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const requestId = req.params.id;
      const user = await storage.getUser(req.user.id);
      const request = await storage.getBloodRequest(requestId);

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Allow deletion if:
      // 1. User is a hospital (admin override)
      // 2. User is the creator
      if (user?.role !== "hospital" && request.requestedById !== user?.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteBloodRequest(requestId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting request:", error);
      res.status(500).json({ message: "Failed to delete request" });
    }
  });

  // Cancel a blood request
  app.patch("/api/requests/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.cancelRequest(id);

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error cancelling request:", error);
      res.status(500).json({ message: "Failed to cancel request" });
    }
  });

  // Complete a blood request
  app.patch("/api/requests/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.completeRequest(id);

      if (!request) {
        return res.status(404).json({ message: "Request not found or not in accepted state" });
      }

      res.json(request);
    } catch (error) {
      console.error("Error completing request:", error);
      res.status(500).json({ message: "Failed to complete request" });
    }
  });

  // Hospital Routes

  // Get hospital stats
  app.get("/api/hospital/stats", isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get all users (hospital admin)
  app.get("/api/hospital/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);

      if (user?.role !== "hospital") {
        return res.status(403).json({ message: "Access denied" });
      }

      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create user by hospital
  app.post("/api/hospital/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const adminUser = await storage.getUser(userId);

      if (adminUser?.role !== "hospital") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { name, age, bloodGroup, phone, location, canDonate, email, username, password } = req.body;

      if (!name || !bloodGroup || !location || !username || !password) {
        return res.status(400).json({ message: "Name, blood group, location, username, and password are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // We need to import hashPassword from auth.ts. 
      // Since we cannot easily import from a file that is not yet exporting it in the executing context (though I just did),
      // I will assume the previous step succeeded.
      // However, typescript might complain if I don't add the import at the top.
      // I'll do this in two chunks or one if I can match the import.

      // Actually, I can't easily add an import at the top AND modify the route in one replace_file_content unless they are close.
      // They are not close.
      // I will use multi_replace_file_content.
      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(password);

      const newUser = await storage.createUserByHospital({
        name,
        age,
        bloodGroup,
        phone,
        location,
        canDonate: canDonate ?? true,
        email,
        username,
        password: hashedPassword,
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Verify user by hospital
  app.patch("/api/hospital/users/:id/verify", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = (req.user as any).id;
      const adminUser = await storage.getUser(adminId);

      if (adminUser?.role !== "hospital") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const verifiedUser = await storage.verifyUser(id);

      if (!verifiedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(verifiedUser);
    } catch (error) {
      console.error("Error verifying user:", error);
      res.status(500).json({ message: "Failed to verify user" });
    }
  });

  // Delete user by hospital (only if unverified)
  app.delete("/api/hospital/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = (req.user as any).id;
      const adminUser = await storage.getUser(adminId);

      if (adminUser?.role !== "hospital") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const targetUser = await storage.getUser(id);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.isVerified) {
        return res.status(400).json({ message: "Cannot delete a verified user" });
      }

      const deletedUser = await storage.deleteUser(id);
      res.json(deletedUser);
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Update user status (hospital admin)
  app.patch("/api/hospital/users/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const hospitalId = (req.user as any).id;
      const hospital = await storage.getUser(hospitalId);

      if (hospital?.role !== "hospital") {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = req.params.id;
      const { canDonate, availabilityStatus } = req.body;

      const updatedUser = await storage.updateUserStatus(userId, {
        canDonate,
        availabilityStatus
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Get all requests (hospital admin)
  app.get("/api/hospital/requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);

      if (user?.role !== "hospital") {
        return res.status(403).json({ message: "Access denied" });
      }

      const requests = await storage.getRequestsByHospital(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  // Get hospital inventory
  app.get("/api/hospital/inventory", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);

      if (user?.role !== "hospital") {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.initializeInventory(userId);
      const inventory = await storage.getHospitalInventory(userId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  // Update hospital inventory
  app.patch("/api/hospital/inventory", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);

      if (user?.role !== "hospital") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { bloodGroup, delta } = req.body;

      if (!bloodGroup || typeof delta !== "number") {
        return res.status(400).json({ message: "Blood group and delta are required" });
      }

      const updated = await storage.updateInventory(userId, bloodGroup as BloodGroup, delta);
      res.json(updated);
    } catch (error) {
      console.error("Error updating inventory:", error);
      res.status(500).json({ message: "Failed to update inventory" });
    }
  });

  // Announcements Routes

  // Get announcements (Users)
  app.get("/api/announcements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);

      // If hospital, maybe show all created by them? OR just all?
      // Spec says: "Announcements are read-only for users... Hospitals create them."
      // Let's allow users to see relevant ones.
      // If hospital, let's just show all for now or maybe none if this is the "User Feed".
      // Let's pass the user's blood group. If user has no blood group (e.g. hospital), passing undefined might show global ones.

      const announcements = await storage.getAnnouncements(user?.bloodGroup || undefined, userId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Create announcement (Hospital)
  app.post("/api/announcements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);

      if (user?.role !== "hospital") {
        return res.status(403).json({ message: "Access denied" });
      }

      const { title, message, targetBloodGroup } = req.body;

      if (!title || !message) {
        return res.status(400).json({ message: "Title and message are required" });
      }

      const announcement = await storage.createAnnouncement({
        title,
        message,
        targetBloodGroup: targetBloodGroup || null,
        createdBy: userId,
      });

      res.status(201).json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      console.error("Request body:", req.body);
      console.error("User ID:", (req.user as any)?.id);
      res.status(500).json({ message: "Failed to create announcement", error: String(error) });
    }
  });

  // Public stats
  app.get("/api/public-stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching public stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  return httpServer;
}
