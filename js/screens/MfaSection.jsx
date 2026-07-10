/* ─── MfaSection : double authentification (TOTP) dans les Préférences ────────
   Opt-in. S'affiche seulement si le cloud est configuré. Nécessite l'activation
   de la MFA côté projet Supabase (Authentication → MFA → TOTP) — sinon l'enrôlement
   renvoie une erreur claire. Utilise window.DXCloud.auth.mfa. */
function MfaSection({ addToast }) {
  const C = window.DXCloud;
  const DS = window.DispersionXDesignSystem_cb86be || {};
  const { Button, Badge } = DS;
  const [status, setStatus] = React.useState('loading');   // loading | off | on
  const [factors, setFactors] = React.useState([]);
  const [enroll, setEnroll] = React.useState(null);        // { factorId, qrSrc, secret }
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const mfa = C && C.auth && C.auth.mfa;

  const refresh = React.useCallback(async () => {
    if (!mfa) { setStatus('off'); return; }
    try {
      const data = await mfa.list();
      const totp = (data && data.totp) || [];
      setFactors(totp);
      setStatus(totp.find(f => f.status === 'verified') ? 'on' : 'off');
    } catch { setStatus('off'); }
  }, [mfa]);

  React.useEffect(() => { refresh(); }, [refresh]);

  async function startEnroll() {
    setBusy(true);
    try {
      const d = await mfa.enroll();
      const qr = (d && d.totp && d.totp.qr_code) || '';
      const qrSrc = qr.startsWith('data:') ? qr : 'data:image/svg+xml;utf-8,' + encodeURIComponent(qr);
      setEnroll({ factorId: d.id, qrSrc, secret: (d.totp && d.totp.secret) || '' });
      setCode('');
    } catch (e) {
      addToast && addToast("Activation impossible : " + ((e && e.message) || 'la MFA n\'est peut-être pas activée côté Supabase.'), 'error');
    } finally { setBusy(false); }
  }

  async function confirmEnroll() {
    setBusy(true);
    try {
      await mfa.verify(enroll.factorId, code);
      setEnroll(null); setCode('');
      addToast && addToast('Double authentification activée.', 'ok');
      await refresh();
    } catch (e) {
      addToast && addToast('Code invalide ou expiré' + (e && e.message ? ' : ' + e.message : '') + '.', 'error');
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      for (const f of factors) { try { await mfa.unenroll(f.id); } catch {} }
      addToast && addToast('Double authentification désactivée.', 'ok');
      await refresh();
    } catch (e) {
      addToast && addToast('Désactivation impossible' + (e && e.message ? ' : ' + e.message : '') + '.', 'error');
    } finally { setBusy(false); }
  }

  if (!(C && C.configured) || !mfa) return null;

  const label = { font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' };
  const input = { width: '100%', maxWidth: 220, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 13px', color: 'var(--text)', font: '600 16px/1 var(--font-mono)', letterSpacing: '0.3em', outline: 'none' };

  return (
    <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>Double authentification (2FA)</span>
        {status === 'on' && Badge && <Badge tone="pos" size="sm">Activée</Badge>}
        {status === 'off' && Badge && <Badge tone="neutral" size="sm">Désactivée</Badge>}
      </div>

      {/* En cours d'enrôlement : QR + code */}
      {enroll ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', lineHeight: 1.5, maxWidth: 620 }}>
            Scannez ce QR code avec une application d'authentification (Google Authenticator, Authy, 1Password…),
            puis saisissez le code à 6 chiffres pour confirmer.
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <img src={enroll.qrSrc} alt="QR code 2FA" width={168} height={168}
              style={{ background: '#fff', padding: 10, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enroll.secret && (
                <div>
                  <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>Clé manuelle (si vous ne pouvez pas scanner)</span>
                  <div style={{ font: '600 12px/1.4 var(--font-mono)', color: 'var(--text-soft)', wordBreak: 'break-all', maxWidth: 240 }}>{enroll.secret}</div>
                </div>
              )}
              <div>
                <label style={label}>Code à 6 chiffres</label>
                <input style={input} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric" autoComplete="one-time-code" placeholder="000000" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="primary" size="md" onClick={confirmEnroll} disabled={busy || code.length < 6}>{busy ? 'Vérification…' : 'Activer'}</Button>
                <Button variant="outline" size="md" onClick={() => { setEnroll(null); setCode(''); }} disabled={busy}>Annuler</Button>
              </div>
            </div>
          </div>
        </div>
      ) : status === 'on' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Un code de votre application d'authentification sera demandé à chaque connexion.
          </div>
          <div><Button variant="danger" size="md" onClick={disable} disabled={busy}>{busy ? 'Désactivation…' : 'Désactiver la 2FA'}</Button></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: 620 }}>
            Ajoutez une couche de sécurité : en plus du mot de passe, un code temporaire sera demandé à la connexion.
          </div>
          <div><Button variant="outline" size="md" onClick={startEnroll} disabled={busy || status === 'loading'}>{busy ? 'Préparation…' : 'Activer la double authentification'}</Button></div>
        </div>
      )}
    </div>
  );
}

window.MfaSection = MfaSection;
