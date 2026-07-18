/* ─── Barrière d'erreur ────────────────────────────────────────────────
   Sans elle, une simple erreur de rendu détruit TOUT l'arbre React : écran figé,
   navigation morte, rafraîchissement forcé — et au rechargement, tout le cache
   repart à froid. C'est exactement ce qui s'est produit quand la Synthèse du
   Builder levait un ReferenceError.

   Deux portées :
   · `scope="screen"` — enveloppe le contenu du module, DANS le Shell. La barre
     latérale et la barre du haut survivent : on peut simplement aller ailleurs.
     C'est la protection utile, car elle préserve la navigation.
   · `scope="root"` — dernier recours, si le Shell lui-même casse.

   Volontairement SANS dépendance au design system : si c'est justement lui qui
   casse, une barrière qui l'utilise planterait à son tour. Uniquement des `div`
   et des variables CSS, avec repli.

   ⚠ Portée réelle de React : sont attrapées les erreurs de RENDU et de cycle de
   vie. Ni les gestionnaires d'événements, ni le code asynchrone (promesses,
   setTimeout) ne passent par ici — une barrière ne dispense pas de gérer ses
   erreurs réseau. */
class DXErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stack: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ stack: info && info.componentStack });
    // Console uniquement : aucune remontée réseau. Un rapport d'erreur automatique
    // serait une collecte de données, incompatible avec l'opt-out analytics.
    try { console.error('[DispersionX] erreur de rendu :', error, info && info.componentStack); } catch {}
  }

  componentDidUpdate(prev) {
    // Changer d'écran doit repartir d'une page saine. Sans ce reset, l'erreur
    // resterait collée à TOUS les écrans suivants. On ne touche à rien tant qu'il
    // n'y a pas d'erreur : aucun effet sur le fonctionnement normal.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null, stack: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    const isRoot = this.props.scope === 'root';
    const msg = String((this.state.error && this.state.error.message) || this.state.error || 'erreur inconnue');
    const btn = (bg, color, border) => ({
      font: '600 12px/1 var(--font-sans, sans-serif)', padding: '10px 18px', borderRadius: 'var(--radius, 6px)',
      border: border || 'none', background: bg, color, cursor: 'pointer',
    });

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12,
        padding: isRoot ? '18vh 24px' : '56px 24px',
        background: 'var(--bg-card, #16181d)', border: '1px solid var(--neg, #b4404a)',
        borderRadius: 'var(--radius-lg, 12px)', margin: isRoot ? 0 : '8px 0',
        minHeight: isRoot ? '100vh' : 0, boxSizing: 'border-box',
      }}>
        <div style={{ font: '28px/1 var(--font-sans, sans-serif)' }}>⚠</div>
        <div style={{ font: 'var(--type-h3, 600 18px/1.3 sans-serif)', color: 'var(--text, #e8eaed)' }}>
          {isRoot ? "L'application a rencontré une erreur" : 'Ce module a rencontré une erreur'}
        </div>
        <div style={{ font: 'var(--type-body-sm, 13px/1.6 sans-serif)', color: 'var(--text-muted, #9aa0a6)', maxWidth: 460 }}>
          {isRoot
            ? "Rien n'est perdu : vos listes, stratégies et positions sont enregistrées. Rechargez la page pour repartir."
            : "Les autres modules fonctionnent — vous pouvez continuer ailleurs. Vos données ne sont pas affectées."}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
          {!isRoot && (
            <button onClick={() => this.setState({ error: null, stack: null })}
              style={btn('var(--accent, #3b6fd4)', '#fff')}>Réessayer</button>
          )}
          {!isRoot && this.props.onHome && (
            <button onClick={() => { this.setState({ error: null, stack: null }); this.props.onHome(); }}
              style={btn('transparent', 'var(--text-soft, #c8ccd1)', '1px solid var(--border, #2c2f36)')}>Retour à l'accueil</button>
          )}
          <button onClick={() => window.location.reload()}
            style={btn(isRoot ? 'var(--accent, #3b6fd4)' : 'transparent', isRoot ? '#fff' : 'var(--text-soft, #c8ccd1)', isRoot ? 'none' : '1px solid var(--border, #2c2f36)')}>
            Recharger la page
          </button>
        </div>

        {/* Détail technique replié : de quoi nous dire précisément ce qui a cassé,
            sans imposer un mur d'erreur à qui ne le lira pas. */}
        <details style={{ marginTop: 10, maxWidth: 640, width: '100%', textAlign: 'left' }}>
          <summary style={{ font: 'var(--type-caption, 11px/1.5 sans-serif)', color: 'var(--text-dim, #6b7075)', cursor: 'pointer' }}>
            Détail technique
          </summary>
          <pre style={{
            font: '11px/1.5 var(--font-mono, monospace)', color: 'var(--text-muted, #9aa0a6)',
            background: 'var(--bg-elevated, #1c1f26)', border: '1px solid var(--border, #2c2f36)',
            borderRadius: 'var(--radius, 6px)', padding: 12, marginTop: 8,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 240, overflow: 'auto',
          }}>{msg}{this.state.stack ? '\n' + this.state.stack : ''}</pre>
        </details>
      </div>
    );
  }
}

window.DXErrorBoundary = DXErrorBoundary;
