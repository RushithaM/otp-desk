import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

const SESSION_COOKIE = "otp_desk_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
}

export function issueSessionCookie(res: Response, payload: SessionPayload) {
  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: SESSION_TTL_SECONDS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, {
    path: "/",
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? "none" : "lax",
  });
}

export interface AuthedRequest extends Request {
  session?: SessionPayload;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as SessionPayload;
    req.session = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function readSession(req: AuthedRequest): SessionPayload | null {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret) as SessionPayload;
  } catch {
    return null;
  }
}
