import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { issueSessionCookie, clearSessionCookie, readSession, requireAuth, type AuthedRequest } from "../auth.js";
import { asyncHandler } from "../asyncHandler.js";

export const authRouter = Router();

const MIN_PASSWORD_LENGTH = 8;

function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email) || typeof password !== "string") {
      return res.status(400).json({ error: "A valid email and password are required" });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [normalizedEmail]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ error: "An account with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query<{ id: string; email: string }>(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [normalizedEmail, passwordHash],
    );
    const user = result.rows[0];
    issueSessionCookie(res, { userId: user.id, email: user.email });
    res.status(201).json({ user: { id: user.id, email: user.email } });
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!isValidEmail(email) || typeof password !== "string") {
      return res.status(400).json({ error: "A valid email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query<{ id: string; email: string; password_hash: string }>(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [normalizedEmail],
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    issueSessionCookie(res, { userId: user.id, email: user.email });
    res.json({ user: { id: user.id, email: user.email } });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/session", (req: AuthedRequest, res) => {
  const session = readSession(req);
  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ user: { id: session.userId, email: session.email } });
});

export { requireAuth };
