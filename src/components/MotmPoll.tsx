'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { emptyVoteState } from '@/lib/action-state';
import { motmTalliesAction, voteMotmAction } from '@/app/actions';
import type { VoteTally } from '@/lib/types';
import { Notice, SubmitButton } from './FormBits';

export interface Candidate {
  id: string;
  name: string;
}

const VOTER_KEY = 'motm-voter-id';
const voteKey = (matchId: string) => `motm-vote:${matchId}`;

/** localStorage her ortamda yok (gizli sekme, kapatılmış site verisi). */
function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Tarayıcı başına tek kimlik; oyun bu tarayıcıya ait olduğunu bununla söylüyoruz. */
function readVoterId(): string {
  const store = safeStorage();
  if (!store) return '';

  const existing = store.getItem(VOTER_KEY);
  if (existing) return existing;

  const fresh = crypto.randomUUID();
  try {
    store.setItem(VOTER_KEY, fresh);
  } catch {
    // Yazamıyorsak da oy kullanılabilsin; sadece kalıcı olmaz.
  }
  return fresh;
}

function formatRemaining(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} sa ${minutes} dk`;
  return `${minutes} dk`;
}

function Results({ candidates, tallies }: { candidates: Candidate[]; tallies: VoteTally[] }) {
  const counts = new Map(tallies.map((t) => [t.playerId, t.votes]));
  const total = tallies.reduce((sum, t) => sum + t.votes, 0);
  const top = Math.max(0, ...tallies.map((t) => t.votes));

  const rows = [...candidates].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));

  return (
    <div className="poll-results">
      {rows.map((c) => {
        const votes = counts.get(c.id) ?? 0;
        const share = total > 0 ? Math.round((votes / total) * 100) : 0;
        return (
          <div key={c.id} className={votes > 0 && votes === top ? 'poll-row leading' : 'poll-row'}>
            <span className="name">{c.name}</span>
            <span className="vote-bar" aria-hidden="true">
              <span style={{ width: `${share}%` }} />
            </span>
            <span className="count">{votes}</span>
          </div>
        );
      })}
      <p className="hint">
        Toplam {total} oy • Anket kapanınca en çok oyu alan(lar) +1 puan alır.
      </p>
    </div>
  );
}

export default function MotmPoll({
  matchId,
  candidates,
  closesAt,
}: {
  matchId: string;
  candidates: Candidate[];
  closesAt: number;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(voteMotmAction, emptyVoteState);

  const [voterId, setVoterId] = useState('');
  const [voted, setVoted] = useState(false);
  const [choice, setChoice] = useState('');
  const [tallies, setTallies] = useState<VoteTally[] | null>(null);
  // Sunucuda hesaplanmaz; aksi halde hydration uyuşmazlığı olur.
  const [remaining, setRemaining] = useState<number | null>(null);

  // Kimliği kur ve bu tarayıcı daha önce oy verdiyse dağılımı getir.
  useEffect(() => {
    const id = readVoterId();
    setVoterId(id);

    const store = safeStorage();
    const previous = store?.getItem(voteKey(matchId));
    if (!previous || !id) return;

    setVoted(true);
    setChoice(previous);
    motmTalliesAction(matchId, id).then(setTallies).catch(() => setTallies([]));
  }, [matchId]);

  // Oy sonucu: kaydedildiyse de "zaten oy vermişsin" dendiyse de sonucu göster.
  useEffect(() => {
    if (!state.tallies) return;

    setTallies(state.tallies);
    setVoted(true);
    if (state.ok && choice) {
      try {
        safeStorage()?.setItem(voteKey(matchId), choice);
      } catch {
        // Kalıcı işaretleyemesek de sunucu tarafındaki kilit geçerli.
      }
    }
  }, [state, choice, matchId]);

  // Geri sayım; süre dolunca sunucudan kesin sonucu al.
  useEffect(() => {
    const tick = () => {
      const left = closesAt - Date.now();
      setRemaining(left);
      if (left <= 0) router.refresh();
    };

    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, [closesAt, router]);

  const closed = remaining !== null && remaining <= 0;

  return (
    <div className="card poll-card">
      <div className="card-head">
        <h2>Maçın Adamı</h2>
        {remaining !== null && (
          <p>{closed ? 'Anket kapandı' : `Anketin kapanmasına ${formatRemaining(remaining)}`}</p>
        )}
      </div>

      <div className="card-body">
        {voted || closed ? (
          <>
            {voted && (
              <p className="hint">
                Oyunu kullandın{choice ? `: ${candidates.find((c) => c.id === choice)?.name ?? ''}` : ''}.
                Bu tarayıcıdan tekrar oy verilemez.
              </p>
            )}
            {tallies ? (
              <Results candidates={candidates} tallies={tallies} />
            ) : (
              <p className="hint">Sonuçlar yükleniyor…</p>
            )}
            {closed && !voted && <p className="hint">Anket kapandı, sonuç birazdan görünecek.</p>}
          </>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="matchId" value={matchId} />
            <input type="hidden" name="voterId" value={voterId} />

            <div className="picker">
              {candidates.map((c) => (
                <label key={c.id} className="picker-row">
                  <span className="name">{c.name}</span>
                  <input
                    type="radio"
                    name="playerId"
                    value={c.id}
                    checked={choice === c.id}
                    onChange={() => setChoice(c.id)}
                  />
                </label>
              ))}
            </div>

            <Notice state={state} />

            <SubmitButton className="btn block" pendingLabel="Gönderiliyor…">
              Oyumu ver
            </SubmitButton>
            <p className="hint">Bu tarayıcıdan bir kez oy verebilirsin.</p>
          </form>
        )}
      </div>
    </div>
  );
}
