/** Server action'ların ortak dönüş tipi. ('use server' dosyalari sadece
 *  async fonksiyon export edebildigi icin ayri dosyada duruyor.) */
export interface ActionState {
  ok: boolean;
  message: string;
}

export const emptyState: ActionState = { ok: false, message: '' };
