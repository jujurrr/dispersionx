/* ─── DispersionX App: router + global state ─────────────────────── */
const HASH_SCREENS = ['landing', 'home', 'lists', 'dashboard', 'corr', 'regime', 'vol', 'construction', 'risk', 'builder', 'monitor', 'docs', 'privacy', 'legal', 'terms', 'sales', 'pricing'];

// Détection mobile (largeur ≤ 768px), réactive au redimensionnement/rotation.
// Sert UNIQUEMENT à adapter la mise en page mobile ; sur PC, isMobile=false et
// tout reste identique. Exposé pour les écrans qui veulent aussi s'ajuster.
function useIsMobile() {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(max-width: 768px)').matches : false);
  const [m, setM] = React.useState(get);
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const on = () => setM(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, []);
  return m;
}
window.useIsMobile = useIsMobile;

function App() {
  const [screen, setScreen] = React.useState(() => {
    if (window.__dxRecovery) return 'login';   // retour d'un lien de réinitialisation de mot de passe
    const hash = window.location.hash.slice(1);
    return HASH_SCREENS.includes(hash) ? hash : 'landing';
  });
  const [params, setParams] = React.useState({});
  const [mode, setMode] = React.useState(() => localStorage.getItem('dx-mode') || 'Débutant');
  const [lists, setLists] = React.useState([]);
  const [scoreModal, setScoreModal] = React.useState(null);
  const [scoreCache, setScoreCache] = React.useState({});
  const [duration, setDuration] = React.useState(30);
  const [moduleCtx, setModuleCtx] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('dx-module-ctx') || '{}') || {}; } catch { return {}; }
  });
  React.useEffect(() => { localStorage.setItem('dx-module-ctx', JSON.stringify(moduleCtx)); }, [moduleCtx]);
  const onModuleCtx = (upd) => setModuleCtx(prev => ({ ...prev, ...upd }));
  const [splash, setSplash] = React.useState(null);
  const [user, setUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('dx-user') || 'null'); } catch { return null; }
  });
  const [toasts, addToast] = window.useToasts();
  // Langue courante (fr/en/zh). Ce hook re-render TOUT l'arbre au changement
  // de langue → les appels window.t() des écrans reflètent la nouvelle langue.
  const lang = window.useLang ? window.useLang() : 'fr';
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [pro, setPro] = React.useState(() => !!(window.DXCloud && window.DXCloud.pro));
  React.useEffect(() => {
    const onPro = (e) => setPro(!!e.detail);
    window.addEventListener('dx-pro-change', onPro);
    return () => window.removeEventListener('dx-pro-change', onPro);
  }, []);
  // Défi 2FA (AAL2) en attente : factorId ou null. Init depuis DXCloud.pendingMfa
  // pour couvrir la course : cloud.js peut émettre dx-mfa-required AVANT le montage
  // de React (notamment au rechargement d'une session restée en AAL1).
  const [mfaChallenge, setMfaChallenge] = React.useState(
    () => (window.DXCloud && window.DXCloud.pendingMfa && window.DXCloud.pendingMfa.factorId) || null
  );
  React.useEffect(() => {
    const onReq = (e) => setMfaChallenge((e.detail && e.detail.factorId) || null);
    const onAuthNull = (e) => { if (!e.detail) setMfaChallenge(null); };   // déconnexion → ferme la porte
    window.addEventListener('dx-mfa-required', onReq);
    window.addEventListener('dx-auth-change', onAuthNull);
    return () => { window.removeEventListener('dx-mfa-required', onReq); window.removeEventListener('dx-auth-change', onAuthNull); };
  }, []);
  // Referme le tiroir mobile à chaque navigation.
  React.useEffect(() => { setDrawerOpen(false); }, [screen, params]);

  // Progression GLOBALE du chargement des données (tous les indices).
  // Alimentée par DXStore, qui précharge l'ensemble du site au démarrage.
  const [dataProgress, setDataProgress] = React.useState(
    () => (window.DXStore ? window.DXStore.getProgress() : { queued: 0, done: 0 })
  );
  const [barVisible, setBarVisible] = React.useState(false);

  React.useEffect(() => {
    // Throttle : le store émet des centaines d'events pendant le préchargement.
    // On coalesce à un seul setState par frame (≤ 60/s) pour éviter une tempête
    // de re-renders (qui faisait « clignoter » la page de présentation).
    let raf = null, pending = null;
    const onProg = (e) => {
      pending = e.detail;
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; if (pending) setDataProgress(pending); });
    };
    window.addEventListener('dx-data-progress', onProg);
    // Précharge tout le site (indices, composants, cours, scores) une seule fois.
    if (window.DXStore) window.DXStore.preloadAll(duration);
    return () => { window.removeEventListener('dx-data-progress', onProg); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Affiche la barre fine du haut pendant le chargement, puis la masque
  // peu après l'achèvement (évite une barre verte permanente).
  React.useEffect(() => {
    if (dataProgress.queued > 0 && dataProgress.done < dataProgress.queued) {
      setBarVisible(true);
    } else if (dataProgress.queued > 0 && dataProgress.done >= dataProgress.queued) {
      const t = setTimeout(() => setBarVisible(false), 900);
      return () => clearTimeout(t);
    }
  }, [dataProgress]);

  // Élément Landing mémoïsé : la page de présentation est statique et ne doit
  // pas re-render quand l'App se met à jour (progression, listes…). On garde la
  // MÊME référence d'élément → React saute son rendu. Le préchargement des
  // données continue en parallèle (déclenché dans l'effet ci-dessus).
  const landingEl = React.useMemo(() => (window.Landing ? <window.Landing /> : null), [lang]);

  function handleAuth(u) {
    setUser(u);
    if (u) localStorage.setItem('dx-user', JSON.stringify(u));
    else localStorage.removeItem('dx-user');
  }

  // Load lists on mount
  React.useEffect(() => {
    DXApi.getLists().then(data => setLists(data || [])).catch(() => {});
  }, []);

  // Session Supabase (window.DXCloud) → état `user`. Se connecter/déconnecter
  // ou migrer les listes recharge la liste des listes (source = cloud ou local).
  React.useEffect(() => {
    const reload = () => DXApi.getLists().then(d => setLists(d || [])).catch(() => {});
    const onAuthChange = (e) => { handleAuth(e.detail); reload(); if (e.detail) tryRedeemJoinRef.current(); };
    const onRecovery = () => onNav('login');   // lien « mot de passe oublié » → formulaire nouveau mot de passe
    window.addEventListener('dx-auth-change', onAuthChange);
    window.addEventListener('dx-lists-changed', reload);
    window.addEventListener('dx-password-recovery', onRecovery);
    return () => { window.removeEventListener('dx-auth-change', onAuthChange); window.removeEventListener('dx-lists-changed', reload); window.removeEventListener('dx-password-recovery', onRecovery); };
  }, []);

  // Persist mode
  React.useEffect(() => {
    localStorage.setItem('dx-mode', mode);
  }, [mode]);

  // Écran d'où l'on vient avant d'ouvrir la connexion → la flèche « retour »
  // de la page de connexion y ramène (au lieu de toujours la présentation).
  const loginReturnRef = React.useRef('home');
  function onNav(s, p = {}) {
    if (s === 'login' && screen !== 'login') loginReturnRef.current = screen;
    setScreen(s);
    setParams(p);
    if (HASH_SCREENS.includes(s)) window.location.hash = s;
    window.scrollTo && window.scrollTo(0, 0);
  }

  // Expose navigation so the marketing Landing page CTAs (in _ds_bundle.js) can route into the app
  window.__dxNav = onNav;

  // Partage par lien : une URL #join=<token> réclame le partage (après connexion
  // si besoin) et ajoute la liste à « Partagées avec moi ».
  const pendingJoinRef = React.useRef(null);
  const tryRedeemJoinRef = React.useRef(() => {});
  tryRedeemJoinRef.current = async () => {
    const m = (window.location.hash || '').match(/join=([0-9a-fA-F-]{36})/);
    const token = pendingJoinRef.current || (m ? m[1] : null);
    if (!token) return;
    pendingJoinRef.current = token;
    if (!(window.DXCloud && window.DXCloud.enabled)) { onNav('login'); return; }   // se connecter d'abord
    // Rejoindre une liste partagée est réservé à Pro (destinataire) — sinon
    // n'importe qui pourrait accéder au contenu Pro via un lien.
    if (!(window.DXCloud && window.DXCloud.pro)) {
      pendingJoinRef.current = null;
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch {}
      addToast && addToast('Rejoindre une liste partagée nécessite l\'offre Pro.', 'info');
      onNav('pricing');
      return;
    }
    try {
      const listId = await DXApi.redeemShareLink(token);
      pendingJoinRef.current = null;
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch {}
      window.dispatchEvent(new CustomEvent('dx-lists-changed'));
      addToast && addToast('Liste ajoutée à « Partagées avec moi ».', 'ok');
      if (listId) onNav('list-detail', { listId });
    } catch (e) {
      pendingJoinRef.current = null;
      const msg = (e && (e.code === 'pro_required' || /pro_required/.test(e.message || ''))) ? 'Rejoindre une liste partagée nécessite l\'offre Pro.' : 'Lien de partage invalide ou expiré.';
      addToast && addToast(msg, e && e.code === 'pro_required' ? 'info' : 'error');
    }
  };
  React.useEffect(() => { tryRedeemJoinRef.current(); }, []);

  // Retour du paiement Stripe (?pro=success|cancel). Le webhook accorde le Pro
  // côté serveur avec un léger décalage → on rafraîchit quelques fois, puis on
  // nettoie l'URL. C'est toujours le serveur qui décide de l'accès, pas ceci.
  React.useEffect(() => {
    let sp; try { sp = new URLSearchParams(window.location.search); } catch { return; }
    const p = sp.get('pro');
    if (!p) return;
    const sessionId = sp.get('session_id');   // lu AVANT le nettoyage d'URL
    const clean = () => { try { sp.delete('pro'); sp.delete('session_id'); const q = sp.toString(); history.replaceState(null, '', window.location.pathname + (q ? '?' + q : '') + window.location.hash); } catch {} };
    clean();
    if (p === 'cancel') { addToast && addToast('Paiement annulé — vous pouvez réessayer à tout moment.', 'info'); return; }
    if (p === 'managed') {   // retour du portail de facturation : l'accès a pu changer
      if (window.DXCloud && window.DXCloud.refreshPro) window.DXCloud.refreshPro().catch(() => {});
      addToast && addToast('Abonnement mis à jour.', 'ok');
      return;
    }
    if (p !== 'success' || !(window.DXCloud && window.DXCloud.refreshPro)) return;
    addToast && addToast('Merci ! Activation de votre accès Pro…', 'ok');
    (async () => {
      // 1) Confirmation SYNCHRONE via Stripe (indépendante du webhook) : accorde le
      //    Pro + dépose la notification « Pro activé ». C'est ce qui débloque le cas
      //    « paiement OK mais accès jamais accordé » quand le webhook n'est pas prêt.
      let confirmErr = null;
      if (sessionId && window.DXCloud.confirmPro) {
        try {
          const cr = await window.DXCloud.confirmPro(sessionId);
          if (cr && cr.pro) {
            try { window.dispatchEvent(new CustomEvent('dx-activity-poke')); } catch {}   // fait remonter la notif
          } else if (cr && cr.error) {
            confirmErr = cr.error;
            try { console.warn('[pro] confirmation échouée :', cr.error); } catch {}
          }
        } catch (e) { confirmErr = 'exception'; }
      }
      // 2) Rafraîchit l'accès (confirmation OU webhook a écrit pro_access), avec un
      //    petit poll de secours le temps que l'écriture soit visible.
      let n = 0, done = false;
      const tick = async () => {
        n++;
        let ok = false;
        try { ok = await window.DXCloud.refreshPro(); } catch {}
        if (ok) { done = true; addToast && addToast('Accès Pro activé ✦', 'ok'); onNav('opportunities'); return; }
        if (n < 6) setTimeout(tick, 2500);
        else if (!done) {
          // Échec réel : on montre le motif (diagnostic) plutôt qu'un message vague.
          const msg = confirmErr
            ? ('Paiement reçu, mais l\'activation a échoué (' + confirmErr + '). Réessayez ou contactez le support.')
            : 'Paiement reçu — votre accès Pro s\'activera dans un instant.';
          addToast && addToast(msg, confirmErr ? 'error' : 'info');
        }
      };
      tick();
    })();
  }, []);

  // Rafraîchissement des prix toutes les 15 s (tick global) — uniquement quand
  // l'onglet est visible, pour éviter des appels API inutiles en arrière-plan.
  // 15 s = compromis fraîcheur/limites d'API (prix d'indice ~temps réel Yahoo).
  React.useEffect(() => {
    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        window.dispatchEvent(new CustomEvent('dx-price-tick'));
      }
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // Re-vérifie l'accès Pro au retour sur l'onglet (throttlé ~10 min) : si
  // l'abonnement a expiré pendant une session restée ouverte, l'accès Pro est
  // révoqué sans attendre un rechargement de page. refreshPro → checkPro (qui
  // respecte current_period_end) → dx-pro-change.
  React.useEffect(() => {
    let last = 0;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - last < 600000) return;
      last = Date.now();
      if (window.DXCloud && window.DXCloud.refreshPro) window.DXCloud.refreshPro().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Navigate to a screen with the full-screen transition splash.
  function transitionTo(target, label, params) {
    setSplash(label);
    setTimeout(() => onNav(target, params || {}), 480);
    setTimeout(() => setSplash(null), 1150);
  }
  window.__dxGo = transitionTo;

  // Switch between the two parts of the site (presentation ⇆ creation) with a full-screen splash.
  function switchSection() {
    const goingToLanding = screen !== 'landing';
    transitionTo(goingToLanding ? 'landing' : 'home', goingToLanding ? 'Présentation' : 'Espace de création');
  }
  window.__dxSwitch = switchSection;

  function onScore(indexSymbol, stockTicker, duration) {
    setScoreModal({ indexSymbol, stockTicker, duration: duration || 30 });
  }

  function onAddedToList(listId) {
    DXApi.getLists().then(data => setLists(data || [])).catch(() => {});
  }

  const crumbMap = {
    home: ['Accueil'],
    'index-detail': ['Accueil', params.symbol || ''],
    lists: ['Mes listes'],
    'list-detail': ['Mes listes', '…'],
    dashboard: ['Dashboard'],
    corr: ['Correlation Lab'],
    vol: ['Volatility Lab'],
    construction: ['Construction'],
    risk: ['Risk Lab'],
    builder: ['Strategy Builder'],
    monitor: ['Strategy Monitor'],
    opportunities: ['Opportunités Pro'],
    'market-pro': ['Marché Pro'],
    positions: ['Suivi des positions'],
    journal: ['Journal de trades'],
    preferences: ['Préférences'],
    notifications: ['Notifications'],
    checklist: ['Risk Lab', 'Checklist'],
    'monitor-list': ['Suivi des positions'],
    position: ['Suivi des positions', 'Position'],
    docs: ['Formules & Référence'],
    privacy: ['Confidentialité'],
    pricing: ['Tarifs'],
  };
  const crumbs = crumbMap[screen] || ['DispersionX'];
  // Écran vers lequel pointe le PREMIER crumb (lien de retour) — contextuel, pas
  // toujours « home ». Ex. depuis une position, « Suivi des positions » → positions.
  const crumbParent = {
    'index-detail': 'home', 'list-detail': 'lists', checklist: 'risk',
    position: 'positions', 'monitor-list': 'positions',
  };
  const crumbHome = crumbParent[screen] || 'home';

  let screenEl;
  switch (screen) {
    case 'home':
      screenEl = <window.Home onNav={onNav} lists={lists} mode={mode} />;
      break;
    case 'index-detail':
      screenEl = <window.IndexDetail symbol={params.symbol} onNav={onNav} onScore={onScore} duration={duration} onDuration={setDuration} mode={mode} scoreCache={scoreCache} />;
      break;
    case 'lists':
      screenEl = <window.Lists onNav={onNav} onListsChange={setLists} addToast={addToast} />;
      break;
    case 'list-detail':
      screenEl = <window.ListDetail listId={params.listId} onNav={onNav} onScore={onScore} addToast={addToast} mode={mode} scoreCache={scoreCache} />;
      break;
    case 'dashboard':
      screenEl = <window.Dashboard onNav={onNav} lists={lists} mode={mode} moduleCtx={moduleCtx} onModuleCtx={onModuleCtx} />;
      break;
    case 'corr':
      screenEl = <window.CorrelationLab listId={params.listId} onNav={onNav} mode={mode} lists={lists} moduleCtx={moduleCtx} onModuleCtx={onModuleCtx} />;
      break;
    case 'regime':
      screenEl = <window.CorrelationLab view="regime" listId={params.listId} onNav={onNav} mode={mode} lists={lists} moduleCtx={moduleCtx} onModuleCtx={onModuleCtx} />;
      break;
    case 'vol':
      screenEl = <window.VolatilityLab mode={mode} lists={lists} moduleCtx={moduleCtx} onModuleCtx={onModuleCtx} onNav={onNav} />;
      break;
    case 'construction':
      screenEl = <window.Construction listId={params.listId} onNav={onNav} mode={mode} lists={lists} moduleCtx={moduleCtx} onModuleCtx={onModuleCtx} addToast={addToast} durationOverride={params.duration} sizingOverride={params.sizing} />;
      break;
    case 'risk':
      screenEl = <window.RiskLab listId={params.listId} onNav={onNav} mode={mode} lists={lists} moduleCtx={moduleCtx} onModuleCtx={onModuleCtx} pro={pro} />;
      break;
    case 'builder':
      screenEl = <window.Builder listId={params.listId} onNav={onNav} onScore={onScore} mode={mode} lists={lists} moduleCtx={moduleCtx} onModuleCtx={onModuleCtx} pro={pro} />;
      break;
    case 'monitor':
      screenEl = <window.StrategyMonitor mode={mode} lists={lists} onNav={onNav} addToast={addToast} listId={params.listId} />;
      break;
    case 'opportunities':
      screenEl = <window.OpportunityFinder onNav={onNav} lists={lists} addToast={addToast} pro={pro} mode={mode} />;
      break;
    case 'market-pro':
      screenEl = <window.MarketPro onNav={onNav} addToast={addToast} pro={pro} lists={lists} />;
      break;
    case 'journal':
      screenEl = <window.Journal onNav={onNav} addToast={addToast} pro={pro} lists={lists} prefill={params.prefill} />;
      break;
    case 'positions':
    case 'monitor-list':   // ancien chemin par liste → même hub global de suivi (Pro)
      screenEl = <window.MonitorList onNav={onNav} addToast={addToast} pro={pro} lists={lists} mode={mode} />;
      break;
    case 'preferences':
      screenEl = <window.Preferences user={user} onNav={onNav} onAuth={handleAuth} addToast={addToast} mode={mode} />;
      break;
    case 'notifications':
      screenEl = <window.NotificationsPage onNav={onNav} lists={lists} addToast={addToast} />;
      break;
    case 'checklist':
      screenEl = <window.Checklist listId={params.listId} onNav={onNav} addToast={addToast} mode={mode} pro={pro} />;
      break;
    case 'position':
      screenEl = <window.PositionDetail positionId={params.positionId} onNav={onNav} addToast={addToast} mode={mode} />;
      break;
    case 'docs':
      screenEl = <window.Docs mode={mode} />;
      break;
    case 'privacy':
      screenEl = <window.Privacy onNav={onNav} />;
      break;
    case 'legal':
      screenEl = <window.Legal onNav={onNav} />;
      break;
    case 'terms':
      screenEl = <window.Terms onNav={onNav} />;
      break;
    case 'sales':
      screenEl = <window.Sales onNav={onNav} />;
      break;
    case 'pricing':
      screenEl = <window.ProPricing onNav={onNav} addToast={addToast} />;
      break;
    default:
      screenEl = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ opacity: 0.5, marginBottom: 16 }}><window.Logo size={42} wordmark={false} /></div>
          <div style={{ font: 'var(--type-h3)', color: 'var(--text-soft)' }}>{crumbs[crumbs.length - 1]}</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 320, marginTop: 6 }}>
            Module de la plateforme — mêmes composants, mêmes conventions de lecture.
          </div>
        </div>
      );
  }

  const splashEl = splash ? <SectionSplash label={splash} /> : null;
  // Porte MFA globale : superposée à N'IMPORTE QUEL écran tant qu'un défi 2FA est
  // en attente (bloque l'accès aux données à AAL1 — voir src/cloud.js).
  const mfaEl = mfaChallenge ? <MfaGate factorId={mfaChallenge} onDone={() => setMfaChallenge(null)} addToast={addToast} /> : null;

  // Login / profile — standalone full-screen page (no app shell)
  if (screen === 'login') {
    return (
      <React.Fragment>
        <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-base)' }}>
          {window.Auth ? <window.Auth onNav={onNav} user={user} onAuth={handleAuth} loginReturn={loginReturnRef.current} /> : null}
        </div>
        {mfaEl}
        {splashEl}
      </React.Fragment>
    );
  }

  // Landing / presentation page — full screen, no app shell (it has its own Nav)
  if (screen === 'landing') {
    return (
      <React.Fragment>
        <div style={{ height: '100vh', overflowY: 'auto', background: 'var(--bg-base)' }}>
          {landingEl}
        </div>
        {mfaEl}
        {splashEl}
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'var(--sidebar-w, 220px) 1fr', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop : sidebar dans la grille. Mobile : rendue en tiroir plus bas. */}
      {!isMobile && <window.Sidebar active={screen} onNav={onNav} lists={lists} user={user} pro={pro} />}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
        <window.Topbar crumbs={crumbs} crumbHome={crumbHome} mode={mode} onMode={setMode} onNav={onNav} user={user} dataProgress={dataProgress} isMobile={isMobile} onMenu={() => setDrawerOpen(true)} />
        <main style={{
          flex: 1, overflowY: 'auto', padding: isMobile ? '14px 12px 56px' : '24px 28px 64px',
          backgroundImage: 'radial-gradient(ellipse 70% 50% at 80% -5%, var(--accent-soft), transparent 60%), radial-gradient(ellipse 50% 40% at 0% 10%, var(--pos-soft), transparent 55%)',
        }}>
          {screenEl}
        </main>
      </div>

      {/* Tiroir latéral (mobile) : voile + panneau glissant */}
      {isMobile && (
        <React.Fragment>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? 'auto' : 'none', transition: 'opacity var(--dur-fast) var(--ease)' }} />
          <div style={{ position: 'fixed', top: 0, bottom: 0, left: 0, width: '82%', maxWidth: 300, zIndex: 1001, transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform var(--dur, 0.25s) var(--ease)', boxShadow: drawerOpen ? 'var(--shadow-lg)' : 'none' }}>
            <window.Sidebar active={screen} onNav={(s, p) => { onNav(s, p); setDrawerOpen(false); }} lists={lists} user={user} pro={pro} isMobile />
          </div>
        </React.Fragment>
      )}

      {/* Score Modal overlay */}
      {scoreModal && (
        <window.ScoreModal
          indexSymbol={scoreModal.indexSymbol}
          stockTicker={scoreModal.stockTicker}
          duration={scoreModal.duration}
          lists={lists}
          onClose={() => setScoreModal(null)}
          onAddedToList={onAddedToList}
          addToast={addToast}
          mode={mode}
          onScoreLoaded={(ticker, score) => score != null && setScoreCache(prev => ({ ...prev, [ticker]: score }))}
        />
      )}

      {/* Toast notifications */}
      <window.Toast toasts={toasts} remove={() => {}} />
    </div>
    {/* Barre de progression fine en haut (2px, au-dessus de tout) —
        reflète le chargement GLOBAL du site (tous les indices). */}
    {barVisible && dataProgress.queued > 0 && (() => {
      const pct = Math.min(100, Math.round(dataProgress.done / dataProgress.queued * 100));
      return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000, height: 2, pointerEvents: 'none', background: 'var(--bg-elevated)' }}>
          <div style={{
            height: '100%', width: pct + '%',
            background: pct >= 100 ? 'var(--pos)' : 'var(--accent)',
            boxShadow: pct < 100 ? '0 0 7px var(--accent)' : 'none',
            transition: 'width 0.4s ease, background 0.6s ease, box-shadow 0.6s ease',
            borderRadius: '0 1px 1px 0',
          }} />
        </div>
      );
    })()}
    {mfaEl}
    {splashEl}
    </React.Fragment>
  );
}

