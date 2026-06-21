/* ─── Auth : connexion / création de compte / profil (UI, sans backend) ─── */
function initialsOf(name) {
  if (!name) return 'DX';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : (parts[0][1] || ''))).toUpperCase();
}

function Auth({ onNav, user, onAuth }) {
  const DS = window.DispersionXDesignSystem_cb86be;
  const { Button } = DS;
  const [mode, setMode] = React.useState('login'); // 'login' | 'signup'
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const inputStyle = {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '11px 14px', color: 'var(--text)',
    font: 'var(--type-body-sm)', outline: 'none',
  };
  const labelStyle = { font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' };

  function submit(e) {
    e.preventDefault();
    setError('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('Adresse e-mail invalide.');
    if (pw.length < 6) return setError('Le mot de passe doit faire au moins 6 caractères.');
    if (mode === 'signup') {
      if (!name.trim()) return setError('Indiquez votre nom.');
      if (pw !== pw2) return setError('Les mots de passe ne correspondent pas.');
    }
    setBusy(true);
    setTimeout(() => {
      const u = { email, name: name.trim() || email.split('@')[0] };
      onAuth && onAuth(u);
      setBusy(false);
      onNav('home');
    }, 650);
  }

  function demo() {
    onAuth && onAuth({ email: 'demo@dispersionx.app', name: 'Invité Démo' });
    onNav('home');
  }

  // ── Top bar (logo + retour + thème) ──
  const TopBar = (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
      <span onClick={() => window.location.reload()} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <window.Logo size={28} wordmark={false} />
        <span style={{ font: '800 15px/1 var(--font-sans)', color: 'var(--text)' }}>Dispersion<span style={{ color: 'var(--accent-hover)' }}>X</span></span>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <a onClick={() => onNav('landing')} style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', cursor: 'pointer' }}>← Présentation</a>
        {window.ThemeToggle ? <window.ThemeToggle /> : null}
      </div>
    </div>
  );

  const shell = (children) => (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '90px 20px 40px',
      backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% -5%, var(--accent-soft), transparent 60%), radial-gradient(ellipse 50% 40% at 0% 20%, var(--pos-soft), transparent 55%)' }}>
      {TopBar}
      {children}
    </div>
  );

  // ════════════ Vue profil (déjà connecté) ════════════
  if (user) {
    return shell(
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 18px', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 26px/1 var(--font-mono)', color: 'var(--accent-hover)' }}>
          {initialsOf(user.name)}
        </div>
        <div style={{ font: 'var(--type-h2)', color: 'var(--text)', marginBottom: 4 }}>{user.name}</div>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginBottom: 26 }}>{user.email}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="primary" size="lg" full onClick={() => onNav('home')}>Aller à l'application</Button>
          <Button variant="outline" size="md" full onClick={() => { onAuth && onAuth(null); onNav('landing'); }}>Se déconnecter</Button>
        </div>
      </div>
    );
  }

  // ════════════ Vue connexion / inscription ════════════
  return shell(
    <div style={{ width: '100%', maxWidth: 420, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-lg)' }}>
      <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>
        {mode === 'login' ? 'Connexion' : 'Créer un compte'}
      </h1>
      <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '0 0 24px' }}>
        {mode === 'login' ? 'Accédez à vos listes et stratégies sauvegardées.' : 'Quelques secondes pour démarrer votre première dispersion.'}
      </p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {mode === 'signup' && (
          <div>
            <label style={labelStyle}>Nom</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont" autoComplete="name" />
          </div>
        )}
        <div>
          <label style={labelStyle}>E-mail</label>
          <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" />
        </div>
        <div>
          <label style={labelStyle}>Mot de passe</label>
          <input style={inputStyle} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </div>
        {mode === 'signup' && (
          <div>
            <label style={labelStyle}>Confirmer le mot de passe</label>
            <input style={inputStyle} type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </div>
        )}

        {mode === 'login' && (
          <div style={{ textAlign: 'right', marginTop: -6 }}>
            <a onClick={() => setError('Fonction de récupération à venir — utilisez le mode démo en attendant.')} style={{ font: 'var(--type-caption)', color: 'var(--accent-hover)', cursor: 'pointer' }}>Mot de passe oublié ?</a>
          </div>
        )}

        {error && (
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--neg-bright)', background: 'var(--neg-soft)', border: '1px solid var(--neg)', borderRadius: 'var(--radius)', padding: '9px 12px' }}>
            {error}
          </div>
        )}

        <Button variant="primary" size="lg" full type="submit" disabled={busy}>
          {busy ? 'Connexion…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </Button>
      </form>

      {/* Séparateur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>ou</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <Button variant="outline" size="md" full onClick={demo}>Continuer en mode démo</Button>

      <div style={{ textAlign: 'center', marginTop: 22, font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
        {mode === 'login' ? "Pas encore de compte ? " : 'Déjà inscrit ? '}
        <a onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }} style={{ color: 'var(--accent-hover)', cursor: 'pointer', fontWeight: 600 }}>
          {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
        </a>
      </div>
    </div>
  );
}

window.Auth = Auth;
window.initialsOf = initialsOf;
