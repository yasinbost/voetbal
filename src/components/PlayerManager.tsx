'use client';

import { useActionState, useEffect, useState } from 'react';
import { emptyState } from '@/lib/action-state';
import { addPlayerAction, deletePlayerAction, renamePlayerAction } from '@/app/actions';
import type { Player } from '@/lib/types';
import { Notice, SubmitButton } from './FormBits';

function PlayerRow({ player, onChanged }: { player: Player; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [renameState, renameAction] = useActionState(renamePlayerAction, emptyState);
  const [deleteState, deleteAction] = useActionState(deletePlayerAction, emptyState);

  useEffect(() => {
    if (renameState.ok) {
      setEditing(false);
      onChanged();
    }
  }, [renameState, onChanged]);

  useEffect(() => {
    if (deleteState.ok) {
      setConfirmingDelete(false);
      onChanged();
    }
  }, [deleteState, onChanged]);

  return (
    <div className="list-row">
      <div className="grow">
        {editing ? (
          <form action={renameAction} className="row">
            <input type="hidden" name="id" value={player.id} />
            <div className="field">
              <input name="name" type="text" defaultValue={player.name} autoFocus required />
            </div>
            <SubmitButton className="btn small">Kaydet</SubmitButton>
            <button type="button" className="btn ghost small" onClick={() => setEditing(false)}>
              Vazgeç
            </button>
          </form>
        ) : (
          <span>{player.name}</span>
        )}
        <Notice state={renameState.ok ? emptyState : renameState} />
        <Notice state={deleteState.ok ? emptyState : deleteState} />
      </div>

      {!editing && (
        <>
          {confirmingDelete ? (
            <>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={player.id} />
                <SubmitButton className="btn danger small" pendingLabel="Siliniyor…">
                  Eminim, sil
                </SubmitButton>
              </form>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => setConfirmingDelete(false)}
              >
                Vazgeç
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn ghost small" onClick={() => setEditing(true)}>
                Düzenle
              </button>
              <button
                type="button"
                className="btn danger small"
                onClick={() => setConfirmingDelete(true)}
              >
                Sil
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function PlayerManager({
  players,
  onChanged,
}: {
  players: Player[];
  onChanged: () => void;
}) {
  const [state, formAction] = useActionState(addPlayerAction, emptyState);

  useEffect(() => {
    if (state.ok) onChanged();
  }, [state, onChanged]);

  return (
    <div className="card">
      <div className="card-head">
        <h2>Oyuncular</h2>
        <p>{players.length} kayıtlı oyuncu</p>
      </div>
      <div className="card-body">
        <Notice state={state} />

        <form action={formAction} className="row">
          <div className="field">
            <label htmlFor="new-player">Yeni oyuncu</label>
            <input id="new-player" name="name" type="text" placeholder="Ad Soyad" required />
          </div>
          <SubmitButton className="btn">Ekle</SubmitButton>
        </form>

        {players.length === 0 ? (
          <p className="hint">Henüz oyuncu yok.</p>
        ) : (
          <div style={{ marginTop: 12 }}>
            {players.map((p) => (
              <PlayerRow key={p.id} player={p} onChanged={onChanged} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
