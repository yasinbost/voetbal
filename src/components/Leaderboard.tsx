'use client';

import { useState } from 'react';
import { formatAttendance, formatAverage, sortByAverage, sortByPoints } from '@/lib/stats';
import type { PlayerStats } from '@/lib/types';

function rankCell(index: number) {
  return <span className={index < 3 ? `rank-badge top-${index + 1}` : 'rank-badge'}>{index + 1}</span>;
}

function NameCell({ stats }: { stats: PlayerStats }) {
  return (
    <td>
      {stats.name}
      <span className="sub">{formatAttendance(stats)} katılım</span>
    </td>
  );
}

function TotalTable({ stats }: { stats: PlayerStats[] }) {
  const rows = sortByPoints(stats);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Oyuncu</th>
            <th title="Oynadığı Maç">OM</th>
            <th title="Galibiyet">G</th>
            <th title="Beraberlik">B</th>
            <th title="Mağlubiyet">M</th>
            <th title="Puan">P</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.playerId} className={s.played === 0 ? 'dim' : `podium-${i + 1}`}>
              <td>{s.played === 0 ? i + 1 : rankCell(i)}</td>
              <NameCell stats={s} />
              <td>{s.played}</td>
              <td>{s.wins}</td>
              <td>{s.draws}</td>
              <td>{s.losses}</td>
              <td className="points">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AverageTable({ stats }: { stats: PlayerStats[] }) {
  const qualified = sortByAverage(stats.filter((s) => s.played > 0));
  const rest = sortByAverage(stats.filter((s) => s.played === 0));

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Oyuncu</th>
            <th title="Oynadığı Maç">OM</th>
            <th title="Puan">P</th>
            <th title="Maç Başına Ortalama Puan">ORT</th>
          </tr>
        </thead>
        <tbody>
          {qualified.map((s, i) => (
            <tr key={s.playerId} className={`podium-${i + 1}`}>
              <td>{rankCell(i)}</td>
              <NameCell stats={s} />
              <td>{s.played}</td>
              <td>{s.points}</td>
              <td className="points">{formatAverage(s.average)}</td>
            </tr>
          ))}

          {qualified.length === 0 && (
            <tr>
              <td colSpan={5} className="empty">
                Henüz maça çıkan oyuncu yok.
              </td>
            </tr>
          )}

          {rest.length > 0 && (
            <>
              <tr className="section-label">
                <td colSpan={5}>Henüz maçı yok</td>
              </tr>
              {rest.map((s) => (
                <tr key={s.playerId} className="dim">
                  <td>–</td>
                  <NameCell stats={s} />
                  <td>{s.played}</td>
                  <td>{s.points}</td>
                  <td>{s.played > 0 ? formatAverage(s.average) : '–'}</td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Leaderboard({
  stats,
}: {
  stats: PlayerStats[];
}) {
  const [tab, setTab] = useState<'total' | 'average'>('total');

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Sıralama türü">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'total'}
          onClick={() => setTab('total')}
        >
          Toplam Puan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'average'}
          onClick={() => setTab('average')}
        >
          Maç Başına Ortalama
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{tab === 'total' ? 'Puan Durumu' : 'Form Sıralaması'}</h2>
          {tab === 'average' && (
            <p>Toplam puan ÷ oynadığı maç</p>
          )}
        </div>
        {tab === 'total' ? (
          <TotalTable stats={stats} />
        ) : (
          <AverageTable stats={stats} />
        )}
      </div>
    </>
  );
}