/* ─── Full-screen transition splash between the two parts of the site ─── */
function SectionSplash({ label }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26,
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 30%, var(--accent-soft), transparent 65%)',
      animation: 'dxSplashWrap 1150ms ease both',
    }}>
      <div style={{ opacity: 0.55 }}><window.Logo size={44} wordmark={false} /></div>
      <div style={{
        font: '800 clamp(30px, 6vw, 58px)/1 var(--font-sans)',
        color: 'var(--text)', textAlign: 'center', padding: '0 20px',
        animation: 'dxSplashTitle 620ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
      }}>{label}</div>
      <div style={{ width: 160, height: 3, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--accent)', transformOrigin: 'left', animation: 'dxSplashBar 1000ms ease both' }} />
      </div>
    </div>
  );
}

/* ─── Porte MFA globale : défi 2FA (AAL2) quel que soit le mode de connexion ───
   Déclenchée par l'événement dx-mfa-required (émis par src/cloud.js dès qu'une
   session AAL1 possède un facteur TOTP vérifié). Superposée à tout l'écran tant
   que le code n'est pas validé — couvre mot de passe, OAuth (Google/Discord) ET
   rechargement de page (là où l'ancien flux, limité au formulaire de connexion,
   laissait la session bloquée en AAL1 → données masquées par la RLS §19). */
