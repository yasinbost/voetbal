'use client';

import { useActionState, useEffect, useState } from 'react';
import { emptyState } from '@/lib/action-state';
import { deleteMatchAction } from '@/app/actions';
import { formatDate } from '@/lib/stats';
import type { Match, MatchResult, Player } from '@/lib/types';
import { Notice, SubmitButton } from './FormBits';

const GROUPS: { result: MatchResult; label: string; className: string }[] = [
  { result: 'win', label: 'Kazanan', className: 'win' },
  { result: 'lose', label: 'Kaybeden', className: 'lose' },
  { result: 'draw', label: 'Berabere', className: '' },
];

function MatchRow({
  match,
  nameOf,
  onEdit,
  onChanged,
}: {
  match: Match;
  nameOf: (id: string) => string;
  onEdit: (match: Match) => void;
  onChanged: () => void;
}) {
  const [state, formAction] = useActionState(deleteMatchAction, emptyState);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state.ok) onChanged();
  }, [state, onChanged]);

  return (
    <div className="list-row">
      <div className="grow">
        <strong>{formatDate(match.date)}</strong>
        <span className="meta"> • {match.entries.length} oyuncu</span>

        {GROUPS.map(({ result, label, className }) => {
          const names = match.entries.filter((e) => e.result === result).map((e) => nameOf(e.playerId));
          if (names.length === 0) return null;
          return (
            <div key={result} className="chips">
              <span className="chip">{label}</span>
              {names.map((name) => (
                <span key={name} className={`chip ${className}`}>
                  {name}
                </span>
              ))}
            </div>
          );
        })}

        <Notice state={state.ok ? emptyState : state} />
      </div>

      <button type="button" className="btn ghost small" onClick={() => onEdit(match)}>
        Düzenle
      </button>

      {confirming ? (
        <form action={formAction}>
          <input type="hidden" name="id" value={match.id} />
          <SubmitButton className="btn danger small" pendingLabel="Siliniyor…">
            Eminim, sil
          </SubmitButton>
        </form>
      ) : (
        <button type="button" className="btn danger small" onClick={() => setConfirming(true)}>
          Sil
        </button>
      )}
    </div>
  );
}

export default function MatchHistory({
  matches,
  players,
  onEdit,
  onChanged,
}: {
  matches: Match[];
  players: Player[];
  onEdit: (match: Match) => void;
  onChanged: () => void;
}) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? 'Silinmiş oyuncu';

  return (
    <div className="card">
      <div className="card-head">
        <h2>Maç Geçmişi</h2>
        <p>{matches.length} maç kaydı</p>
      </div>
      <div className="card-body">
        {matches.length === 0 ? (
          <p className="hint">Henüz maç kaydı yok.</p>
        ) : (
          matches.map((m) => (
            <MatchRow key={m.id} match={m} nameOf={nameOf} onEdit={onEdit} onChanged={onChanged} />
          ))
        )}
        <p className="hint">Bir maçı silmek veya düzenlemek istatistikleri anında yeniden hesaplar.</p>
      </div>
    </div>
  );
}
