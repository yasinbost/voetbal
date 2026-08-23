'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { logoutAction } from '@/app/actions';
import type { Match, Player } from '@/lib/types';
import MatchForm from './MatchForm';
import MatchHistory from './MatchHistory';
import PlayerManager from './PlayerManager';

type Tab = 'match' | 'players' | 'history';

const TABS: { id: Tab; label: string }[] = [
  { id: 'match', label: 'Maç Ekle' },
  { id: 'players', label: 'Oyuncular' },
  { id: 'history', label: 'Geçmiş' },
];

export default function AdminPanel({
  players,
  matches,
}: {
  players: Player[];
  matches: Match[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('match');
  const [editing, setEditing] = useState<Match | null>(null);

  // useCallback şart: refresh sonrası yeni fonksiyon kimliği effect'leri
  // tekrar tetikleyip sonsuz döngüye girerdi.
  const refresh = useCallback(() => router.refresh(), [router]);

  const handleSaved = useCallback(() => {
    setEditing(null);
    router.refresh();
  }, [router]);

  const handleEdit = useCallback((match: Match) => {
    setEditing(match);
    setTab('match');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Admin bölümleri">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'match' && (
        <MatchForm
          players={players}
          editing={editing}
          onSaved={handleSaved}
          onCancelEdit={() => setEditing(null)}
        />
      )}
      {tab === 'players' && <PlayerManager players={players} onChanged={refresh} />}
      {tab === 'history' && (
        <MatchHistory
          matches={matches}
          players={players}
          onEdit={handleEdit}
          onChanged={refresh}
        />
      )}

      <form action={logoutAction} style={{ marginTop: 16, textAlign: 'center' }}>
        <button type="submit" className="btn ghost small">
          Çıkış Yap
        </button>
      </form>
    </>
  );
}
