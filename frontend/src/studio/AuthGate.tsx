import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { getCurrentUser, signIn, signOut, type ApiError, type StudioUser } from './lib/api/client';
import { apiConfigured } from './lib/api/client';

type AuthState = 'checking' | 'signed-out' | 'signed-in' | 'unavailable';

function apiStatus(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as ApiError).status)
    : undefined;
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(apiConfigured ? 'checking' : 'signed-in');
  const [user, setUser] = useState<StudioUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function refreshSession() {
    setState('checking');
    try {
      const current = await getCurrentUser();
      setUser(current);
      setState('signed-in');
      setMessage('');
    } catch (error) {
      const status = apiStatus(error);
      if (status === 401 || status === 403) {
        setUser(null);
        setState('signed-out');
      } else {
        setState('unavailable');
        setMessage(error instanceof Error ? error.message : 'The Studio API could not be reached.');
      }
    }
  }

  useEffect(() => {
    if (apiConfigured) void refreshSession();
  }, []);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const signedInUser = await signIn(username, password);
      setUser(signedInUser);
      setPassword('');
      setState('signed-in');
    } catch (error) {
      setMessage(apiStatus(error) === 403
        ? 'Sign-in was blocked. Refresh the page and try again.'
        : apiStatus(error) === 400 || apiStatus(error) === 401
          ? 'The username or password was not accepted.'
          : 'Could not sign in. Check the API connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      setUser(null);
      setState('signed-out');
    }
  }

  if (state === 'checking') {
    return <main className="auth-screen"><section className="auth-card" role="status">Checking your Studio session…</section></main>;
  }

  if (state === 'unavailable') {
    return <main className="auth-screen"><section className="auth-card">
      <span className="auth-eyebrow">STUDIO API</span>
      <h1>Connection unavailable</h1>
      <p>{message || 'The Studio API could not be reached.'}</p>
      <button className="button button-primary" onClick={() => void refreshSession()}>Retry connection</button>
    </section></main>;
  }

  if (state === 'signed-out') {
    return <main className="auth-screen"><section className="auth-card">
      <div className="auth-mark" aria-hidden="true">M</div>
      <span className="auth-eyebrow">MARIAN CONTENT STUDIO</span>
      <h1>Sign in to your workspace</h1>
      <p>Use an account created by your Studio administrator.</p>
      <form className="auth-form" onSubmit={handleSignIn}>
        <label htmlFor="studio-username">Username</label>
        <input id="studio-username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} />
        <label htmlFor="studio-password">Password</label>
        <input id="studio-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        {message && <p className="auth-error" role="alert">{message}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </section></main>;
  }

  return <>
    {user && <div className="session-bar"><span>Signed in as <strong>{user.username}</strong> · {user.role.replace(/_/g, ' ')}</span><button type="button" onClick={() => void handleSignOut()}>Sign out</button></div>}
    {children}
  </>;
}
