import {
  users,
  bloodRequests,
  hospitalBloodStock,
  type User,
  type UpsertUser,
  type BloodRequest,
  type InsertBloodRequest,
  type HospitalBloodStock,
  type BloodGroup,
  type Announcement,
  type InsertAnnouncement,
  announcements,
} from "../shared/schema.js";
import { db, pool } from "./db.js";
import { eq, and, or, desc, sql, getTableColumns } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  upsertUser(user: any): Promise<User>;

  // Extended user operations
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined>;
  getDonors(filters?: { bloodGroup?: string; location?: string; available?: boolean }): Promise<User[]>;
  createUserByHospital(data: Partial<UpsertUser>): Promise<User>;
  verifyUser(id: string): Promise<User | undefined>;
  rejectUser(id: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<User | undefined>;
  updateUserStatus(id: string, data: { canDonate?: boolean; availabilityStatus?: boolean }): Promise<User | undefined>;
  getHospitalCount(): Promise<number>;
  createFirstHospitalAdmin(userData: any): Promise<User>;

  // Donor private document operations
  saveDonorDocument(doc: { userId: string; fileName: string; mimeType: string; fileData: Buffer; fileSize: number }): Promise<void>;
  getDonorDocument(userId: string): Promise<{ id: string; userId: string; fileName: string; mimeType: string; fileData: Buffer; fileSize: number; uploadedAt: Date | null } | undefined>;
  deleteDonorDocument(userId: string): Promise<void>;

  // Blood request operations
  createBloodRequest(data: InsertBloodRequest): Promise<BloodRequest>;
  getBloodRequest(id: string): Promise<BloodRequest | undefined>;
  getBloodRequestWithRelations(id: string): Promise<BloodRequest & { requester?: User; matchedDonor?: User } | undefined>;
  getRequestsByUser(userId: string): Promise<BloodRequest[]>;
  getIncomingRequests(userId: string, bloodGroup: BloodGroup): Promise<BloodRequest[]>;
  getCompletedDonations(userId: string): Promise<BloodRequest[]>;
  getRequestsByHospital(hospitalId: string): Promise<BloodRequest[]>;
  updateBloodRequest(id: string, data: Partial<BloodRequest>): Promise<BloodRequest | undefined>;
  acceptRequest(requestId: string, donorId: string): Promise<BloodRequest | undefined>;
  completeRequest(requestId: string): Promise<BloodRequest | undefined>;
  completeRequest(requestId: string): Promise<BloodRequest | undefined>;
  cancelRequest(requestId: string): Promise<BloodRequest | undefined>;
  deleteBloodRequest(id: string): Promise<BloodRequest | undefined>;

  // Hospital blood stock operations
  getHospitalInventory(hospitalId: string): Promise<HospitalBloodStock[]>;
  updateInventory(hospitalId: string, bloodGroup: BloodGroup, delta: number): Promise<HospitalBloodStock>;
  initializeInventory(hospitalId: string): Promise<void>;

  initializeInventory(hospitalId: string): Promise<void>;

  // Announcements
  createAnnouncement(data: InsertAnnouncement): Promise<Announcement>;
  getAnnouncements(userBloodGroup?: string, userId?: string): Promise<(Announcement & { creatorName: string })[]>;

  // Stats
  getStats(): Promise<{
    totalDonors: number;
    availableDonors: number;
    pendingRequests: number;
    completedDonations: number;
    totalHospitals: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: any): Promise<User> {
    const { id, ...updateFields } = userData;
    const [user] = await db
      .insert(users)
      .values({
        id,
        ...updateFields,
        username: userData.username || userData.email || id,
        password: userData.password || "",
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...updateFields,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getDonors(filters?: { bloodGroup?: string; location?: string; available?: boolean }): Promise<User[]> {
    let query = db.select().from(users).where(eq(users.role, "user"));

    const conditions: any[] = [eq(users.role, "user"), eq(users.canDonate, true)];

    if (filters?.bloodGroup && filters.bloodGroup !== "all") {
      conditions.push(eq(users.bloodGroup, filters.bloodGroup as BloodGroup));
    }

    if (filters?.available) {
      conditions.push(eq(users.availabilityStatus, true));
    }

    const result = await db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.availabilityStatus), desc(users.donationCount));

    if (filters?.location) {
      return result.filter((u) =>
        u.location?.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    return result;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUserByHospital(data: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...data,
        createdByHospital: true,
        role: "user",
        isVerified: true, // Users created by hospital are verified by default
      } as UpsertUser)
      .returning();
    return user;
  }

  async verifyUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isVerified: true, verificationStatus: "verified", updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async rejectUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isVerified: false, verificationStatus: "rejected", updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getHospitalCount(): Promise<number> {
    const [res] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "hospital"));
    return Number(res?.count || 0);
  }

  async createFirstHospitalAdmin(userData: any): Promise<User> {
    return await db.transaction(async (tx) => {
      // Transaction-level advisory lock serializes simultaneous first-admin creation attempts
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('hospital_admin_registration'))`);

      const [res] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "hospital"));

      if (Number(res?.count || 0) > 0) {
        throw new Error("HOSPITAL_EXISTS: A hospital administrator already exists. Public hospital registration is closed.");
      }

      const [user] = await tx
        .insert(users)
        .values({
          ...userData,
          role: "hospital",
          isVerified: true,
          createdByHospital: false,
        } as UpsertUser)
        .returning();

      return user;
    });
  }

  async updateUserStatus(id: string, data: { canDonate?: boolean; availabilityStatus?: boolean }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Donor private document operations (PostgreSQL BYTEA storage)
  async saveDonorDocument(doc: { userId: string; fileName: string; mimeType: string; fileData: Buffer; fileSize: number }): Promise<void> {
    await pool.query(
      `INSERT INTO donor_documents (user_id, file_name, mime_type, file_data, file_size)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         file_name = EXCLUDED.file_name,
         mime_type = EXCLUDED.mime_type,
         file_data = EXCLUDED.file_data,
         file_size = EXCLUDED.file_size,
         uploaded_at = now()`,
      [doc.userId, doc.fileName, doc.mimeType, doc.fileData, doc.fileSize]
    );
  }

  async getDonorDocument(userId: string): Promise<{ id: string; userId: string; fileName: string; mimeType: string; fileData: Buffer; fileSize: number; uploadedAt: Date | null } | undefined> {
    const res = await pool.query(
      `SELECT id, user_id, file_name, mime_type, file_data, file_size, uploaded_at
       FROM donor_documents
       WHERE user_id = $1`,
      [userId]
    );
    if (res.rows.length === 0) return undefined;
    const r = res.rows[0];
    return {
      id: r.id as string,
      userId: r.user_id as string,
      fileName: r.file_name as string,
      mimeType: r.mime_type as string,
      fileData: r.file_data as Buffer,
      fileSize: r.file_size as number,
      uploadedAt: r.uploaded_at as Date | null,
    };
  }

  async deleteDonorDocument(userId: string): Promise<void> {
    await pool.query(`DELETE FROM donor_documents WHERE user_id = $1`, [userId]);
  }

  // Blood request operations
  async createBloodRequest(data: InsertBloodRequest): Promise<BloodRequest> {
    const [request] = await db
      .insert(bloodRequests)
      .values(data)
      .returning();
    return request;
  }

  async getBloodRequest(id: string): Promise<BloodRequest | undefined> {
    const [request] = await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.id, id));
    return request;
  }

  async getBloodRequestWithRelations(id: string): Promise<BloodRequest & { requester?: User; matchedDonor?: User } | undefined> {
    const [request] = await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.id, id));

    if (!request) return undefined;

    const requester = request.requestedById
      ? await this.getUser(request.requestedById)
      : undefined;
    const matchedDonor = request.matchedDonorId
      ? await this.getUser(request.matchedDonorId)
      : undefined;

    return { ...request, requester, matchedDonor };
  }

  async getRequestsByUser(userId: string): Promise<BloodRequest[]> {
    const requests = await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.requestedById, userId))
      .orderBy(desc(bloodRequests.createdAt));

    const result = [];
    for (const request of requests) {
      const requester = await this.getUser(request.requestedById);
      const matchedDonor = request.matchedDonorId
        ? await this.getUser(request.matchedDonorId)
        : undefined;
      result.push({ ...request, requester, matchedDonor });
    }
    return result;
  }

  async getIncomingRequests(userId: string, bloodGroup: BloodGroup): Promise<BloodRequest[]> {
    const requests = await db
      .select()
      .from(bloodRequests)
      .where(
        and(
          eq(bloodRequests.bloodGroup, bloodGroup),
          eq(bloodRequests.status, "pending")
        )
      )
      .orderBy(desc(bloodRequests.priority), desc(bloodRequests.createdAt));

    const result = [];
    for (const request of requests) {
      if (request.requestedById === userId) continue;
      const requester = await this.getUser(request.requestedById);
      result.push({ ...request, requester });
    }
    return result;
  }

  async getCompletedDonations(userId: string): Promise<BloodRequest[]> {
    return db
      .select()
      .from(bloodRequests)
      .where(
        and(
          eq(bloodRequests.matchedDonorId, userId),
          eq(bloodRequests.status, "completed")
        )
      )
      .orderBy(desc(bloodRequests.updatedAt));
  }

  async getRequestsByHospital(hospitalId: string): Promise<BloodRequest[]> {
    const requests = await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.hospitalId, hospitalId))
      .orderBy(desc(bloodRequests.priority), desc(bloodRequests.createdAt));

    const result = [];
    for (const request of requests) {
      const requester = await this.getUser(request.requestedById);
      const matchedDonor = request.matchedDonorId
        ? await this.getUser(request.matchedDonorId)
        : undefined;
      result.push({ ...request, requester, matchedDonor });
    }
    return result;
  }

  async updateBloodRequest(id: string, data: Partial<BloodRequest>): Promise<BloodRequest | undefined> {
    const [request] = await db
      .update(bloodRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bloodRequests.id, id))
      .returning();
    return request;
  }

  async acceptRequest(requestId: string, donorId: string): Promise<BloodRequest | undefined> {
    const [request] = await db
      .update(bloodRequests)
      .set({
        matchedDonorId: donorId,
        status: "accepted",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bloodRequests.id, requestId),
          eq(bloodRequests.status, "pending")
        )
      )
      .returning();
    return request;
  }

  async completeRequest(requestId: string): Promise<BloodRequest | undefined> {
    const request = await this.getBloodRequest(requestId);
    if (!request || request.status !== "accepted") return undefined;

    const [updatedRequest] = await db
      .update(bloodRequests)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(bloodRequests.id, requestId))
      .returning();

    if (updatedRequest && request.matchedDonorId) {
      await db
        .update(users)
        .set({
          donationCount: sql`${users.donationCount} + 1`,
          lastDonationDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, request.matchedDonorId));
    }

    return updatedRequest;
  }

  async cancelRequest(requestId: string): Promise<BloodRequest | undefined> {
    const [request] = await db
      .update(bloodRequests)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(bloodRequests.id, requestId))
      .returning();
    return request;
  }

  async deleteBloodRequest(id: string): Promise<BloodRequest | undefined> {
    const [request] = await db
      .delete(bloodRequests)
      .where(eq(bloodRequests.id, id))
      .returning();
    return request;
  }

  // Hospital blood stock operations
  async getHospitalInventory(hospitalId: string): Promise<HospitalBloodStock[]> {
    return db
      .select()
      .from(hospitalBloodStock)
      .where(eq(hospitalBloodStock.hospitalId, hospitalId));
  }

  async updateInventory(hospitalId: string, bloodGroup: BloodGroup, delta: number): Promise<HospitalBloodStock> {
    const existing = await db
      .select()
      .from(hospitalBloodStock)
      .where(
        and(
          eq(hospitalBloodStock.hospitalId, hospitalId),
          eq(hospitalBloodStock.bloodGroup, bloodGroup)
        )
      );

    if (existing.length > 0) {
      const newUnits = Math.max(0, (existing[0].unitsAvailable || 0) + delta);
      const [updated] = await db
        .update(hospitalBloodStock)
        .set({
          unitsAvailable: newUnits,
          lastUpdated: new Date(),
        })
        .where(eq(hospitalBloodStock.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(hospitalBloodStock)
        .values({
          hospitalId,
          bloodGroup,
          unitsAvailable: Math.max(0, delta),
        })
        .returning();
      return created;
    }
  }

  async initializeInventory(hospitalId: string): Promise<void> {
    const bloodGroups: BloodGroup[] = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

    for (const bloodGroup of bloodGroups) {
      const existing = await db
        .select()
        .from(hospitalBloodStock)
        .where(
          and(
            eq(hospitalBloodStock.hospitalId, hospitalId),
            eq(hospitalBloodStock.bloodGroup, bloodGroup)
          )
        );

      if (existing.length === 0) {
        await db.insert(hospitalBloodStock).values({
          hospitalId,
          bloodGroup,
          unitsAvailable: 0,
        });
      }
    }
  }

  // Announcements
  async createAnnouncement(data: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db
      .insert(announcements)
      .values(data)
      .returning();
    return announcement;
  }

  async getAnnouncements(userBloodGroup?: string, userId?: string): Promise<(Announcement & { creatorName: string })[]> {
    const conditions = [];

    // Filter by:
    // 1. Target Blood Group matches user OR is null (global)
    // 2. targetUserId matches user (specific notification)
    // 3. (Optional) Filter out notifications meant for others? Yes.

    if (userId) {
      conditions.push(or(
        // targeted at this user explicitly
        eq(announcements.targetUserId, userId),
        // OR targeted at their blood group (and not a private notification)
        and(
          sql`${announcements.targetUserId} IS NULL`,
          or(
            sql`${announcements.targetBloodGroup} IS NULL`,
            eq(announcements.targetBloodGroup, userBloodGroup as BloodGroup)
          )
        )
      ));
    } else {
      // Fallback for non-logged in or generic (shouldn't happen for authenticated route)
      conditions.push(sql`${announcements.targetUserId} IS NULL`);
      if (userBloodGroup) {
        conditions.push(or(
          sql`${announcements.targetBloodGroup} IS NULL`,
          eq(announcements.targetBloodGroup, userBloodGroup as BloodGroup)
        ));
      } else {
        conditions.push(sql`${announcements.targetBloodGroup} IS NULL`);
      }
    }

    const results = await db
      .select({
        ...getTableColumns(announcements),
        creatorName: users.name,
      })
      .from(announcements)
      .leftJoin(users, eq(announcements.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(desc(announcements.createdAt));

    return results as (Announcement & { creatorName: string })[];
  }

  // Stats
  async getStats(): Promise<{
    totalDonors: number;
    availableDonors: number;
    pendingRequests: number;
    completedDonations: number;
    totalHospitals: number;
  }> {
    const allUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "user"), eq(users.canDonate, true)));

    const availableUsers = allUsers.filter((u) => u.availabilityStatus);

    const pendingReqs = await db
      .select()
      .from(bloodRequests)
      .where(
        or(
          eq(bloodRequests.status, "pending"),
          eq(bloodRequests.status, "accepted")
        )
      );

    const completedReqs = await db
      .select()
      .from(bloodRequests)
      .where(eq(bloodRequests.status, "completed"));

    const allHospitals = await db
      .select()
      .from(users)
      .where(eq(users.role, "hospital"));

    return {
      totalDonors: allUsers.length,
      availableDonors: availableUsers.length,
      pendingRequests: pendingReqs.length,
      completedDonations: completedReqs.length,
      totalHospitals: allHospitals.length,
    };
  }
}

export const storage = new DatabaseStorage();
