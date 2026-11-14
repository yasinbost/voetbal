import Link from 'next/link';
import Leaderboard from '@/components/Leaderboard';
import MotmPoll, { type Candidate } from '@/components/MotmPoll';
import MotmResults from '@/components/MotmResults';
import { getMatches, getPlayers, getVoteTallies } from '@/lib/db';
import { isPollOpen, latestMatch, motmWinnersByMatch, pollClosesAt } from '@/lib/motm';
import { computeStats, formatDate } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [players, matches, tallies] = await Promise.all([
    getPlayers(),
    getMatches(),
    getVoteTallies(),
  ]);

  const now = Date.now();
  // Puana yalnızca anketi kapanmış maçların kazananları girer.
  const motmWinners = motmWinnersByMatch(matches, tallies, now);
  const stats = computeStats(players, matches, motmWinners);
  const lastMatch = matches[0];

  // Anket, tarihi en yeni maça değil, en son kaydedilen maça bağlıdır.
  const pollMatch = latestMatch(matches);
  const playerName = (id: string) => players.find((p) => p.id === id)?.name;
  const candidates: Candidate[] = (pollMatch?.entries ?? []).flatMap((entry) => {
    const name = playerName(entry.playerId);
    return name ? [{ id: entry.playerId, name }] : [];
  });
  const pollOpen = pollMatch ? isPollOpen(pollMatch, now) : false;
  const motmNames = pollMatch
    ? (motmWinners.get(pollMatch.id) ?? []).flatMap((id) => {
        const name = playerName(id);
        return name ? [name] : [];
      })
    : [];
  const activePlayers = stats.filter((s) => s.played > 0).length;
  const leader = [...stats].sort(
    (a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name, 'tr'),
  )[0];

  return (
    <main className="page">
      <header className="header">
        <div className="brand-lockup">
          <img className="brand-logo" src="/brand/saha-lig-logo.svg" alt="" width="56" height="56" />
          <div>
            <h1>Liga Zaltbommel</h1>
            <p>
              {matches.length > 0
                ? `${matches.length} maç • Son maç ${formatDate(lastMatch.date)}`
                : 'Haftalık maçların kişi bazlı sıralaması'}
            </p>
          </div>
        </div>
        <Link className="admin-link" href="/admin">
          Admin
        </Link>
      </header>

      <section className="summary-grid" aria-label="Lig özeti">
        <div className="summary-item">
          <span>Maç</span>
          <strong>{matches.length}</strong>
        </div>
        <div className="summary-item">
          <span>Aktif oyuncu</span>
          <strong>{activePlayers}</strong>
        </div>
        <div className="summary-item wide">
          <span>Lider</span>
          <strong>{leader && leader.points > 0 ? leader.name : '-'}</strong>
        </div>
      </section>

      {pollMatch && candidates.length > 0 && (
        pollOpen ? (
          <MotmPoll
            matchId={pollMatch.id}
            candidates={candidates}
            closesAt={pollClosesAt(pollMatch)}
          />
        ) : (
          <div className="card poll-card">
            <div className="card-head">
              <h2>Maçın Adamı</h2>
              <p>{formatDate(pollMatch.date)} maçı</p>
            </div>
            <div className="card-body">
              {motmNames.length > 0 ? (
                <>
                  <p className="motm-winner">🏅 {motmNames.join(', ')}</p>
                  <p className="hint">
                    Anket kapandı; {motmNames.length > 1 ? 'eşit oy alanların her birine' : 'kazanana'}{' '}
                    +1 puan eklendi.
                  </p>
                  <details className="poll-details">
                    <summary>Oy dağılımı</summary>
                    <MotmResults
                      candidates={candidates}
                      tallies={tallies.filter((t) => t.matchId === pollMatch.id)}
                      hint="Eşit oy alanların hepsi maçın adamı sayılır."
                    />
                  </details>
                </>
              ) : (
                <p className="hint">Bu maçta oy kullanılmadı, maçın adamı seçilmedi.</p>
              )}
            </div>
          </div>
        )
      )}

      {players.length === 0 || matches.length === 0 ? (
        <div className="card">
          <div className="empty">
            <strong>Henüz maç kaydı yok</strong>
            {players.length === 0
              ? 'Başlamak için admin panelinden oyuncuları ekle.'
              : 'İlk maç sonucunu admin panelinden girebilirsin.'}
          </div>
        </div>
      ) : (
        <Leaderboard stats={stats} />
      )}

      <p className="footer-note">
        Katılım +1 • Galibiyet +1 • Maçın adamı +1 — maça çıkan herkes en az 1 puan alır.
        <br />
        Tüm istatistikler maç kayıtlarından anlık hesaplanır.
      </p>
    </main>
  );
}
