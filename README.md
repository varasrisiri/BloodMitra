# 🩸 BloodMitra - Smart Blood Donation & Emergency Matching Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-blood--mitra.vercel.app-red?style=for-the-badge&logo=vercel)](https://blood-mitra.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Proprietary](https://img.shields.io/badge/License-Proprietary%20%7C%20All%20Rights%20Reserved-red?style=for-the-badge)](#-license--terms-of-use)

> ⚠️ **PROPRIETARY & CONFIDENTIAL – ALL RIGHTS RESERVED**  
> This repository and its codebase are the private intellectual property of **varasrisiri**.  
> **No permission is granted to download, clone, copy, fork, modify, redistribute, or use this source code for any personal, educational, or commercial purposes.**  
> This project is published solely for portfolio viewing and presentation.

> **Every drop counts. Every second matters.**  
> BloodMitra is a full-stack, real-time blood donation and hospital inventory platform connecting donors, recipients, and hospitals to eliminate critical delays in emergency blood procurement.

---

## 🌟 Live Demo

🔗 **Production URL:** [https://blood-mitra.vercel.app](https://blood-mitra.vercel.app)

---

## 🚀 Key Features

### 👤 For Individual Donors & Recipients
* **Smart Matching & Alerts:** Real-time in-app alerts whenever an emergency or routine request matches the donor's blood group.
* **Document Verification:** Donors upload government-issued ID proof (PDF, $\le 2\text{ MB}$) during registration.
* **Status Badges & Visibility:** Clear visual indicators on the dashboard:
  * 🟢 **Verified Donor** (Approved by hospital)
  * 🟡 **Pending Verification** (Under review)
  * 🔴 **Verification Rejected** (Reason provided via in-app alert)
* **Availability Toggle:** One-click toggle allowing donors to declare themselves available or unavailable for donations.
* **Request Lifecycle:** Create, accept, track, and complete emergency or routine blood requests with real-time donor matches..

### 🏥 For Hospitals & Healthcare Centers
* **Live Blood Stock Inventory:** Real-time tracking and updating of available units across all 8 blood groups (`A+`, `A-`, `B+`, `B-`, `O+`, `O-`, `AB+`, `AB-`).
* **Private Document Review:** Hospital administrators can securely stream and review donor PDF documents through an authenticated backend proxy.
* **One-Click Approval & Rejection:** Verify or reject donor applications with automatic in-app notification dispatch to the donor.
* **Emergency Broadcasts:** Broadcast urgent blood requirements across specific blood groups with instant notification delivery.
* **Staff User Management:** Controlled hospital administration with invite-only staff account creation.

---

## 🔒 Security & Privacy Highlights

* **Private PostgreSQL BYTEA Storage:** Uploaded identity documents are stored as encrypted binary `BYTEA` data in PostgreSQL. Documents are **never** exposed via public URLs or external third-party buckets.
* **Strict Role-Based Access Control (RBAC):** ID document viewing is restricted exclusively to authenticated hospital administrators with strict security headers:
  * `Cache-Control: private, no-store, must-revalidate`
  * `X-Content-Type-Options: nosniff`
* **First-Admin Atomic Concurrency Guard:** Initial hospital administrator registration is protected by PostgreSQL advisory transaction locks (`pg_advisory_xact_lock`) to prevent race conditions.
* **Privilege Escalation Protection:** User creation endpoints strictly enforce non-privileged roles.
* **Comprehensive Test Suite:** Includes 34 automated security and workflow tests (`npm run test:security`) validating IDOR defenses, MIME & magic bytes verification, and data sanitization.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, Lucide Icons, Wouter (Routing) |
| **State & Data Fetching** | TanStack Query (React Query) |
| **Backend** | Node.js, Express.js |
| **Database & ORM** | PostgreSQL (Neon Serverless), Drizzle ORM |
| **Authentication** | Passport.js (Local Strategy, scrypt password hashing), `connect-pg-simple` session store |
| **File Handling** | Multer (Memory Storage) with strict `%PDF` magic bytes & size validation |
| **Deployment** | Vercel (Edge CDN + Serverless Functions) |

---

## 📁 Project Structure

```text
BloodMitra/
├── api/                     # Vercel serverless function entrypoint
│   └── index.ts
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # Reusable UI components & StatusBadges
│   │   ├── hooks/           # Custom hooks (auth, toast, mobile)
│   │   ├── lib/             # QueryClient, utils, auth guards
│   │   ├── pages/           # Landing, AuthPage, Home, HospitalDashboard
│   │   ├── App.tsx          # Client routing
│   │   └── main.tsx
│   └── index.html
├── migrations/              # Drizzle ORM SQL migrations
├── script/                  # Build, migration, CLI admin & security test scripts
│   ├── build.ts             # Production Vite + esbuild bundler
│   ├── create-admin.ts      # Hospital admin CLI bootstrap tool
│   ├── migrate-production.ts# Idempotent database schema migration runner
│   └── test-security.ts     # Automated 34-test security test suite
├── server/                  # Backend Express application
│   ├── auth.ts              # Authentication, session management, file filters
│   ├── db.ts                # PostgreSQL pool & Drizzle database connection
│   ├── routes.ts            # API routes (donors, requests, hospital, documents)
│   ├── storage.ts           # Database storage layer (IStorage interface)
│   └── index.ts             # Server entry point
├── shared/                  # Shared schemas & types
│   └── schema.ts            # Drizzle tables, enums & Zod validation schemas
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json              # Vercel deployment & routing configuration
└── package.json
```

---

## ⚙️ Local Development Setup

### Prerequisites
* Node.js (v18 or higher)
* PostgreSQL database (Local or [Neon](https://neon.tech))

### 1. Clone the Repository
```bash
git clone https://github.com/varasrisiri/BloodMitra.git
cd BloodMitra/Blood-Link-main
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/bloodmitra
SESSION_SECRET=your-at-least-32-character-random-secret-key
ADMIN_SETUP_TOKEN=your-random-admin-setup-token
NODE_ENV=development
```

### 4. Run Database Migration
```bash
npx tsx script/migrate-production.ts
```

### 5. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5000`.

---

## 🧪 Testing & Verification

Run the full verification suite:

```bash
# 1. Typecheck TypeScript code
npm run check

# 2. Run automated security test suite (34 tests)
npm run test:security

# 3. Build for production (Vite client + esbuild server)
npm run build
```

---

## 📄 License & Terms of Use

**Copyright © 2026 varasrisiri. All Rights Reserved.**

This software and its documentation are proprietary and confidential.

* **No License Granted:** No license, express or implied, is granted to any person obtaining a copy of this repository.
* **Prohibited Actions:** You may **not** download, clone, fork, reproduce, modify, distribute, sublicense, sell, or deploy this code, in whole or in part, without prior explicit written permission from the copyright owner.
* **Intended Use:** This repository is made visible exclusively for demonstration and portfolio inspection.

---

## 👥 Acknowledgments & Branding

* **Branding:** BloodMitra (Smart Blood Donation Platform)
* **Logo:** Official BloodMitra medical brand mark
* Built with dedication to help save lives by connecting donors and hospitals in critical emergencies.

