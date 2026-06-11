import React from 'react';
import { supabase } from './supabaseClient.js';

const AuthCtx = React.createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = React.useState(undefined); // undefined = still loading

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthCtx.Provider value={{ session, user: session ? session.user : null }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() { return React.useContext(AuthCtx); }

export async function signOut() { await supabase.auth.signOut(); }

export function Splash() {
  return (
    <div className="mf-loading">
      <div className="mf-loading-mark">MF</div>
    </div>
  );
}

export function LoginScreen() {
  const [mode, setMode] = React.useState('login'); // 'login' | 'signup'
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [info, setInfo] = React.useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    try {
      const id = email.trim();
      // Shared accounts with the GymApp: it signs people up with a username
      // that maps to a synthetic <username>@gymapp.local mail. Accept both
      // here so the same account works in both apps.
      const isEmail = id.includes('@');
      if (!isEmail && !/^[a-zA-Z0-9_.]{3,30}$/.test(id)) {
        setError('Benutzername: 3–30 Zeichen, nur Buchstaben, Zahlen, Punkt, Unterstrich.');
        return;
      }
      const creds = { email: isEmail ? id.toLowerCase() : `${id.toLowerCase()}@gymapp.local`, password };
      const { error } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword(creds)
          : await supabase.auth.signUp(creds);
      if (error) {
        setError(translateError(error.message));
      } else if (mode === 'signup') {
        // Signups are auto-confirmed (DB trigger), so log straight in instead
        // of bouncing the user back to the login form.
        const signin = await supabase.auth.signInWithPassword(creds);
        if (signin.error) {
          setInfo('Konto erstellt. Du kannst dich jetzt anmelden.');
          setMode('login');
        }
      }
      // on success, onAuthStateChange flips the app to the main UI
    } catch (err) {
      setError(translateError(err.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mf-auth">
      <div className="mf-auth-inner">
        <div className="mf-auth-mark">MF</div>
        <h1 className="mf-title mf-auth-title">MacroFactor</h1>
        <p className="mf-auth-lede">
          {mode === 'login' ? 'Melde dich an, um deine Daten zu sehen.' : 'Erstelle ein Konto, um loszulegen.'}
        </p>

        <form className="mf-auth-form" onSubmit={submit}>
          <input
            className="mf-auth-input" type="text" inputMode="email" autoComplete="username"
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            placeholder="E-Mail oder Benutzername" value={email} onChange={e => setEmail(e.target.value)} required />
          <input
            className="mf-auth-input" type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="Passwort" value={password} onChange={e => setPassword(e.target.value)} required />

          {error && <div className="mf-auth-error">{error}</div>}
          {info && <div className="mf-auth-info">{info}</div>}

          <button className="mf-auth-btn" type="submit" disabled={busy}>
            {busy ? 'Bitte warten…' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>

        <button className="mf-auth-toggle" onClick={() => { setError(''); setInfo(''); setMode(mode === 'login' ? 'signup' : 'login'); }}>
          {mode === 'login' ? 'Noch kein Konto? Registrieren' : 'Schon ein Konto? Anmelden'}
        </button>
      </div>
    </div>
  );
}

function translateError(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Login oder Passwort falsch.';
  if (m.includes('email not confirmed')) return 'E-Mail noch nicht bestätigt.';
  if (m.includes('already registered') || m.includes('already exists')) return 'Dieses Konto existiert bereits.';
  if (m.includes('password') && m.includes('6')) return 'Passwort muss mindestens 6 Zeichen haben.';
  if (m.includes('network') || m.includes('fetch')) return 'Keine Verbindung. Bitte erneut versuchen.';
  return msg || 'Etwas ist schiefgelaufen.';
}
