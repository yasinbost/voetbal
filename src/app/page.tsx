import Link from 'next/link';
import Leaderboard from '@/components/Leaderboard';
import { getMatches, getPlayers } from '@/lib/db';
import { computeStats, formatDate } from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [players, matches] = await Promise.all([getPlayers(), getMatches()]);
  const stats = computeStats(players, matches);
  const lastMatch = matches[0];
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
        Katılım +1 • Galibiyet +2 • Beraberlik +1 — yani maça çıkan herkes en az 1 puan alır.
        <br />
        Tüm istatistikler maç kayıtlarından anlık hesaplanır.
      </p>
    </main>
  );
}
