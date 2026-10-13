import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const encryptionKey = Buffer.from(required("ENCRYPTION_KEY"), "base64");
if (encryptionKey.length !== 32) {
  throw new Error(
    "ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded). Generate one with: openssl rand -base64 32",
  );
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  databaseSsl: (process.env.DATABASE_SSL ?? "false").toLowerCase() === "true",
  encryptionKey,
  jwtSecret: required("JWT_SECRET"),
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  cookieSecure: (process.env.COOKIE_SECURE ?? "false").toLowerCase() === "true",
};
