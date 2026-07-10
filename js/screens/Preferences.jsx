/* ─── Préférences : compte, sécurité, abonnement Pro, apparence ───
   Page de réglages classique (dans le shell de l'app). Non-cassant : tout passe
   par window.DXCloud (Supabase) ; en mode invité, on invite à se connecter. */

// Champ mot de passe avec œil (afficher/masquer) — même DA que l'écran Auth.
function PrefPwField({ value, onChange, placeholder, style }) {
  const [show, setShow] = React.useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input style={{ ...style, paddingRight: 44 }} type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete="new-password" />
      <button type="button" onClick={() => setShow(s => !s)} title={window.t ? window.t(show ? 'Masquer' : 'Afficher') : (show ? 'Masquer' : 'Afficher')}
        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', padding: 6, cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {show
            ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
            : <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></>}
        </svg>
      </button>
    </div>
  );
}

// Carte de section réutilisable.
function PrefSection({ title, desc, children, right }) {
  return (
    <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{title}</div>
          {desc && <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 3 }}>{desc}</div>}
        </div>
        {right}
      </div>
      <div style={{ padding: '18px 20px' }}>{children}</div>
    </section>
  );
}

function Preferences({ user, onNav, onAuth, addToast, mode }) {
  const DS = window.DispersionXDesignSystem_cb86be;
  const { Button, Badge } = DS;
  const t = window.t || ((s) => s);
  const C = window.DXCloud;
  const configured = !!(C && C.configured);

  const [name, setName] = React.useState(user ? user.name : '');
  const [savingName, setSavingName] = React.useState(false);
  const [newPw, setNewPw] = React.useState('');
  const [savingPw, setSavingPw] = React.useState(false);
  const [busyPro, setBusyPro] = React.useState(false);
  const [noStats, setNoStats] = React.useState(() => !!(window.DXAnalytics && window.DXAnalytics.isOptedOut && window.DXAnalytics.isOptedOut()));
  const [email, setEmail] = React.useState(user ? user.email : '');
  const [savingEmail, setSavingEmail] = React.useState(false);
  const [busyDelete, setBusyDelete] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [busyExport, setBusyExport] = React.useState(false);

  React.useEffect(() => { setName(user ? user.name : ''); setEmail(user ? user.email : ''); }, [user && user.name, user && user.email]);

  const input = {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '10px 13px', color: 'var(--text)',
    font: 'var(--type-body-sm)', outline: 'none',
  };
  const label = { font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6, display: 'block' };

  // ── Mode invité : pas de compte ──
  if (!user) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ font: 'var(--type-h1)', color: 'var(--text)', margin: 0 }}>{t('Préférences')}</h1>
        <PrefSection title={t('Connectez-vous')} desc={t('Créez un compte (gratuit) pour sauvegarder vos réglages, vos listes et gérer votre abonnement.')}>
          <Button variant="primary" size="lg" onClick={() => onNav('login')}>{t('Se connecter / créer un compte')}</Button>
        </PrefSection>
      </div>
    );
  }

  const isPro = !!(C && C.pro);
  const subscribed = !!(C && C.proSubscribed);
  const periodEnd = C && C.proPeriodEnd;
  const canceling = C && (C.proStatus === 'canceling' || C.proStatus === 'canceled');
  const periodTxt = periodEnd ? new Date(periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  async function saveName() {
    const nm = name.trim();
    if (!nm) { addToast && addToast('Le pseudo ne peut pas être vide.', 'error'); return; }
    if (nm === user.name) return;
    setSavingName(true);
    try {
      if (configured && C.auth) { const u = await C.auth.updateProfile(nm); onAuth && onAuth(u); }
      else { onAuth && onAuth({ ...user, name: nm }); }
      addToast && addToast('Pseudo mis à jour.', 'ok');
    } catch (e) { addToast && addToast('Échec : ' + (e && e.message ? e.message : ''), 'error'); }
    finally { setSavingName(false); }
  }
  async function savePw() {
    const pe = window.DXPasswordError ? window.DXPasswordError(newPw) : (newPw.length < 8 ? 'Le mot de passe doit faire au moins 8 caractères.' : null);
    if (pe) { addToast && addToast(pe, 'error'); return; }
    setSavingPw(true);
    try { await C.auth.updatePassword(newPw); setNewPw(''); addToast && addToast('Mot de passe mis à jour.', 'ok'); }
    catch (e) { addToast && addToast('Échec : ' + (e && e.message ? e.message : ''), 'error'); }
    finally { setSavingPw(false); }
  }
  async function saveEmail() {
    const em = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { addToast && addToast('Adresse e-mail invalide.', 'error'); return; }
    if (em.toLowerCase() === (user.email || '').toLowerCase()) return;
    setSavingEmail(true);
    try {
      await C.auth.updateEmail(em);
      addToast && addToast("E-mail de confirmation envoyé à la nouvelle adresse. Le changement sera effectif après avoir cliqué le lien.", 'ok');
    } catch (e) { addToast && addToast("Changement d'e-mail impossible : " + (e && e.message ? e.message : ''), 'error'); }
    finally { setSavingEmail(false); }
  }
  async function resendConf() {
    try { await C.auth.resendConfirmation(user.email); addToast && addToast('E-mail de confirmation renvoyé.', 'ok'); }
    catch (e) { addToast && addToast('Envoi impossible : ' + (e && e.message ? e.message : ''), 'error'); }
  }
  async function exportData() {
    setBusyExport(true);
    try {
      const data = await C.exportAccount();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dispersionx-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      addToast && addToast('Vos données ont été exportées (fichier JSON).', 'ok');
    } catch (e) { addToast && addToast('Export impossible : ' + (e && e.message ? e.message : ''), 'error'); }
    finally { setBusyExport(false); }
  }
  async function doDelete() {
    setBusyDelete(true);
    try {
      await C.auth.deleteAccount();
      addToast && addToast('Compte supprimé définitivement.', 'ok');
      onAuth && onAuth(null); onNav('landing');
    } catch (e) {
      addToast && addToast('Suppression impossible : ' + (e && e.message ? e.message : ''), 'error');
      setBusyDelete(false); setConfirmDel(false);
    }
  }
  async function goPro() {
    setBusyPro(true);
    try { await C.startProCheckout(); }
    catch (e) { addToast && addToast('Paiement indisponible : ' + (e && e.message ? e.message : ''), 'error'); setBusyPro(false); }
  }
  async function managePortal() {
    setBusyPro(true);
    try { await C.openProPortal(); }
    catch (e) {
      const m = e && e.message === 'aucun_abonnement' ? 'Aucun abonnement Stripe (accès accordé manuellement).' : 'Portail indisponible : ' + (e && e.message ? e.message : '');
      addToast && addToast(m, 'error'); setBusyPro(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>{t('Préférences')}</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: '6px 0 0' }}>{t('Compte, sécurité, abonnement et apparence.')}</p>
      </div>

      {/* ── Compte ── */}
      <PrefSection title={t('Compte')} desc={t("Votre pseudo est affiché dans l'app et sur les listes partagées.")}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 20px/1 var(--font-mono)', color: 'var(--accent-hover)' }}>
            {window.initialsOf ? window.initialsOf(user.name) : 'DX'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{t('Connecté en tant que')}</div>
            <div style={{ font: 'var(--type-body)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
          </div>
        </div>
        <label style={label}>{t('Pseudo')}</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input style={{ ...input, flex: 1, minWidth: 200 }} value={name} onChange={e => setName(e.target.value)} placeholder={t('Votre pseudo')} maxLength={40} />
          <Button variant="primary" size="md" onClick={saveName} disabled={savingName || name.trim() === user.name || !name.trim()}>
            {savingName ? t('Enregistrement…') : t('Enregistrer')}
          </Button>
        </div>
        <label style={{ ...label, marginTop: 16 }}>{t('E-mail')}</label>
        {configured ? (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input style={{ ...input, flex: 1, minWidth: 200 }} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" autoComplete="email" />
              <Button variant="outline" size="md" onClick={saveEmail} disabled={savingEmail || !email.trim() || email.trim().toLowerCase() === (user.email || '').toLowerCase()}>
                {savingEmail ? t('Envoi…') : t("Changer l'e-mail")}
              </Button>
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              {user.emailVerified
                ? <Badge tone="pos" size="sm">{t('E-mail vérifié')}</Badge>
                : (<>
                    <Badge tone="warn" size="sm">{t('Non vérifié')}</Badge>
                    <a onClick={resendConf} style={{ font: 'var(--type-caption)', color: 'var(--accent-hover)', cursor: 'pointer' }}>{t('Renvoyer le lien')}</a>
                  </>)}
            </div>
            <div style={{ marginTop: 6, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
              {t("Tout changement d'e-mail doit être confirmé via le lien envoyé à la nouvelle adresse.")}
            </div>
          </>
        ) : (
          <input style={{ ...input, color: 'var(--text-muted)', cursor: 'not-allowed' }} value={user.email} readOnly disabled />
        )}
      </PrefSection>

      {/* ── Sécurité ── */}
      {configured && (
        <PrefSection title={t('Sécurité')} desc={t('Définir ou changer votre mot de passe.')}>
          <label style={label}>{t('Nouveau mot de passe')}</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <PrefPwField style={input} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={t('Au moins 8 caractères')} />
            </div>
            <Button variant="outline" size="md" onClick={savePw} disabled={savingPw || newPw.length < 8}>
              {savingPw ? t('Mise à jour…') : t('Mettre à jour')}
            </Button>
          </div>
          <div style={{ marginTop: 8, font: 'var(--type-caption)', color: 'var(--text-muted)', lineHeight: 1.45 }}>
            {t(window.DXPasswordHint || 'Au moins 8 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial.')}
          </div>
          {window.MfaSection && <window.MfaSection addToast={addToast} />}
        </PrefSection>
      )}

      {/* ── Abonnement ── */}
      <PrefSection
        title={t('Abonnement')}
        desc={t("Le module Pro : auto-chercheur d'opportunités, risque & sizing inline, backtest historique.")}
        right={isPro
          ? <Badge tone={canceling ? 'warn' : 'pos'} size="sm">{canceling ? t('Se termine bientôt') : t('Pro actif')}</Badge>
          : <Badge tone="neutral" size="sm">{t('Gratuit')}</Badge>}
      >
        {isPro ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
              {subscribed
                ? (canceling
                    ? <>Votre abonnement est <strong style={{ color: 'var(--warn)' }}>résilié</strong>{periodTxt ? <> et restera actif jusqu'au <strong style={{ color: 'var(--text)' }}>{periodTxt}</strong></> : null}.</>
                    : <>Abonnement mensuel <strong style={{ color: 'var(--pos-bright)' }}>actif</strong>{periodTxt ? <> — prochain renouvellement le <strong style={{ color: 'var(--text)' }}>{periodTxt}</strong></> : null}.</>)
                : <>Accès Pro actif <span style={{ color: 'var(--text-muted)' }}>(accordé manuellement — pas d'abonnement Stripe).</span></>}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="primary" size="md" onClick={() => onNav('opportunities')}>{t('Ouvrir les Opportunités')}</Button>
              {subscribed && (
                <Button variant="outline" size="md" onClick={managePortal} disabled={busyPro}>
                  {busyPro ? t('Ouverture…') : t("Gérer l'abonnement")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7, font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>
              <li>{t('✓ Meilleurs paniers de dispersion par indice (5 à 20 actions)')}</li>
              <li>{t('✓ Sizing vega-neutre + 3 scénarios de stress, comme le Risk Lab')}</li>
              <li>{t('✓ Backtest historique de la prime de corrélation capturée')}</li>
            </ul>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="primary" size="lg" onClick={goPro} disabled={busyPro}>{busyPro ? t('Redirection…') : `${t('Passer Pro')} — ${(window.DX_PRO ? window.DX_PRO.price + ' ' + window.DX_PRO.currency : '2,99 €')}/${t('mois')}`}</Button>
              <button onClick={() => onNav('pricing')} style={{ font: '600 12px/1 var(--font-sans)', background: 'none', border: 'none', color: 'var(--accent-hover)', cursor: 'pointer', padding: 0 }}>{t('Voir les tarifs →')}</button>
            </div>
            <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Garantie {(window.DX_PRO ? window.DX_PRO.guaranteeDays : 14)} jours satisfait ou remboursé · paiement sécurisé Stripe · résiliable en 1 clic</span>
          </div>
        )}
      </PrefSection>

      {/* ── Langue ── */}
      <PrefSection title={t('Langue')} desc={t("Langue de l'interface.")}>
        {window.LangSegmented && <div style={{ marginBottom: 12 }}><window.LangSegmented /></div>}
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          {t('La langue est mémorisée sur cet appareil. Les données de marché et les calculs restent identiques.')}
        </div>
      </PrefSection>

      {/* ── Apparence ── */}
      <PrefSection title={t('Apparence')} desc={t('Thème clair ou sombre.')} right={window.ThemeToggle ? <window.ThemeToggle /> : null}>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
          {t("Le thème est mémorisé sur cet appareil. Le mode d'affichage (Débutant / Avancé) se règle en haut à droite de l'app.")}
        </div>
      </PrefSection>

      {/* ── Confidentialité / mesure d'audience ── */}
      <PrefSection title={t('Confidentialité')} desc={t("Mesure d'audience anonyme, sans cookie. Vous pouvez la refuser.")}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={!noStats}
            onChange={e => { const on = e.target.checked; setNoStats(!on); if (window.DXAnalytics) window.DXAnalytics.setOptOut(!on); addToast && addToast(on ? t("Mesure d'audience activée.") : t("Mesure d'audience désactivée (effet complet au prochain chargement)."), 'ok'); }}
            style={{ marginTop: 2, width: 15, height: 15, accentColor: 'var(--accent)', flexShrink: 0, cursor: 'pointer' }} />
          <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', lineHeight: 1.5 }}>
            {t("Autoriser la mesure d'audience anonyme (Vercel Web Analytics, sans cookie ni donnée personnelle).")}
          </span>
        </label>
        {configured && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 }}>{t('Mes données')}</div>
            <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              {t('Téléchargez une copie de toutes vos données (listes, stratégies, positions, journal, alertes) au format JSON — droit à la portabilité (art. 20 RGPD).')}
            </div>
            <Button variant="outline" size="md" onClick={exportData} disabled={busyExport}>
              {busyExport ? t('Préparation…') : t('Télécharger mes données')}
            </Button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 16, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
          <a onClick={() => onNav('privacy')} style={{ color: 'var(--text-soft)', cursor: 'pointer', borderBottom: '1px dotted var(--border-strong)' }}>{t('Confidentialité')}</a>
          <a onClick={() => onNav('legal')} style={{ color: 'var(--text-soft)', cursor: 'pointer', borderBottom: '1px dotted var(--border-strong)' }}>{t('Mentions légales')}</a>
          <a onClick={() => onNav('terms')} style={{ color: 'var(--text-soft)', cursor: 'pointer', borderBottom: '1px dotted var(--border-strong)' }}>{t('CGU')}</a>
          <a onClick={() => onNav('sales')} style={{ color: 'var(--text-soft)', cursor: 'pointer', borderBottom: '1px dotted var(--border-strong)' }}>{t('CGV')}</a>
        </div>
      </PrefSection>

      {/* ── Session ── */}
      <PrefSection title={t('Session')} desc={t('Se déconnecter de ce compte sur cet appareil.')}>
        <Button variant="danger" size="md" onClick={async () => {
          try { if (configured) await C.auth.signOut(); } catch {}
          onAuth && onAuth(null); onNav('landing');
        }}>{t('Se déconnecter')}</Button>
      </PrefSection>

      {/* ── Zone de danger : suppression définitive du compte (RGPD art. 17) ── */}
      {configured && (
        <PrefSection
          title={t('Supprimer mon compte')}
          desc={t('Suppression définitive et immédiate de votre compte et de toutes vos données.')}
          right={<Badge tone="neg" size="sm">{t('Irréversible')}</Badge>}
        >
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            {t('Vos listes, stratégies, positions et réglages seront effacés. Un abonnement Stripe actif est automatiquement annulé. Cette action ne peut pas être annulée.')}
          </div>
          <Button variant="danger" size="md" onClick={() => setConfirmDel(true)} disabled={busyDelete}>
            {t('Supprimer définitivement mon compte')}
          </Button>
        </PrefSection>
      )}

      {window.ConfirmDialog && (
        <window.ConfirmDialog
          open={confirmDel}
          title={t('Supprimer votre compte ?')}
          message={t('Cette action est définitive : toutes vos données seront effacées et tout abonnement en cours annulé. Elle ne peut pas être annulée.')}
          confirmLabel={t('Supprimer définitivement')}
          cancelLabel={t('Annuler')}
          tone="danger"
          onConfirm={doDelete}
          onCancel={() => { if (!busyDelete) setConfirmDel(false); }}
          busy={busyDelete}
        />
      )}
    </div>
  );
}

window.Preferences = Preferences;
