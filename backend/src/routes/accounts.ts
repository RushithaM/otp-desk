import { Router } from "express";
import { pool } from "../db.js";
import { encryptSecret, decryptSecret } from "../crypto.js";
import { requireAuth, type AuthedRequest } from "../auth.js";
import { asyncHandler } from "../asyncHandler.js";

export const accountsRouter = Router();
accountsRouter.use(requireAuth);

const BASE32_RE = /^[A-Z2-7]+=*$/i;

interface AccountRow {
  id: string;
  label: string;
  issuer: string;
  secret_encrypted: string;
  algorithm: string;
  digits: number;
  period: number;
  created_at: string;
}

function serialize(row: AccountRow) {
  return {
    id: row.id,
    label: row.label,
    issuer: row.issuer,
    secret: decryptSecret(row.secret_encrypted),
    algorithm: row.algorithm,
    digits: row.digits,
    period: row.period,
    createdAt: row.created_at,
  };
}

accountsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const result = await pool.query<AccountRow>(
      "SELECT id, label, issuer, secret_encrypted, algorithm, digits, period, created_at FROM accounts WHERE user_id = $1 ORDER BY created_at ASC",
      [req.session!.userId],
    );
    res.json({ accounts: result.rows.map(serialize) });
  }),
);

accountsRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { label, issuer, secret, algorithm, digits, period } = req.body ?? {};

    if (typeof label !== "string" || label.trim() === "") {
      return res.status(400).json({ error: "Account label is required" });
    }
    if (typeof secret !== "string" || secret.trim() === "") {
      return res.status(400).json({ error: "Secret key is required" });
    }
    const cleanedSecret = secret.replace(/\s+/g, "").toUpperCase();
    if (!BASE32_RE.test(cleanedSecret)) {
      return res.status(400).json({ error: "Secret key must be valid base32" });
    }

    const resolvedAlgorithm =
      typeof algorithm === "string" && algorithm.trim() !== "" ? algorithm.toUpperCase() : "SHA1";
    const resolvedDigits = Number.isInteger(digits) && digits > 0 ? digits : 6;
    const resolvedPeriod = Number.isInteger(period) && period > 0 ? period : 30;

    const result = await pool.query<AccountRow>(
      `INSERT INTO accounts (user_id, label, issuer, secret_encrypted, algorithm, digits, period)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, label, issuer, secret_encrypted, algorithm, digits, period, created_at`,
      [
        req.session!.userId,
        label.trim(),
        typeof issuer === "string" ? issuer.trim() : "",
        encryptSecret(cleanedSecret),
        resolvedAlgorithm,
        resolvedDigits,
        resolvedPeriod,
      ],
    );
    res.status(201).json({ account: serialize(result.rows[0]) });
  }),
);

accountsRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { label, issuer } = req.body ?? {};
    if (typeof label !== "string" || label.trim() === "") {
      return res.status(400).json({ error: "Account label is required" });
    }

    const result = await pool.query<AccountRow>(
      `UPDATE accounts SET label = $1, issuer = $2
       WHERE id = $3 AND user_id = $4
       RETURNING id, label, issuer, secret_encrypted, algorithm, digits, period, created_at`,
      [label.trim(), typeof issuer === "string" ? issuer.trim() : "", req.params.id, req.session!.userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Account not found" });
    }
    res.json({ account: serialize(result.rows[0]) });
  }),
);

accountsRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const result = await pool.query("DELETE FROM accounts WHERE id = $1 AND user_id = $2", [
      req.params.id,
      req.session!.userId,
    ]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Account not found" });
    }
    res.status(204).end();
  }),
);
