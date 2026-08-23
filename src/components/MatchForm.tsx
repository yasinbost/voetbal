'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { emptyState } from '@/lib/action-state';
import { saveMatchAction } from '@/app/actions';
import type { Match, MatchResult, Player } from '@/lib/types';
import { Notice, SubmitButton } from './FormBits';

type Selection = Record<string, MatchResult>;

const OPTIONS: { value: MatchResult; short: string; label: string }[] = [
  { value: 'win', short: 'G', label: 'Kazandı' },
  { value: 'draw', short: 'B', label: 'Berabere' },
  { value: 'lose', short: 'M', label: 'Mağlup' },
];

function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function selectionFrom(match: Match | null): Selection {
  if (!match) return {};
  return Object.fromEntries(match.entries.map((e) => [e.playerId, e.result]));
}

export default function MatchForm({
  players,
  editing,
  onSaved,
  onCancelEdit,
}: {
  players: Player[];
  editing: Match | null;
  onSaved: () => void;
  onCancelEdit: () => void;
}) {
  const [state, formAction] = useActionState(saveMatchAction, emptyState);
  const [date, setDate] = useState(() => editing?.date ?? today());
  const [selection, setSelection] = useState<Selection>(() => selectionFrom(editing));

  // Düzenlenecek maç değişince formu doldur.
  useEffect(() => {
    setDate(editing?.date ?? today());
    setSelection(selectionFrom(editing));
  }, [editing]);

  // Kayıt başarılı olunca formu sıfırla ve listeyi tazele.
  useEffect(() => {
    if (!state.ok) return;
    setSelection({});
    setDate(today());
    onSaved();
  }, [state, onSaved]);

  const counts = useMemo(() => {
    const values = Object.values(selection);
    return {
      total: values.length,
      win: values.filter((v) => v === 'win').length,
      draw: values.filter((v) => v === 'draw').length,
      lose: values.filter((v) => v === 'lose').length,
    };
  }, [selection]);

  function setResult(playerId: string, result: MatchResult) {
    setSelection((prev) => {
      const next = { ...prev };
      if (next[playerId] === result) delete next[playerId];
      else next[playerId] = result;
      return next;
    });
  }

  const entries = Object.entries(selection).map(([playerId, result]) => ({ playerId, result }));

  if (players.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          <strong>Önce oyuncu ekle</strong>
          Maç sonucu girebilmek için oyuncu listesi gerekli.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>{editing ? 'Maçı Düzenle' : 'Yeni Maç Sonucu'}</h2>
        <p>Oyuncuları seç: G = kazandı, B = berabere, M = mağlup.</p>
      </div>
      <div className="card-body">
        <Notice state={state} />

        <form action={formAction}>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <input type="hidden" name="entries" value={JSON.stringify(entries)} />

          <div className="field">
            <label htmlFor="date">Tarih</label>
            <input
              id="date"
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Oyuncular</label>
            <div className="picker">
              {players.map((p) => (
                <div key={p.id} className="picker-row">
                  <span className="name">{p.name}</span>
                  <div className="seg">
                    {OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={opt.value}
                        aria-pressed={selection[p.id] === opt.value}
                        aria-label={`${p.name}: ${opt.label}`}
                        title={opt.label}
                        onClick={() => setResult(p.id, opt.value)}
                      >
                        {opt.short}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="summary-bar">
              <span>
                Seçili: <strong>{counts.total}</strong>
              </span>
              <span>Kazanan: {counts.win}</span>
              <span>Berabere: {counts.draw}</span>
              <span>Mağlup: {counts.lose}</span>
            </div>

            <div className="row">
              <button type="button" className="btn ghost small" onClick={() => setSelection({})}>
                Temizle
              </button>
            </div>
          </div>

          <div className="field row">
            <SubmitButton className="btn block">
              {editing ? 'Değişiklikleri Kaydet' : 'Maçı Kaydet'}
            </SubmitButton>
            {editing && (
              <button type="button" className="btn ghost" onClick={onCancelEdit}>
                Vazgeç
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
