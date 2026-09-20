import "server-only";

import { and, eq, gt, asc } from "drizzle-orm";
import { getDb } from "@/db";
import { users, sessions, businesses } from "@/db/schema";
import { appOrigin } from "./server-config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "ja_session";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
};

export type Business = {
  id: string;
  name: string;
  businessType: string;
  accountingYearStart: string;
  taxEstimateRate: number;
};

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64Url(value);
}

export async function codeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

export function isSameOrigin(request: Request) {
  const expected = appOrigin();
  const origin = request.headers.get("origin");
  if (origin) return origin === expected;
  const referer = request.headers.get("referer");
  try { return Boolean(referer && new URL(referer).origin === expected); } catch { return false; }
}

export function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export async function getAppUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const [row] = await getDb().select({ id: users.id, email: users.email, name: users.name, pictureUrl: users.pictureUrl })
    .from(sessions).innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date().toISOString()))).limit(1);
  return row ?? null;
}

export async function requireAppUser(): Promise<AppUser> {
  const user = await getAppUser();
  if (!user) redirect("/?signin=required");
  return user;
}

export async function getOwnedBusiness(userId: string): Promise<Business | null> {
  const [row] = await getDb().select({ id: businesses.id, name: businesses.name, businessType: businesses.businessType,
    accountingYearStart: businesses.accountingYearStart, taxEstimateRate: businesses.taxEstimateRate })
    .from(businesses).where(eq(businesses.ownerUserId, userId)).orderBy(asc(businesses.createdAt)).limit(1);
  return row ?? null;
}

export async function requireOwnedBusiness(userId: string): Promise<Business> {
  const business = await getOwnedBusiness(userId);
  if (!business) redirect("/setup");
  return business;
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  maxAge: 60 * 60 * 24 * 30,
};
