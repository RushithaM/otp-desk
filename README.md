# OTP Desk

A minimal, self-hosted authenticator app that runs in the browser — like Google
Authenticator, but as a web app backed by PostgreSQL so your accounts are
available from any device.

## Architecture

- **`frontend/`** — React + Vite + TypeScript single-page app. Scans or
  accepts an uploaded QR code (or a manually entered secret key), and
  generates TOTP codes locally in the browser.
- **`backend/`** — Express + TypeScript API. Handles user authentication
  (email/password, JWT session cookie) and stores TOTP secrets in
  PostgreSQL, encrypted at rest with AES-256-GCM.

Secrets are never stored in plaintext in the database, and the database
connection string and encryption key never leave the backend.

## Prerequisites

- Node.js 18+
- A PostgreSQL database (a Supabase project works out of the box)

## 1. Database setup

Create the schema by running the migration against your PostgreSQL
instance. This works with any Postgres database, including Supabase's.

```bash
cd backend
cp .env.example .env
# edit .env — see "Environment variables" below
npm install
npm run migrate
```

The migration creates two tables: `users` and `accounts` (see
`backend/migrations/001_init.sql`).

## 2. Backend environment variables (`backend/.env`)

| Variable          | Description                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string. For Supabase, use the connection string from Project Settings → Database. |
| `DATABASE_SSL`     | Set to `true` for Supabase or any Postgres instance that requires SSL.                       |
| `ENCRYPTION_KEY`   | 32-byte base64 key used to encrypt TOTP secrets at rest. Generate with `openssl rand -base64 32`. |
| `JWT_SECRET`       | Secret used to sign session cookies. Generate with `openssl rand -base64 32`.                |
| `PORT`             | Port the backend listens on (default `4000`).                                                |
| `FRONTEND_ORIGIN`  | Origin of the frontend, used for CORS (default `http://localhost:3000`).                     |
| `COOKIE_SECURE`    | Set to `true` in production when serving the backend over HTTPS.                             |

Never commit `backend/.env` — it's already covered by `.gitignore`.

## 3. Frontend environment variables (`frontend/.env`)

```bash
cd frontend
cp .env.example .env
```

| Variable        | Description                        |
| ---------------- | ------------------------------------ |
| `VITE_API_URL`  | Base URL of the backend API (default `http://localhost:4000`). |

## 4. Local development

In one terminal:

```bash
cd backend
npm run dev
```

In another:

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`, register an account, and start adding
authenticator entries.

## 5. Production build

```bash
cd backend && npm run build && npm start
cd frontend && npm run build   # outputs static assets to frontend/dist
```

Serve `frontend/dist` with any static file host (Vercel, Netlify, nginx,
etc.), pointing `VITE_API_URL` at your deployed backend, and run the
backend as a standard Node process.

## Security notes

- Passwords are hashed with bcrypt before storage.
- TOTP secrets are encrypted with AES-256-GCM before being written to
  PostgreSQL; the encryption key lives only in the backend's environment.
- Sessions are JWTs stored in an `httpOnly` cookie — never exposed to
  frontend JavaScript.
- The decrypted secret for an account is only ever sent to that account's
  owner, over an authenticated request, so the browser can compute the
  rolling 6-digit code locally without round-tripping to the server every
  second.

## Adding an account

- **Scan**: use the camera to scan a QR code shown by the service you're
  enabling 2FA for.
- **Upload**: upload a screenshot or saved image of the QR code.
- **Manual entry**: paste the base32 secret key directly.
