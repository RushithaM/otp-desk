import * as OTPAuth from "otpauth";
import type { Account } from "../api";

export function generateCode(account: Account): string {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(account.secret),
    algorithm: account.algorithm,
    digits: account.digits,
    period: account.period,
  });
  return totp.generate();
}

export function secondsRemaining(period: number): number {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}

export interface ParsedOtpAuth {
  label: string;
  issuer: string;
  secret: string;
  algorithm: string;
  digits: number;
  period: number;
}

export function parseOtpAuthUri(uri: string): ParsedOtpAuth | null {
  try {
    const parsed = OTPAuth.URI.parse(uri);
    if (!(parsed instanceof OTPAuth.TOTP)) {
      return null;
    }
    return {
      label: parsed.label || parsed.issuer || "Account",
      issuer: parsed.issuer ?? "",
      secret: parsed.secret.base32,
      algorithm: parsed.algorithm,
      digits: parsed.digits,
      period: parsed.period,
    };
  } catch {
    return null;
  }
}
