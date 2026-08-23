import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * Basit tek-şifre koruması. Kullanıcı bazlı login yok; amaç sadece
 * rastgele birinin sonuç girmesini engellemek.
 *
 * Şifre `.env.local` / Vercel ortam değişkeni ADMIN_PASSWORD ile ayarlanır.
 */
const FALLBACK_PASSWORD = 'Zaltbommel!';

export const SESSION_COOKIE = 'halisaha_admin';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 gun

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || FALLBACK_PASSWORD;
}

/** Cookie'ye şifrenin kendisi değil, türevi yazılır. */
function sessionToken(): string {
  return createHash('sha256').update(`halisaha::${adminPassword()}`).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function checkPassword(input: string): boolean {
  return safeEqual(input, adminPassword());
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  return Boolean(value && safeEqual(value, sessionToken()));
}

export async function startSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Her admin işlemi öncesi çağrılır. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error('Yetkisiz işlem. Lütfen tekrar giriş yap.');
}
