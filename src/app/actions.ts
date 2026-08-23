'use server';

import { revalidatePath } from 'next/cache';
import { endSession, checkPassword, requireAdmin, startSession } from '@/lib/auth';
import * as db from '@/lib/db';
import { type ActionState } from '@/lib/action-state';
import type { MatchEntry, MatchResult } from '@/lib/types';

function fail(message: string): ActionState {
  return { ok: false, message };
}

function done(message: string): ActionState {
  return { ok: true, message };
}

/** Server action'ları tek tip hata mesajıyla sarmalar. */
async function run(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Beklenmeyen bir hata oluştu.';
    return fail(message);
  }
}

/* ------------------------------------------------------------------ */
/* Giris                                                               */
/* ------------------------------------------------------------------ */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    const password = String(formData.get('password') ?? '');
    if (!password) return fail('Şifre girmelisin.');
    if (!checkPassword(password)) return fail('Şifre yanlış.');
    await startSession();
    revalidatePath('/admin');
    return done('Giriş başarılı.');
  });
}

export async function logoutAction(): Promise<void> {
  await endSession();
  revalidatePath('/admin');
}

/* ------------------------------------------------------------------ */
/* Oyuncular                                                           */
/* ------------------------------------------------------------------ */

export async function addPlayerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    await requireAdmin();
    const name = String(formData.get('name') ?? '').trim();
    if (!name) return fail('Oyuncu adı boş olamaz.');

    const players = await db.getPlayers();
    if (players.some((p) => p.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'))) {
      return fail(`"${name}" zaten listede.`);
    }

    await db.createPlayer(name);
    revalidatePath('/');
    revalidatePath('/admin');
    return done(`${name} eklendi.`);
  });
}

export async function renamePlayerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    await requireAdmin();
    const id = String(formData.get('id') ?? '');
    const name = String(formData.get('name') ?? '').trim();
    if (!id) return fail('Oyuncu bulunamadı.');
    if (!name) return fail('Oyuncu adı boş olamaz.');

    await db.renamePlayer(id, name);
    revalidatePath('/');
    revalidatePath('/admin');
    return done('Oyuncu adı güncellendi.');
  });
}

export async function deletePlayerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    await requireAdmin();
    const id = String(formData.get('id') ?? '');
    if (!id) return fail('Oyuncu bulunamadı.');

    await db.deletePlayer(id);
    revalidatePath('/');
    revalidatePath('/admin');
    return done('Oyuncu silindi.');
  });
}

/* ------------------------------------------------------------------ */
/* Maclar                                                              */
/* ------------------------------------------------------------------ */

const VALID_RESULTS: MatchResult[] = ['win', 'lose', 'draw'];

function parseEntries(raw: string): MatchEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Maç verisi okunamadı.');
  }
  if (!Array.isArray(parsed)) throw new Error('Maç verisi okunamadı.');

  return parsed.map((item) => {
    const entry = item as Partial<MatchEntry>;
    if (!entry.playerId || !entry.result || !VALID_RESULTS.includes(entry.result)) {
      throw new Error('Maç verisi geçersiz.');
    }
    return { playerId: entry.playerId, result: entry.result };
  });
}

export async function saveMatchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return run(async () => {
    await requireAdmin();
    const id = String(formData.get('id') ?? '');
    const date = String(formData.get('date') ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Geçerli bir tarih seç.');

    const entries = parseEntries(String(formData.get('entries') ?? '[]'));
    if (entries.length < 2) return fail('En az 2 oyuncu seçmelisin.');

    const isDraw = entries.every((e) => e.result === 'draw');
    if (!isDraw) {
      if (entries.some((e) => e.result === 'draw')) {
        return fail('Beraberlikte tüm oyuncular berabere işaretlenmeli.');
      }
      if (!entries.some((e) => e.result === 'win') || !entries.some((e) => e.result === 'lose')) {
        return fail('Hem kazanan hem kaybeden taraf olmalı.');
      }
    }

    if (id) {
      await db.updateMatch(id, date, entries);
    } else {
      await db.createMatch(date, entries);
    }

    revalidatePath('/');
    revalidatePath('/admin');
    return done(id ? 'Maç güncellendi.' : 'Maç kaydedildi.');
  });
}

export async function deleteMatchAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return run(async () => {
    await requireAdmin();
    const id = String(formData.get('id') ?? '');
    if (!id) return fail('Maç bulunamadı.');

    await db.deleteMatch(id);
    revalidatePath('/');
    revalidatePath('/admin');
    return done('Maç silindi. İstatistikler yeniden hesaplandı.');
  });
}
