import { useState } from 'react';

export default function AuthPage({ onSignIn, onSignUp, error }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('demo@pathstream.app');
  const [password, setPassword] = useState('password123');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (mode === 'signin') {
        await onSignIn({ email, password });
      } else {
        await onSignUp({ email, password, username });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>PathStream MVP</h1>
        <p>Short discovery, long-form payoff.</p>

        <div className="auth-mode-row">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')} type="button">
            Sign in
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')} type="button">
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>

          {mode === 'signup' && (
            <label>
              Username
              <input value={username} onChange={(event) => setUsername(event.target.value)} required />
            </label>
          )}

          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
              minLength={8}
            />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="primary" disabled={submitting} type="submit">
            {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
}