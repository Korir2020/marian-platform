import { useState } from 'react';
import { PageShell } from './SiteChrome';

const line = '1px solid color-mix(in oklab, var(--learn-deep) 16%, transparent)';
const S = {
  wrap: { maxWidth: 480, margin: '0 auto', padding: '1.25rem 1rem 2rem' },
  step: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--learn-deep)', letterSpacing: '0.04em', textTransform: 'uppercase' },
  h1: { fontFamily: 'Fraunces, serif', fontSize: '1.5rem', margin: '0.25rem 0 0.75rem' },
  opt: { textAlign: 'left', width: '100%', padding: '0.75rem', borderRadius: 10, border: line, background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit', marginBottom: '0.5rem' },
  on: { border: '1.5px solid var(--learn)', background: 'var(--learn-soft)' },
  optT: { fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600 },
  optD: { fontSize: '0.8125rem', opacity: 0.8 },
  label: { display: 'block', fontSize: '0.75rem', fontWeight: 600, margin: '0.75rem 0 0.25rem' },
  input: { width: '100%', boxSizing: 'border-box', height: '2.25rem', padding: '0 0.75rem', fontSize: '0.875rem', border: line, borderRadius: 8, background: 'transparent', color: 'inherit' },
  note: { fontSize: '0.8125rem', opacity: 0.8, margin: '0.75rem 0' },
  err: { fontSize: '0.8125rem', color: '#b3261e', margin: '0.5rem 0' },
  row: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem' },
  link: { fontSize: '0.875rem', background: 'none', border: 'none', color: 'var(--learn-deep)', cursor: 'pointer', padding: '0 0.5rem' },
};

export default function LearnerSignup({ go, onSignIn }) {
  const [mode, setMode] = useState(null);
  const [f, setF] = useState({ token: '', username: '', password: '', again: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const send = async () => {
    setErr('');
    if (!f.token.trim() || !f.username.trim() || !f.password) { setErr('Fill in every box.'); return; }
    if (f.password !== f.again) { setErr('The two passwords do not match.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/learning/v1/invitations/claim/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: f.token.trim(), username: f.username.trim(), password: f.password }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 201) setDone(true);
      else if (r.status === 429) setErr('Too many tries. Wait a minute.');
      else setErr(d.detail || 'This invite code cannot be used.');
    } catch {
      setErr('Cannot reach the server. Try again.');
    }
    setBusy(false);
  };

  return (
    <PageShell go={go} active="site-learning">
      <div style={S.wrap}>
        <div style={S.step}>Step 3 of 3</div>
        <h1 style={S.h1}>{done ? 'Account created' : 'Create your account'}</h1>
        {done ? (
          <>
            <p style={S.note}>Your account is ready. Sign in with your username and password.</p>
            <button type="button" className="mw-btn mw-btn--learn mw-btn--sm" onClick={onSignIn}>Sign in</button>
          </>
        ) : (
          <>
            <button type="button" style={{ ...S.opt, ...(mode === 'school' ? S.on : null) }} onClick={() => setMode('school')}>
              <div style={S.optT}>My school invited me</div>
              <div style={S.optD}>Use the invite code from your school</div>
            </button>
            <button type="button" style={{ ...S.opt, ...(mode === 'own' ? S.on : null) }} onClick={() => setMode('own')}>
              <div style={S.optT}>I'm signing up on my own</div>
              <div style={S.optD}>Email or phone sign-up</div>
            </button>

            {mode === 'own' && (
              <p style={S.note}>Sign-up on your own is not available yet. It needs email and SMS verification, which is still being set up. If your school has invited you, choose the first option.</p>
            )}

            {mode === 'school' && (
              <div>
                <label style={S.label} htmlFor="ls-token">Invite code</label>
                <input id="ls-token" style={S.input} value={f.token} onChange={set('token')} autoComplete="off" />
                <label style={S.label} htmlFor="ls-user">Choose a username</label>
                <input id="ls-user" style={S.input} value={f.username} onChange={set('username')} autoComplete="username" />
                <label style={S.label} htmlFor="ls-pass">Password</label>
                <input id="ls-pass" style={S.input} type="password" value={f.password} onChange={set('password')} autoComplete="new-password" />
                <label style={S.label} htmlFor="ls-again">Confirm password</label>
                <input id="ls-again" style={S.input} type="password" value={f.again} onChange={set('again')} autoComplete="new-password" />
                <p style={S.note}>If you are under 18, a parent or guardian must approve your invite first.</p>
                {err && <div style={S.err}>{err}</div>}
                <div style={S.row}>
                  <button type="button" className="mw-btn mw-btn--learn mw-btn--sm" disabled={busy} onClick={send}>
                    {busy ? 'Please wait' : 'Create account'}
                  </button>
                  <button type="button" style={S.link} onClick={() => go('levels')}>Back</button>
                </div>
              </div>
            )}

            {mode !== 'school' && (
              <div style={S.row}>
                <button type="button" style={S.link} onClick={() => go('levels')}>Back</button>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