function MfaGate({ factorId, onDone, addToast }) {
  const DS = window.DispersionXDesignSystem_cb86be;
  const Button = DS.Button;
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  async function verify(e) {
    e.preventDefault();
    if (code.length < 6) { setErr('Entrez le code à 6 chiffres.'); return; }
    setBusy(true); setErr('');
    try {
      await window.DXCloud.auth.mfa.verify(factorId, code);
      onDone();   // AAL2 atteint → cloud.js relance la synchro via onSignedIn
    } catch { setErr('Code invalide ou expiré.'); setBusy(false); }
  }
  async function logout() {
    try { await window.DXCloud.auth.signOut(); } catch {}   // pas de session AAL1 qui traîne
    addToast && addToast('Déconnecté.', 'info');
    onDone();
  }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10002, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, boxShadow: 'var(--shadow-lg)' }}>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Vérification en deux étapes</h1>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '0 0 24px' }}>Entrez le code à 6 chiffres de votre application d'authentification pour accéder à vos données.</p>
        <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus
            style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 14px', color: 'var(--text)', font: '600 20px/1 var(--font-mono)', letterSpacing: '0.4em', textAlign: 'center', outline: 'none' }} />
          {err && (<div style={{ font: 'var(--type-body-sm)', color: 'var(--neg-bright)', background: 'var(--neg-soft)', border: '1px solid var(--neg)', borderRadius: 'var(--radius)', padding: '9px 12px' }}>{err}</div>)}
          <Button variant="primary" size="lg" full type="submit" disabled={busy || code.length < 6}>{busy ? 'Vérification…' : 'Vérifier'}</Button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <a onClick={logout} style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', cursor: 'pointer' }}>Se déconnecter</a>
        </div>
      </div>
    </div>
  );
}

// Idempotent mount
(function mountApp() {
  const el = document.getElementById('root');
  if (!window.__dxAppRoot) window.__dxAppRoot = ReactDOM.createRoot(el);
  window.__dxAppRoot.render(<App />);
})();
