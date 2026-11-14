import { pollResultRows, type PollCandidate } from '@/lib/motm';
import type { VoteTally } from '@/lib/types';

/** Oy dağılımı listesi; açık ankette (oy verene) ve kapanmış ankette kullanılır. */
export default function MotmResults({
  candidates,
  tallies,
  hint,
}: {
  candidates: PollCandidate[];
  tallies: VoteTally[];
  hint: string;
}) {
  const { rows, total } = pollResultRows(candidates, tallies);

  return (
    <div className="poll-results">
      {rows.map((row) => (
        <div key={row.id} className={row.leading ? 'poll-row leading' : 'poll-row'}>
          <span className="name">{row.name}</span>
          <span className="vote-bar" aria-hidden="true">
            <span style={{ width: `${row.share}%` }} />
          </span>
          <span className="count">{row.votes}</span>
        </div>
      ))}
      <p className="hint">
        Toplam {total} oy • {hint}
      </p>
    </div>
  );
}
