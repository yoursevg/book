import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const scrypt = promisify(_scrypt) as (password: string | Buffer, salt: string | Buffer, keylen: number) => Promise<Buffer>;

export type SafeUser = { id: string; username: string; email: string | null };

function toSafeUser(u: any): SafeUser {
  return { id: u.id, username: u.username, email: u.email ?? null };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return { salt, hash: derived.toString("hex") };
}

export async function verifyPassword(password: string, salt: string, expectedHexHash: string) {
  const derived = await scrypt(password, salt, 64);
  const a = Buffer.from(expectedHexHash, "hex");
  return a.length === derived.length && timingSafeEqual(a, derived);
}

if (!db) {
  // In dev without DB we could throw; but we prefer a clear runtime error when auth is used
  // eslint-disable-next-line no-console
  console.warn("Auth: database is not initialized. Registration/login will fail until DATABASE_URL is set.");
}

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      if (!db) return done(null, false, { message: "Database is not configured" });
      const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
      const user = rows[0];
      if (!user) return done(null, false, { message: "Invalid credentials" });
      const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash);
      if (!ok) return done(null, false, { message: "Invalid credentials" });
      return done(null, toSafeUser(user));
    } catch (err) {
      return done(err as Error);
    }
  })
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    if (!db) return done(new Error("Database is not configured"));
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const user = rows[0];
    if (!user) return done(null, false);
    done(null, toSafeUser(user));
  } catch (err) {
    done(err as Error);
  }
});

export function ensureAuthenticated(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({ error: "Unauthorized" });
}

export { passport };
