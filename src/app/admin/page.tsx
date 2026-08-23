import Link from 'next/link';
import AdminPanel from '@/components/AdminPanel';
import LoginForm from '@/components/LoginForm';
import { isAdmin } from '@/lib/auth';
import { getMatches, getPlayers, usingPostgres } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin • Liga Zaltbommel',
};

export default async function AdminPage() {
  const admin = await isAdmin();

  const [players, matches] = admin ? await Promise.all([getPlayers(), getMatches()]) : [[], []];

  return (
    <main className="page">
      <header className="header">
        <div className="brand-lockup">
          <img className="brand-logo" src="/brand/saha-lig-logo.svg" alt="" width="56" height="56" />
          <div>
            <span className="eyebrow">Liga Zaltbommel yönetimi</span>
            <h1>Admin Paneli</h1>
            <p>Maç sonuçlarını ve oyuncuları yönet</p>
          </div>
        </div>
        <Link className="admin-link" href="/">
          ← Tabloya dön
        </Link>
      </header>

      {admin ? (
        <AdminPanel players={players} matches={matches} />
      ) : (
        <LoginForm />
      )}

      {admin && (
        <p className="footer-note">
          {usingPostgres ? (
            <>Veriler Supabase Postgres içinde tutuluyor.</>
          ) : (
            <>
              Veriler yerel <code>data/local-db.json</code> dosyasında tutuluyor.
            </>
          )}
        </p>
      )}
    </main>
  );
}
