import type { VoteTally } from './types';

/** Server action'ların ortak dönüş tipi. ('use server' dosyalari sadece
 *  async fonksiyon export edebildigi icin ayri dosyada duruyor.) */
export interface ActionState {
  ok: boolean;
  message: string;
}

export const emptyState: ActionState = { ok: false, message: '' };

/** Maçın adamı oylaması; oy kaydedildikten sonra dağılım da döner. */
export interface MotmVoteState extends ActionState {
  tallies?: VoteTally[];
}

export const emptyVoteState: MotmVoteState = { ok: false, message: '' };
