import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";

const ADMIN_COOKIE = "ff_admin";
const CUSTOMER_COOKIE = "ff_customer";

function secretKey() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) throw new Error("APP_SECRET vantar í .env");
  return new TextEncoder().encode(s);
}

async function sign(payload: Record<string, unknown>, days: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secretKey());
}

async function verify<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as T;
  } catch {
    return null;
  }
}

const cookieOpts = (days: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: days * 86400,
});

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function checkPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

// ── Stjórnendur ────────────────────────────────────────────────
export async function loginAdmin(email: string, password: string) {
  const user = await db.adminUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !(await checkPassword(password, user.passwordHash))) return null;
  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = await sign({ sub: user.id, role: "admin" }, 14);
  (await cookies()).set(ADMIN_COOKIE, token, cookieOpts(14));
  return user;
}

export async function logoutAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function getAdmin() {
  const p = await verify<{ sub: string; role: string }>((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!p || p.role !== "admin") return null;
  return db.adminUser.findUnique({ where: { id: p.sub }, select: { id: true, email: true, name: true } });
}

/** Notað efst í öllum stjórnborðsaðgerðum og -síðum */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/innskraning");
  return admin;
}

// ── Viðskiptavinir ─────────────────────────────────────────────
export async function startCustomerSession(customerId: string) {
  const token = await sign({ sub: customerId, role: "customer" }, 60);
  (await cookies()).set(CUSTOMER_COOKIE, token, cookieOpts(60));
}

export async function logoutCustomer() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

export async function getCustomer() {
  const p = await verify<{ sub: string; role: string }>((await cookies()).get(CUSTOMER_COOKIE)?.value);
  if (!p || p.role !== "customer") return null;
  return db.customer.findUnique({ where: { id: p.sub } });
}

export async function requireCustomer() {
  const c = await getCustomer();
  if (!c) redirect("/minar-sidur/innskraning");
  return c;
}

// ── Innskráningartengill í tölvupósti (gildir í 30 mín.) ────────
export async function createMagicToken(customerId: string) {
  return new SignJWT({ sub: customerId, role: "magic" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secretKey());
}

export async function verifyMagicToken(token: string) {
  const p = await verify<{ sub: string; role: string }>(token);
  return p && p.role === "magic" ? p.sub : null;
}
