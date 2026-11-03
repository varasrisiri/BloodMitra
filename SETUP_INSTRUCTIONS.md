# BloodMitra Setup Instructions

## 1. Prerequisites

- Node.js (LTS recommended)
- PostgreSQL

## 2. Database Configuration

Create a PostgreSQL database named `bloodlink` and use a dedicated database user with a strong, unique password. Do not use default credentials in production.

## 3. Environment Setup

Copy `.env.example` to `.env` and set your local PostgreSQL connection string and a random session secret:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/bloodlink
PORT=5000
NODE_ENV=development
SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters
APP_BASE_URL=http://localhost:5000
```

Configure SMTP settings in `.env` for password-reset email delivery. For Gmail, enable 2-Step Verification and generate an App Password at https://myaccount.google.com/apppasswords. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER` to your Gmail address, `SMTP_PASS` to the App Password, and `SMTP_FROM` to a matching sender address. Never commit `.env` or print reset links to logs.

In production, set `APP_BASE_URL` to the HTTPS application origin and set `SESSION_SECRET` to a random value of at least 32 characters.

On Vercel, configure `BLOB_READ_WRITE_TOKEN` to enable file uploads. Existing files in the local `uploads/` folder are not automatically migrated. The current ID-document upload path uses public URLs, so do not store sensitive identity documents in production until private storage and authenticated access are implemented.

## 4. Install Dependencies

```bash
npm install
```

## 5. Initialize Database Schema

```bash
npm run db:push
```

## 6. Run the Application

```bash
npm run dev
```

The local application is available at http://localhost:5000.

## Common Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the server and frontend in watch mode |
| `npm run db:push` | Synchronizes the Drizzle schema with PostgreSQL |
| `npm run db:studio` | Opens Drizzle Studio |
| `npm run build` | Builds the production client and server |
