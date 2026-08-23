'use client';

import { useActionState } from 'react';
import { emptyState } from '@/lib/action-state';
import { loginAction } from '@/app/actions';
import { Notice, SubmitButton } from './FormBits';

export default function LoginForm() {
  const [state, formAction] = useActionState(loginAction, emptyState);

  return (
    <div className="card">
      <div className="card-head">
        <h2>Admin Girişi</h2>
        <p>Maç sonuçlarını girmek için şifre gerekli.</p>
      </div>
      <div className="card-body">
        <Notice state={state} />
        <form action={formAction}>
          <div className="field">
            <label htmlFor="password">Şifre</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>
          <div className="field">
            <SubmitButton className="btn block" pendingLabel="Kontrol ediliyor…">
              Giriş Yap
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
