/* ─── Gauge prime de corrélation ──────────────────────────────────── */
function PrimeGauge({ implied, realized, size = 240 }) {
  const premium = (implied - realized) * 100;
  const target  = Math.max(0, Math.min(1, (premium + 20) / 40));
  const [anim, setAnim] = React.useState(0);
  const rafRef  = React.useRef(null);
  const t0Ref   = React.useRef(null);

  // Animation RAF : 0 → target, ease-out cubique
  React.useEffect(() => {
    t0Ref.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const from = 0, to = target, DUR = 1100;
    function tick(ts) {
      if (!t0Ref.current) t0Ref.current = ts;
      const p = Math.min(1, (ts - t0Ref.current) / DUR);
      const e = 1 - Math.pow(1 - p, 3);
      setAnim(from + (to - from) * e);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target]);

  let tone, verdict;
  if (premium >= 6)      { tone = '#26a69a'; verdict = 'Favorable'; }
  else if (premium >= 0) { tone = '#ffa726'; verdict = 'Neutre'; }
  else                   { tone = '#ef5350'; verdict = 'Défavorable'; }

  const W = 200, CX = 100, CY = 100, R = 76;
  // Coordonnées de l'aiguille calculées depuis l'angle (pas de CSS transform)
  // angle = π*(1-anim) : de π (gauche, −20pts) à 0 (droite, +20pts)
  const angle = Math.PI * (1 - anim);
  const NX = CX + (R - 8) * Math.cos(angle);
  const NY = CY - (R - 8) * Math.sin(angle);  // −sin car y SVG vers le bas

  const arcD = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: size }}>
      <svg viewBox={`0 0 ${W} 118`} width={size} height={size * 118 / W} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="pgGrad" x1={CX - R} y1="0" x2={CX + R} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#ef5350" />
            <stop offset="48%"  stopColor="#ffa726" />
            <stop offset="56%"  stopColor="#ffc107" />
            <stop offset="100%" stopColor="#26a69a" />
          </linearGradient>
        </defs>

        {/* Piste fond */}
        <path d={arcD} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="13" strokeLinecap="round" />
        {/* Arc dégradé */}
        <path d={arcD} fill="none" stroke="url(#pgGrad)" strokeWidth="13" strokeLinecap="round" opacity="0.88" />

        {/* Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(n => {
          const a = Math.PI * (1 - n);
          const ix = CX + (R - 7) * Math.cos(a), iy = CY - (R - 7) * Math.sin(a);
          const ox = CX + (R + 7) * Math.cos(a), oy = CY - (R + 7) * Math.sin(a);
          return <line key={n} x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(0,0,0,0.3)" strokeWidth={n === 0.5 ? 2 : 1} />;
        })}

        {/* Labels −20 / 0 / +20 */}
        {[{n:0,l:'−20'},{n:0.5,l:'0'},{n:1,l:'+20'}].map(({n,l}) => {
          const a = Math.PI * (1 - n);
          return <text key={l} x={CX + (R + 15) * Math.cos(a)} y={CY - (R + 15) * Math.sin(a)}
            textAnchor="middle" dominantBaseline="middle" fontSize="8"
            fontFamily="var(--font-mono)" fill="var(--text-dim)">{l}</text>;
        })}

        {/* Aiguille (coords directes, pas de transform) */}
        <line x1={CX + 10 * Math.cos(angle)} y1={CY - 10 * Math.sin(angle)}
              x2={NX} y2={NY}
              stroke={tone} strokeWidth="2.5" strokeLinecap="round" />

        {/* Hub central */}
        <circle cx={CX} cy={CY} r="7" fill="var(--bg-card)" stroke={tone} strokeWidth="2.5" />

        {/* Valeur */}
        <text x={CX} y={CY + 22} textAnchor="middle" fontSize="12"
          fontFamily="var(--font-mono)" fontWeight="700" fill={tone}>
          {premium >= 0 ? '+' : ''}{premium.toFixed(1)} pts
        </text>
      </svg>

      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <div style={{ font: '700 11px/1 var(--font-sans)', color: tone, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>{verdict}</div>
        <div style={{ display: 'flex', gap: 22 }}>
          {[{label:'ρ implicite', val: implied, c: 'var(--accent-hover)'}, {label:'ρ̂ réalisée', val: realized, c: 'var(--info)'}].map(d => (
            <div key={d.label} style={{ textAlign: 'center' }}>
              <div style={{ font: '10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 3 }}>{d.label}</div>
              <div style={{ font: '700 15px/1 var(--font-mono)', color: d.c }}>{d.val.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Symboles d'indices : ne doivent jamais être traités comme un composant
   du panier dans les calculs de contribution / décomposition. */
const INDEX_SYMS = ['SPX', 'NDX', 'DJI', 'CAC', 'DAX'];

/* ─── Régime : situer la prime du jour vs son historique ─────────────
   Baseline calculée sur 2022–2026 EXACTEMENT comme l'app (ρ_impl 30j CBOE
   cap ≈ indice · réalisée trailing 60j · prime = impl − réalisée en points).
   Repère de RÉGIME au niveau indice. Quantiles p0,5,…,100.
   Données dans js/lib/corr-baseline-data.js (générées par backtest/build_baseline.mjs) :
   source UNIQUE, partagée avec Construction, qui situe dans cette même histoire la prime
   nécessaire pour couvrir le spread. Repli {} → les panneaux qui en dépendent se masquent. */
const CORR_BASELINE = window.DXCorrBaseline || {};
/* percentile (0–100) d'une valeur dans un tableau de quantiles régulier (pas de 5). */
function pctRank(v, q) {
  if (!q || !q.length || v == null || !isFinite(v)) return null;
  if (v <= q[0]) return 0;
  if (v >= q[q.length - 1]) return 100;
  for (let i = 0; i < q.length - 1; i++) {
    if (v >= q[i] && v <= q[i + 1]) {
      const span = q[i + 1] - q[i];
      return (i + (span > 0 ? (v - q[i]) / span : 0)) * 5;
    }
  }
  return 100;
}
/* valeur du quantile à un percentile donné (interpolée). */
function qVal(q, pct) { const idx = pct / 5, lo = Math.floor(idx), hi = Math.ceil(idx); return q[lo] + (q[hi] - q[lo]) * (idx - lo); }

function CorrRegime({ premium, index, mode, onNav }) {
  const base = CORR_BASELINE[(index || 'SPX').toUpperCase()];
  if (!base || premium == null || !isFinite(premium)) return null;   // pas de baseline → panneau masqué (honnête)
  const q = base.premiumPts;
  const pct = pctRank(premium, q);
  const pctR = Math.round(pct);
  const markerL = Math.max(3, Math.min(97, pct));   // clamp visuel aux bords

  let tone, verdict, msg;
  if (pct >= 66)      { tone = 'var(--pos-bright)'; verdict = 'Prime large';        msg = `plus élevée que ~${pctR} % du temps depuis ${base.window}. La prime de corrélation est historiquement généreuse — plus de prime à encaisser en faisant de la dispersion.`; }
  else if (pct >= 33) { tone = 'var(--warn)';       verdict = 'Prime dans sa norme'; msg = `au ~${pctR}ᵉ percentile de son historique ${base.window} — ni chère, ni bon marché.`; }
  else                { tone = 'var(--neg-bright)'; verdict = 'Prime serrée';        msg = `plus faible que ~${100 - pctR} % du temps depuis ${base.window} — peu de prime à encaisser, contexte historiquement peu favorable.`; }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Régime de corrélation</h3>
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>Repère · {base.label} · {base.window}</span>
      </div>
      <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '4px 0 16px' }}>
        Où se situe la prime d'aujourd'hui vs son histoire — pour savoir si la corrélation est <strong style={{ color: 'var(--text-soft)' }}>chère</strong>, normale, ou <strong style={{ color: 'var(--text-soft)' }}>bon marché</strong>.
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
        <div style={{ font: '800 30px/1 var(--font-mono)', color: tone }}>{pctR}<span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--text-muted)' }}> ᵉ pct</span></div>
        <div style={{ font: '700 11px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.07em', color: tone }}>{verdict}</div>
      </div>

      {/* Strip percentile 0→100 avec repère « aujourd'hui » */}
      <div style={{ position: 'relative', margin: '30px 0 30px' }}>
        <div style={{ height: 12, borderRadius: 6, background: 'linear-gradient(90deg, var(--neg) 0%, var(--warn) 50%, var(--pos) 100%)', opacity: 0.8 }} />
        {[25, 50, 75].map(t => (
          <div key={t} style={{ position: 'absolute', left: t + '%', top: -3 }}>
            <div style={{ width: 1, height: 18, background: 'var(--border-strong)' }} />
            <div style={{ position: 'absolute', top: 21, left: 0, transform: 'translateX(-50%)', whiteSpace: 'nowrap', font: '9px/1 var(--font-mono)', color: 'var(--text-dim)' }}>
              {qVal(q, t) >= 0 ? '+' : ''}{qVal(q, t).toFixed(1)}
            </div>
          </div>
        ))}
        {/* repère aujourd'hui */}
        <div style={{ position: 'absolute', left: markerL + '%', top: -24, transform: 'translateX(-50%)', whiteSpace: 'nowrap', font: '700 10px/1 var(--font-mono)', color: tone }}>
          {premium >= 0 ? '+' : ''}{premium.toFixed(1)} pts
        </div>
        <div style={{ position: 'absolute', left: markerL + '%', top: -8, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `7px solid ${tone}` }} />
          <div style={{ width: 2, height: 22, background: tone }} />
        </div>
      </div>

      <p style={{ font: 'var(--type-caption)', color: 'var(--text-soft)', margin: 0 }}>
        La prime actuelle est {msg}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', flex: 1 }}>
          Ce repère porte sur <strong style={{ color: 'var(--text-soft)' }}>votre liste</strong> vs un historique figé.
        </span>
        {onNav && (
          <button onClick={() => onNav('market-pro')}
            style={{ font: '600 12px/1 var(--font-sans)', background: 'transparent', border: '1px solid var(--border)', color: 'var(--accent-hover)', cursor: 'pointer', padding: '6px 11px', borderRadius: 'var(--radius)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Baromètre live du marché · Pro →
          </button>
        )}
      </div>
      {mode === 'Débutant' && (
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', margin: '10px 0 0' }}>
          <strong>Percentile</strong> = le rang d'aujourd'hui dans l'historique. 80ᵉ percentile = plus élevé que 80 % des jours passés. Un repère de contexte, jamais une garantie — une prime large peut se refermer d'un coup lors d'un krach corrélé.
        </p>
      )}
    </div>
  );
}

/* ─── Playbook : structure de dispersion selon le régime + checklist ──────────
   Traduit la recherche institutionnelle (BNP QIS « risk-flat profiles » :
   gamma/vega/theta-flat à alterner selon le cycle ; GS premium-neutral ; playbook
   desk vol-arb : checklist à 5 portes) en aide à la décision HONNÊTE. Règle d'or
   maintenue : AUCUNE structure ne rend le P&L net positif « par magie » — la prime
   est un paiement pour porter le krach corrélé, pas un free lunch (cf.
   backtest/DISPERSION_SYNTHESE.md). Le module affiche donc un CHOIX D'EXPOSITION
   + un arbitrage prime↔queue, jamais une promesse de gain.
   Entrées 100 % dérivées de ce que le Lab observe déjà : percentile de prime
   (régime), skew (ρ downside − ATM), pente de terme. Repli propre si absentes. */
function RegimePlaybook({ premiumPct, premium, skew, term, mode, onNav, listId }) {
  // Structure recommandée → méthode de sizing Construction (propagation « câbler la structure »).
  const SIZING_OF = { equal: 'vega_neutral', theta: 'theta_flat', gamma: 'gamma_flat', premium: 'premium_neutral' };
  const pct        = (premiumPct != null && isFinite(premiumPct)) ? Math.round(premiumPct) : null;
  const skewSteep  = (skew && skew[0] != null && skew[3] != null) ? (skew[0] - skew[3]) : null;   // ρ(−15%) − ρ(ATM)
  const termSlope  = (term && term[0] != null && term[term.length - 1] != null) ? (term[term.length - 1] - term[0]) : null;

  const rich  = pct != null && pct >= 66;
  const cheap = pct != null && pct < 33;
  const steep = skewSteep != null && skewSteep >= 0.15;

  // Structure que la THÉORIE favorise dans ce régime de corrélation (le cycle de
  // marché — tendance/vol — complète ce tableau, à lire sur le Dashboard).
  let recKey, why;
  if (pct == null)         { recKey = 'equal';   why = "Régime indéterminé (pas d'historique de prime) — structure neutre par défaut."; }
  else if (cheap)          { recKey = 'wait';    why = `Prime serrée (${pct}ᵉ pct) : trop mince pour couvrir le coût d'exécution retail. Aucune structure n'imprime ici — attendre que la prime se reconstitue, ou réduire la taille.`; }
  else if (rich && steep)  { recKey = 'theta';   why = `Prime riche (${pct}ᵉ pct) mais skew raide (+${(skewSteep * 100).toFixed(0)} pts à la baisse) : la prime vit sur le krach corrélé. Le theta-weighted encaisse le portage — mais taille réduite et couverture de queue, vous êtes short un krach lourd.`; }
  else if (rich)           { recKey = 'premium'; why = `Prime riche (${pct}ᵉ pct), skew modéré : jeu de covariance. Le premium-neutral rend le signe du P&L dépendant du seul réalisé vs implicite (magnitude ∝ vol réalisée).`; }
  else                     { recKey = 'equal';   why = `Prime dans sa norme (${pct}ᵉ pct) : équipondéré vega-neutre — la capture de base, équilibrée. Rien ne justifie un profil plus agressif.`; }

  const STRUCTS = [
    { key: 'equal',   name: 'Équipondéré · vega-neutre',   regime: 'Calme, vol basse',         capture: 'Prime de corrélation (base)',   tail: 'Krach corrélé (standard)' },
    { key: 'theta',   name: 'Theta-weighted (theta-flat)', regime: 'Haussier / tendance',      capture: 'Portage positif (carry)',       tail: 'Krach + bleed si le marché range' },
    { key: 'gamma',   name: 'Gamma-flat',                  regime: 'Range / récession',        capture: 'Dispersion statistique pure',   tail: 'Corrélation basse qui persiste' },
    { key: 'premium', name: 'Premium-neutral (GS)',        regime: 'Prime riche · covariance', capture: 'Signe = réalisé vs implicite',  tail: 'Magnitude ∝ vol réalisée' },
    { key: 'wait',    name: 'Attendre / réduire',          regime: 'Prime serrée',             capture: '— (coût > prime)',              tail: 'Le coût mange la prime' },
  ];
  const recRow = STRUCTS.find(s => s.key === recKey);

  // Checklist de pré-trade (desk vol-arb, 5 catégories). 3 portes MESURABLES depuis nos données
  // (edge, structure, queue via skew) ; 2 sont HORS données PAR NATURE (surpeuplement = flux/AUM
  // qu'on ne capte pas en live ; sortie = plan de trade de l'utilisateur) → à confirmer par lui.
  const COST_PTS = 3;   // « l'edge doit dépasser 3-4 % pour être viable net » (praticien)
  const checks = [
    { auto: true,  ok: premium != null && premium >= COST_PTS,
      label: 'Edge quantifié > coût',
      detail: premium != null ? `Prime ${premium >= 0 ? '+' : ''}${premium.toFixed(1)} pts vs seuil desk ~${COST_PTS}–4 pts` : 'prime indisponible' },
    { auto: true,  ok: pct != null && pct >= 50,
      label: 'Structure de marché favorable',
      detail: pct != null ? `Prime au ${pct}ᵉ percentile de son histoire (≥ 50 requis)` : 'percentile indisponible' },
    { auto: true, ok: skewSteep != null,
      label: 'Risque de queue chiffré',
      detail: skewSteep != null ? `Skew +${(skewSteep * 100).toFixed(0)} pts à la baisse${skewSteep >= 0.15 ? ' — queue ÉLEVÉE, à assumer' : ''} : le krach corrélé que vous vendez` : 'skew indisponible (panier < 3 noms)' },
    { auto: false, ok: null,
      label: 'Pas de surpeuplement',
      detail: 'Fait de FLUX / AUM (Bloomberg : ×2-3 en 2021-24) — hors de nos données de marché, impossible à mesurer en live. À juger toi-même.' },
    { auto: false, ok: null,
      label: 'Discipline de sortie prédéfinie',
      detail: 'Ton plan de trade (ex. stop si ρ implicite +15 pts vs entrée) — l\'app ne peut ni le connaître ni le vérifier.' },
  ];
  const autoOk  = checks.filter(c => c.auto && c.ok).length;
  const autoTot = checks.filter(c => c.auto).length;   // 3 : edge, structure, queue
  const manualTot = checks.filter(c => !c.auto).length; // 2 : surpeuplement, sortie (hors données)

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 };
  const th   = { font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: 'left', padding: '6px 8px' };
  const td   = { font: 'var(--type-caption)', color: 'var(--text-soft)', padding: '8px', borderTop: '1px solid var(--border-subtle)', verticalAlign: 'top' };

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Quelle structure pour ce régime ?</h3>
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>d'après BNP QIS · Goldman · desks vol-arb</span>
      </div>
      <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '4px 0 16px' }}>
        La structure d'une dispersion n'est pas neutre : chaque profil capture la prime autrement et porte une queue différente. Voici celui que la <strong style={{ color: 'var(--text-soft)' }}>théorie favorise aujourd'hui</strong> — un <strong style={{ color: 'var(--text-soft)' }}>choix d'exposition</strong>, jamais une promesse de gain.
      </p>

      {/* Reco du régime */}
      <div style={{ background: recKey === 'wait' ? 'var(--neg-soft, var(--bg-elevated))' : 'var(--pos-soft, var(--bg-elevated))', border: `1px solid ${recKey === 'wait' ? 'var(--neg)' : 'var(--pos)'}`, borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 }}>Recommandé maintenant</div>
        <div style={{ font: '700 15px/1.2 var(--font-sans)', color: recKey === 'wait' ? 'var(--neg-bright)' : 'var(--pos-bright)', marginBottom: 6 }}>{recRow?.name}</div>
        <div style={{ font: 'var(--type-caption)', color: 'var(--text-soft)', lineHeight: 1.55 }}>{why}</div>
        {onNav && listId && SIZING_OF[recKey] && (
          <button onClick={() => onNav('construction', { listId, sizing: SIZING_OF[recKey] })}
            style={{ marginTop: 12, font: '600 12px/1 var(--font-sans)', padding: '9px 15px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>
            Construire en {recRow?.name} →
          </button>
        )}
      </div>

      {/* Tableau des profils (le recommandé est surligné) */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead><tr><th style={th}>Structure</th><th style={th}>Régime favorable</th><th style={th}>Capture</th><th style={th}>Sa queue</th></tr></thead>
          <tbody>
            {STRUCTS.map(s => {
              const on = s.key === recKey;
              return (
                <tr key={s.key} style={{ background: on ? 'var(--bg-elevated)' : 'transparent' }}>
                  <td style={{ ...td, color: on ? 'var(--accent-hover)' : 'var(--text-soft)', fontWeight: on ? 700 : 400 }}>{on ? '→ ' : ''}{s.name}</td>
                  <td style={td}>{s.regime}</td>
                  <td style={td}>{s.capture}</td>
                  <td style={{ ...td, color: 'var(--text-muted)' }}>{s.tail}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Checklist de pré-trade */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Checklist de pré-trade</h3>
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}><strong style={{ font: '700 13px/1 var(--font-mono)', color: autoOk === autoTot ? 'var(--pos-bright)' : 'var(--warn)' }}>{autoOk}/{autoTot}</strong> auto-mesurées · <strong style={{ color: 'var(--text-dim)' }}>{manualTot} à confirmer</strong></span>
        </div>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Un desk exige <strong style={{ color: 'var(--text-soft)' }}>≥ 4/5</strong> portes avant d'ouvrir. <strong>3 sont mesurées</strong> depuis nos données (edge, structure, queue) ; les <strong>2 dernières sont hors des données</strong> et te reviennent — le <strong>surpeuplement</strong> est un fait de flux/AUM qu'on ne capte pas en live, la <strong>discipline de sortie</strong> est ton plan de trade. Plus honnête qu'un seul score : chaque porte se vérifie séparément.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {checks.map((c, i) => {
            const icon = c.auto ? (c.ok ? '✓' : '✗') : '○';
            const col  = c.auto ? (c.ok ? 'var(--pos-bright)' : 'var(--neg-bright)') : 'var(--text-dim)';
            return (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ font: '700 14px/1.3 var(--font-mono)', color: col, flexShrink: 0, width: 16, textAlign: 'center' }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{c.label}{!c.auto && <span style={{ color: 'var(--text-dim)', font: 'var(--type-caption)' }}> · à confirmer</span>}</div>
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', marginTop: 1 }}>{c.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {mode === 'Débutant' && (
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', margin: '14px 0 0', lineHeight: 1.5 }}>
          Rappel : ces profils ne sont pas des « recettes qui gagnent ». Ils décrivent <strong>comment</strong> vous vous exposez à la même prime de corrélation. Le résultat net dépend surtout du <strong>coût d'exécution</strong> et de la <strong>taille</strong> — et, en cas de krach corrélé, chaque structure perd. La checklist sert à ne pas entrer sur un seul chiffre séduisant.
        </p>
      )}
    </div>
  );
}

/* ─── Carte de la corrélation (structure moyenne 2022-2026, statique) ───
   ρ_impl moyen par MONEYNESS (skew) et par ÉCHÉANCE (terme), par indice.
   Calculé par backtest/build_corrmap.mjs. Repère de structure, PAS du temps réel
   (à passer en live via IBKR — chaînes multi-strike/tenor — plus tard). */
const CORR_MAP = {
  SPX: { skew: [0.537, 0.445, 0.328, 0.198, 0.109, 0.145, 0.206], term: [0.197, 0.210, 0.206, 0.247, 0.282] },
  NDX: { skew: [0.572, 0.510, 0.429, 0.331, 0.255, 0.243, 0.287], term: [0.332, 0.344, 0.339, 0.377, 0.397] },
  DJI: { skew: [0.636, 0.555, 0.426, 0.289, 0.225, 0.355, 0.578], term: [0.286, 0.288, 0.283, 0.319, 0.339] },
};

function MiniCurve({ values, labels, color }) {
  const W = 264, H = 138, padL = 28, padR = 12, padT = 20, padB = 26, n = values.length;
  const yMax = Math.max(0.1, Math.ceil(Math.max(...values) / 0.1) * 0.1);
  const x = i => padL + (i / (n - 1)) * (W - padL - padR);
  const y = v => padT + (1 - v / yMax) * (H - padT - padB);
  const gid = 'mc' + color.replace(/[^a-z]/gi, '');
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(n - 1).toFixed(1)} ${y(0).toFixed(1)} L ${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.18" /><stop offset="100%" stopColor={color} stopOpacity="0.01" /></linearGradient></defs>
      {[0, 0.5, 1].map(g => { const v = yMax * g; return (
        <g key={g}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--border-subtle)" />
          <text x={padL - 4} y={y(v) + 3} textAnchor="end" fontSize="8" fontFamily="var(--font-mono)" fill="var(--text-dim)">{v.toFixed(2)}</text>
        </g>); })}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" />
      {values.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="3" fill={color} />
          <text x={x(i)} y={y(v) - 7} textAnchor="middle" fontSize="8.5" fontFamily="var(--font-mono)" fontWeight="700" fill="var(--text-soft)">{v.toFixed(2)}</text>
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="8.5" fontFamily="var(--font-sans)" fill="var(--text-dim)">{labels[i]}</text>
        </g>))}
    </svg>
  );
}

const SKEW_M = [85, 90, 95, 100, 105, 110, 115], TERM_T = [30, 60, 90, 180, 365];
const SKEW_XL = { 85: '−15 %', 90: '−10 %', 95: '−5 %', 100: 'ATM', 105: '+5 %', 110: '+10 %', 115: '+15 %' };
const TERM_XL = { 30: '1 m', 60: '2 m', 90: '3 m', 180: '6 m', 365: '1 an' };
const IDX_PROXY = { SPX: 'SPY', NDX: 'QQQ', DJI: 'DIA' };

// ρ_impl (équipondéré) à partir d'un σ indice + des σ composants à un même point de surface.
function rhoImplAt(sigI, sigs) { const n = sigs.length; if (!(sigI > 0) || n < 2) return null; let A = 0, B = 0; for (const s of sigs) { A += s / n; B += (s * s) / (n * n); } const den = A * A - B; return Math.abs(den) < 1e-9 ? null : (sigI * sigI - B) / den; }

// Skew de corrélation AJUSTÉ À LA LISTE : forme historique (skew par composant, window.DXSkewComp)
// ANCRÉE au niveau de corrélation du jour (liveRho). Repli null → carte niveau indice.
function listCorrMap(tickers, indexKey, liveRho) {
  const T = window.DXSkewComp, I = T && T[IDX_PROXY[indexKey]];
  if (!T || !I) return null;
  const comps = (tickers || []).map(t => T[t]).filter(Boolean);
  if (comps.length < 3) return null;
  const skew = I.sk.map((sI, i) => rhoImplAt(sI, comps.map(c => c.sk[i]).filter(v => v > 0)));
  const term = I.tm.map((sI, i) => rhoImplAt(sI, comps.map(c => c.tm[i]).filter(v => v > 0)));
  const anch = liveRho != null && isFinite(liveRho);
  const shift = (arr, ref) => arr.map(v => v == null ? null : +((anch && ref != null ? v + (liveRho - ref) : v)).toFixed(3));
  return { skew: shift(skew, skew[3]), term: shift(term, term[0]), n: comps.length, anchored: anch };
}

// une courbe interactive (DXChart : croix de visée, valeurs, infobulle) ou repli MiniCurve.
function CorrCurve({ data, xKey, xl, color, dots = false }) {
  if (window.DXChart) return (
    <window.DXChart data={data} xKey={xKey} dots={dots}
      lines={[{ key: 'rho', color, label: 'ρ implicite', fill: true }]}
      height={172} ticksY={3} yAxisWidth={40} padFrac={0.24}
      yFmt={v => v.toFixed(2)} xFmt={x => xl[x] || String(x)} />
  );
  return <MiniCurve values={data.map(d => d.rho)} labels={data.map(d => xl[d[xKey]])} color={color} />;
}

function CorrMap({ index, mode, tickers, liveRho }) {
  const key = (index || 'SPX').toUpperCase();
  const listMap = listCorrMap(tickers, key, liveRho);
  const m = listMap || CORR_MAP[key];
  if (!m) return null;   // ni liste ni indice → masqué
  const lbl = (CORR_BASELINE[key] || {}).label || key;
  const listed = !!listMap;
  const skewData = SKEW_M.map((mn, i) => ({ m: mn, rho: m.skew[i] })).filter(d => d.rho != null);
  const termData = TERM_T.map((t, i) => ({ t, rho: m.term[i] })).filter(d => d.rho != null);
  const sDownPt = skewData[0], sDown = sDownPt?.rho, sDownXl = sDownPt ? SKEW_XL[sDownPt.m] : '', sAtm = skewData.find(d => d.m === 100)?.rho;
  const t0 = termData[0]?.rho, t1 = termData[termData.length - 1]?.rho;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Structure de la corrélation</h3>
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
          {listed ? `Ajustée à votre liste${m.anchored ? ' · niveau du jour' : ''}` : `${lbl} · niveau indice`} · forme 2022–2026
        </span>
      </div>
      <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '4px 0 20px' }}>
        {listed
          ? <>Comment la corrélation de <strong style={{ color: 'var(--text-soft)' }}>votre panier</strong> se comporte selon le scénario et l'échéance{m.anchored ? ', ancrée au niveau de corrélation actuel' : ''}. Survolez les courbes pour lire les valeurs.</>
          : <>Comment l'<strong style={{ color: 'var(--text-soft)' }}>indice</strong> price la corrélation (repère du marché, identique quelle que soit la liste). Survolez pour lire les valeurs.</>}
      </p>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '12px 14px', margin: '0 0 20px', font: 'var(--type-caption)', color: 'var(--text-muted)', lineHeight: 1.55 }}>
        <div style={{ marginBottom: 9 }}>
          La <strong style={{ color: 'var(--text-soft)' }}>corrélation implicite</strong> mesure à quel point le marché s'attend à ce que les actions du panier bougent <em>ensemble</em> (0 = chacune de son côté, 1 = toutes à l'unisson). Ce n'est pas un chiffre unique : elle dépend du <strong style={{ color: 'var(--text-soft)' }}>scénario</strong> envisagé et de l'<strong style={{ color: 'var(--text-soft)' }}>échéance</strong>.
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <div><span style={{ color: 'var(--neg-bright)', fontWeight: 700 }}>Le skew</span> — la 1ʳᵉ courbe : la corrélation attendue si le marché <strong style={{ color: 'var(--text-soft)' }}>plonge</strong> (à gauche, −15 %), reste stable (au centre, ATM) ou <strong style={{ color: 'var(--text-soft)' }}>monte</strong> (à droite, +15 %). Elle est presque toujours bien plus haute à la baisse : dans un krach, les actions chutent ensemble.</div>
          <div><span style={{ color: 'var(--accent-hover)', fontWeight: 700 }}>Le terme</span> — la 2ᵉ courbe : la même corrélation attendue selon l'horizon, de 1 mois à 1 an.</div>
        </div>
        <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
          Pourquoi c'est utile : une position de dispersion revient à <strong style={{ color: 'var(--text-soft)' }}>vendre cette corrélation</strong>. Vous êtes donc le plus exposé exactement là où elle est la plus haute — le krach corrélé, à gauche du skew.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        <div>
          <div style={{ font: '600 12px/1.3 var(--font-sans)', color: 'var(--text-soft)', marginBottom: 12 }}>Selon le scénario (skew)</div>
          <CorrCurve data={skewData} xKey="m" xl={SKEW_XL} color="var(--neg-bright)" dots />
          {sDown != null && sAtm != null && (
            <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '10px 0 0' }}>
              {sDown > sAtm + 0.03
                ? <>Plus haute à la baisse (<strong style={{ color: 'var(--neg-bright)' }}>{sDown.toFixed(2)}</strong> à {sDownXl}) qu'à la monnaie ({sAtm.toFixed(2)}) : le krach est corrélé.</>
                : <>Corrélation {sAtm.toFixed(2)} à la monnaie, {sDown.toFixed(2)} à la baisse — assez plate.</>}
            </p>
          )}
        </div>
        <div>
          <div style={{ font: '600 12px/1.3 var(--font-sans)', color: 'var(--text-soft)', marginBottom: 12 }}>Selon l'échéance (terme)</div>
          <CorrCurve data={termData} xKey="t" xl={TERM_XL} color="var(--accent-hover)" />
          {t0 != null && t1 != null && (
            <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '10px 0 0' }}>
              {t1 > t0 + 0.02
                ? <>Montante : {t0.toFixed(2)} à 1 mois → <strong style={{ color: 'var(--accent-hover)' }}>{t1.toFixed(2)}</strong> à 1 an.</>
                : <>{t0.toFixed(2)} à 1 mois → {t1.toFixed(2)} à 1 an.</>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Contribution par composant ──────────────────────────────────── */
function ContribChart({ matrixTickers, matrix, rhoImpl }) {
  if (!matrixTickers || !matrix || matrixTickers.length < 2) return null;
  // Positions des vrais composants (on exclut l'indice s'il figure dans la matrice).
  const compPos = matrixTickers.map((_, i) => i).filter(i => !INDEX_SYMS.includes(matrixTickers[i]));
  const pool = compPos.length >= 2 ? compPos : matrixTickers.map((_, i) => i);
  // ρ̄ du composant = corrélation moyenne avec les AUTRES composants (hors indice).
  const items = pool.map(i => {
    const others = pool.filter(j => j !== i).map(j => matrix[i][j]);
    const avgRho = others.reduce((a, b) => a + b, 0) / Math.max(1, others.length);
    return { ticker: matrixTickers[i], avgRho, contrib: rhoImpl - avgRho };
  }).sort((a, b) => b.contrib - a.contrib);

  const maxAbs = Math.max(...items.map(it => Math.abs(it.contrib)), 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(it => {
        const pct = it.contrib / maxAbs;
        const isPos = it.contrib >= 0;
        const bar = Math.abs(pct) * 44;  // max 44% de la moitié
        return (
          <div key={it.ticker} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 64px', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--bg-elevated)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img src={`https://assets.parqet.com/logos/symbol/${it.ticker.split('.')[0]}`} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }}
                  onError={e => { e.currentTarget.style.display='none'; }} />
              </div>
              <span style={{ font: '600 10px/1 var(--font-mono)', color: 'var(--text-soft)' }}>{it.ticker}</span>
            </div>
            {/* Barre divergente centrée */}
            <div style={{ position: 'relative', height: 18, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: 3, bottom: 3,
                [isPos ? 'left' : 'right']: '50%',
                width: bar + '%',
                background: isPos ? 'var(--pos-bright)' : 'var(--neg-bright)',
                borderRadius: 2, opacity: 0.85,
              }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ font: '700 11px/1 var(--font-mono)', color: isPos ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right' }}>
              {isPos ? '+' : ''}{(it.contrib * 100).toFixed(1)} pts
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Décomposition sectorielle ───────────────────────────────────── */
const SECTOR_MAP = {
  Technology:   ['AAPL','MSFT','NVDA','AVGO','AMD','INTC','QCOM','MU','AMAT','KLAC','LRCX','ADI','TXN','CRM','NOW','ADBE','INTU','SNPS','CDNS','ORCL','IBM','DELL','HPE','STX','WDC'],
  Comm:         ['META','GOOGL','GOOG','NFLX','DIS','CMCSA','CHTR','T','VZ','TMUS','PARA','WBD'],
  'Conso. Disc':['AMZN','TSLA','HD','MCD','NKE','SBUX','TJX','LOW','CMG','BKNG','ABNB','F','GM','ROST','EBAY'],
  Financier:    ['JPM','BAC','WFC','GS','MS','C','AXP','BLK','SPGI','V','MA','BRK.B','COF','SCHW','CB'],
  Santé:        ['LLY','UNH','JNJ','ABBV','MRK','PFE','TMO','ABT','DHR','BMY','AMGN','ISRG','MDT','SYK','CVS','GILD','VRTX','REGN','BSX','ZTS'],
  Énergie:      ['XOM','CVX','COP','EOG','SLB','MPC','PSX','VLO','OXY','HAL','PXD','DVN'],
  Industriel:   ['CAT','GE','HON','BA','RTX','LMT','UPS','UNP','CSX','DE','EMR','ETN','PH','MMM','ITW','GD','NOC','FDX','WM'],
  'Conso. Stap':['WMT','COST','PG','KO','PEP','MDLZ','PM','MO','CL','GIS','KHC','STZ','SYY'],
  Matériaux:    ['LIN','APD','ECL','SHW','DD','NUE','FCX','NEM','ALB'],
  Immobilier:   ['PLD','AMT','EQIX','PSA','WELL','SPG','CCI','CBRE'],
  Utilités:     ['NEE','DUK','SO','AEP','D','SRE','EXC','PCG','XEL'],
};
function getSector(ticker) {
  for (const [sec, list] of Object.entries(SECTOR_MAP)) {
    if (list.includes(ticker)) return sec;
  }
  return 'Autre';
}

function SectorChart({ matrixTickers, matrix, rhoImpl }) {
  if (!matrixTickers || !matrix || matrixTickers.length < 2) return null;
  // Colonnes des vrais composants (hors indice) pour les moyennes.
  const compCols = matrixTickers.map((_, i) => i).filter(i => !INDEX_SYMS.includes(matrixTickers[i]));
  const sectorBuckets = {};
  matrixTickers.forEach((t, i) => {
    if (INDEX_SYMS.includes(t)) return; // l'indice n'est pas un composant
    const sec = getSector(t);
    if (!sectorBuckets[sec]) sectorBuckets[sec] = [];
    sectorBuckets[sec].push({ ticker: t, idx: i });
  });

  const rows = Object.entries(sectorBuckets).map(([sec, members]) => {
    const indices = members.map(m => m.idx);
    let avgRho;
    if (indices.length === 1) {
      const others = compCols.filter(j => j !== indices[0]).map(j => matrix[indices[0]][j]);
      avgRho = others.reduce((a, b) => a + b, 0) / Math.max(1, others.length);
    } else {
      let sum = 0, cnt = 0;
      for (let i = 0; i < indices.length; i++)
        for (let j = i + 1; j < indices.length; j++)
          { sum += matrix[indices[i]][indices[j]]; cnt++; }
      avgRho = cnt > 0 ? sum / cnt : 0;
    }
    return { sector: sec, tickers: members.map(m => m.ticker), avgRho, prime: rhoImpl - avgRho };
  }).sort((a, b) => b.prime - a.prime);

  const maxPrime = Math.max(...rows.map(r => Math.abs(r.prime)), 0.01);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map(r => {
        const isPos = r.prime >= 0;
        const barW = Math.abs(r.prime) / maxPrime * 100;
        return (
          <div key={r.sector} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 60px', gap: 8, alignItems: 'center' }}>
            <div>
              <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--text-soft)' }}>{r.sector}</div>
              <div style={{ font: '9px/1 var(--font-mono)', color: 'var(--text-dim)', marginTop: 2 }}>
                {r.tickers.slice(0, 3).join(' ')}
                {r.tickers.length > 3 ? ` +${r.tickers.length - 3}` : ''}
              </div>
            </div>
            <div style={{ position: 'relative', height: 14, background: 'var(--bg-elevated)', borderRadius: 3 }}>
              <div style={{
                position: 'absolute', top: 2, bottom: 2, left: 0,
                width: barW + '%',
                background: isPos ? 'var(--pos)' : 'var(--neg)',
                borderRadius: 2, opacity: 0.75,
              }} />
            </div>
            <div style={{ font: '600 11px/1 var(--font-mono)', color: isPos ? 'var(--pos-bright)' : 'var(--neg-bright)', textAlign: 'right' }}>
              ρ̄ {r.avgRho.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Vue ticker individuel dans le Correlation Lab ─────────────── */
function SingleTickerCorr({ ctx, onCtx, lists, mode }) {
  const { MetricCard, Badge } = window.DispersionXDesignSystem_cb86be;
  const [vol, setVol]         = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const ticker = ctx.ticker;
  const index  = ctx.index || ctx.listIndex || 'SPX';

  React.useEffect(() => {
    if (!ticker) return;
    setLoading(true); setVol(null);

    // Fallback : données de référence pour n'importe quel ticker (connu ou
    // importé). Une action d'une liste basée sur cet indice s'affiche donc
    // toujours, sans message « ne fait pas partie de l'indice ».
    const fallback = () => window.DXMock?.synthVol ? window.DXMock.synthVol(ticker, index) : null;
    DXApi.getTickerVol(ticker, index)
      .then(d => {
        setVol((d && !d.error) ? d : fallback());
        setLoading(false);
      })
      .catch(() => {
        setVol(fallback());
        setLoading(false);
      });
  }, [ticker, index]);

  // onClear doit tout réinitialiser (pas juste ticker:null)
  function handleClear() {
    onCtx({ ticker: null, listId: null, listName: null, index: null, listIndex: null });
  }

  if (loading) return (
    window.DXLoader ? (
      <window.DXLoader title="Chargement de la corrélation" steps={[
        'Cours historiques des sous-jacents…',
        'Corrélation réalisée sur la fenêtre…',
        'Corrélation implicite via le VIX…',
      ]} />
    ) : (
      <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>
        Chargement corrélation <strong style={{ color: 'var(--text)' }}>{ticker}</strong> / {index}…
      </div>
    )
  );

  if (!vol) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <window.ModuleCtxBar ctx={ctx} lists={lists} onCtx={onCtx} onClear={handleClear} />
      <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ font: 'var(--type-h3)', color: 'var(--text)', marginBottom: 8 }}>Données non disponibles pour {ticker} / {index}</div>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 16px' }}>
          Ce ticker n'est pas disponible dans l'indice {index}. Essayez un autre indice ou une action connue de cet indice.
        </p>
        <button onClick={handleClear} style={{ padding: '8px 20px', font: '600 13px/1 var(--font-sans)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
          ← Nouvelle recherche
        </button>
      </div>
    </div>
  );

  const V    = vol;
  const beta = V.beta ?? null;
  const corr = V.correlation ?? null;
  const hv30 = V.hv30 ?? null;
  const iv   = V.iv_est ?? null;
  const isMock = V.source === 'reference';

  const corrTone  = corr == null ? 'var(--text-muted)' : corr > 0.75 ? 'var(--neg-bright)' : corr > 0.5 ? 'var(--warn)' : 'var(--pos-bright)';
  const corrLabel = corr == null ? '—' : corr > 0.75 ? 'Élevée' : corr > 0.5 ? 'Modérée' : 'Faible';
  const betaLabel = beta == null ? '—' : beta > 1.5 ? 'Amplifié' : beta > 0.8 ? 'Neutre' : 'Défensif';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <window.ModuleCtxBar ctx={ctx} lists={lists} onCtx={onCtx} onClear={handleClear} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 4px' }}>
            <span style={{ color: 'var(--accent-hover)' }}>{ticker}</span> vs {index}
          </h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>
            Corrélation &amp; beta · {isMock ? 'Données de référence (indices)' : 'Yahoo Finance · 90 jours'}
          </p>
        </div>
        {isMock && (
          <div style={{ padding: '5px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', font: 'var(--type-caption)', color: 'var(--text-dim)' }}>
            Données de référence
          </div>
        )}
      </div>

      {/* Métriques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MetricCard label={`ρ vs ${index}`} value={corr != null ? corr.toFixed(2) : '—'} accent={corrTone} hint={corrLabel} />
        <MetricCard label={`β vs ${index}`} value={beta != null ? beta.toFixed(2) : '—'} accent="var(--info)" hint={betaLabel} />
        <MetricCard label="HV 30j" value={hv30 != null ? hv30.toFixed(1) : '—'} unit="%" accent="var(--text-soft)" hint="Volatilité réalisée" />
        <MetricCard label="IV Est." value={iv != null ? iv.toFixed(1) : '—'} unit="%" accent="var(--warn)" hint="Impl. ≈ HV×1.12" />
      </div>

      {/* Interprétation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Corrélation */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 14px' }}>
            Corrélation · ρ = {corr != null ? corr.toFixed(2) : '—'}
          </h3>
          {corr != null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 10, background: 'var(--bg-elevated)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ width: Math.abs(corr) * 100 + '%', height: '100%', background: corrTone, opacity: 0.85 }} />
                </div>
                <span style={{ font: '700 13px/1 var(--font-mono)', color: corrTone, width: 42 }}>{(corr * 100).toFixed(0)}%</span>
              </div>
              <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: 0 }}>
                {corr > 0.75
                  ? `${ticker} suit de très près l'${index} — faible diversification. La dispersion profite si ${ticker} s'en écarte.`
                  : corr > 0.5
                  ? `${ticker} suit modérément l'${index}. Potentiel de dispersion présent lors des phases d'écart.`
                  : `${ticker} est peu corrélé à l'${index} — fort potentiel de dispersion individuelle.`}
              </p>
            </div>
          ) : (
            <p style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', margin: 0 }}>Non disponible pour cet indice.</p>
          )}
        </div>

        {/* Beta */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 14px' }}>
            Beta · β = {beta != null ? beta.toFixed(2) : '—'}
          </h3>
          {beta != null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 10, background: 'var(--bg-elevated)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '40%', top: 0, bottom: 0, width: 1, background: 'var(--border-strong)' }} />
                  <div style={{ width: Math.min(100, Math.abs(beta) / 2.5 * 100) + '%', height: '100%', background: 'var(--info)', opacity: 0.8 }} />
                </div>
                <span style={{ font: '700 13px/1 var(--font-mono)', color: 'var(--info)', width: 42 }}>{beta.toFixed(2)}</span>
              </div>
              <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: 0 }}>
                {beta > 1.5
                  ? `Mouvement amplifié : +1% ${index} → ~+${beta.toFixed(1)}% ${ticker}. Exposition directionnelle forte.`
                  : beta > 0.8
                  ? `Beta proche de 1 — ${ticker} évolue de pair avec l'${index}.`
                  : `${ticker} défensif (β < 1) — moins volatil que l'${index}.`}
              </p>
            </div>
          ) : (
            <p style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', margin: 0 }}>Non disponible pour cet indice.</p>
          )}
        </div>
      </div>

      {/* Conseil */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
        Pour le <strong style={{ color: 'var(--text)' }}>score de dispersion complet</strong> incluant IV/HV, liquidité et ρ pondéré, consultez la fiche de l'action depuis <em>Accueil → Indice</em> ou ajoutez-la à une liste.
      </div>
    </div>
  );
}

/* ─── Correlation Lab ─────────────────────────────────────────────── */
// `view` : 'corr' (défaut) = matrice/prime/contribution/secteurs/historique ·
//          'regime' = régime + structure recommandée + skew/terme (écran dédié).
// Même pipeline de données, deux vues — on désengorge sans dupliquer la collecte.
function CorrelationLab({ listId: listIdParam, onNav, mode, lists, moduleCtx, onModuleCtx, embedded, view = 'corr' }) {
  const { MetricCard, Badge, WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [implRho, setImplRho] = React.useState(null);   // ρ implicite RÉELLE (CBOE/IV) du panier

  // Contexte de module ou paramètre direct de navigation
  const listId    = listIdParam || moduleCtx?.listId || null;
  const ctx       = moduleCtx || {};
  const tickerMode = !listId && !!ctx.ticker;
  const hasCtx    = !!listId || tickerMode;

  const DEMO_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN'];

  // Hook de chargement liste — toujours appelé, garde conditionnelle à l'intérieur
  React.useEffect(() => {
    if (!listId) return;
    setImplRho(null);
    const resolve = DXApi.getList(listId).then(list => {
      const tickers = (list?.items || []).map(i => i.ticker).filter(Boolean);
      const index   = list?.index_symbol || ctx.listIndex || 'SPX';
      // ρ implicite RÉELLE (formule CBOE sur IV, vega-pondérée) pour CETTE liste —
      // cohérente avec le score et l'auto-chercheur. Repli sur C.rho_impl (VIX).
      const useTk = tickers.length >= 2 ? tickers : DEMO_TICKERS;
      DXApi.impliedCorrelation(index, useTk, null, 30)
        .then(r => { if (r && r.rho_impl != null) setImplRho(r.rho_impl); }).catch(() => {});
      if (tickers.length < 2) return DXApi.getCorrelation(null, DEMO_TICKERS, index);
      return DXApi.getCorrelation(listId, tickers, index);
    });
    resolve.then(d => { setData(d); setLoading(false); }).catch(() => {
      setData(window.DXData?.corr);
      setLoading(false);
    });
  }, [listId]);

  // Mode ticker individuel
  if (tickerMode) {
    return (
      <SingleTickerCorr
        ctx={ctx}
        onCtx={upd => onModuleCtx && onModuleCtx(upd)}
        lists={lists}
        mode={mode}
      />
    );
  }

  // Pas de contexte → sélecteur (après les hooks)
  if (!hasCtx) {
    return (
      <window.ModuleCtxPicker
        lists={lists}
        onCtx={upd => onModuleCtx && onModuleCtx(upd)}
        title={view === 'regime' ? 'Régime & Structure' : 'Correlation Lab'}
        subtitle={view === 'regime'
          ? 'Situez la prime de corrélation dans son historique, la structure que la théorie favorise selon le régime, et la forme du skew/terme — pour une liste sélectionnée.'
          : 'Calculez la matrice de corrélation réalisée et la prime de corrélation implicite (via VIX) pour une liste sélectionnée.'}
      />
    );
  }

  const cellColor = (v) => {
    if (v >= 0.999) return 'var(--bg-elevated)';
    const t = Math.max(0, Math.min(1, (v - 0.3) / 0.5));
    return t < 0.5
      ? `rgba(38,166,154,${0.5 - t * 0.6 + 0.18})`
      : `rgba(239,83,80,${(t - 0.5) * 1.2 + 0.12})`;
  };

  if (loading) return window.DXLoader
    ? <window.DXLoader title="Chargement de la corrélation" steps={['Cours historiques…', 'Corrélation réalisée et implicite…']} />
    : <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Chargement…</div>;

  const C = data || {};
  // ρ implicite = vraie corrélation implicite CBOE (IV, vega-pondérée) si dispo,
  // sinon proxy VIX de l'endpoint matrice, sinon défaut. Cohérent score/finder.
  const rhoImpl = implRho != null ? implRho : (C.rho_impl ?? 0.52);
  const rhoReal = C.rho_real ?? 0.45;
  // Prime de corrélation = (ρ implicite − ρ̂ réalisée) en points.
  const prime = ((rhoImpl - rhoReal) * 100).toFixed(1);
  const matrixTickers = C.matrixTickers || ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META'];
  const rawMatrix = C.matrix;
  const matrix = Array.isArray(rawMatrix) ? rawMatrix
    : (rawMatrix?.values || matrixTickers.map((_, i) => matrixTickers.map((_, j) => i === j ? 1 : 0.45)));
  const history = C.history || [];

  // ── Playbook régime→structure (module A) : entrées 100 % dérivées de ce que le
  //    Lab calcule déjà — percentile de prime (régime) + skew/terme de la liste. ──
  const rgKey        = (ctx.listIndex || C.index || 'SPX').toUpperCase();
  const rgBase       = CORR_BASELINE[rgKey];
  const rgPremiumPts = (rhoImpl - rhoReal) * 100;
  const rgPremiumPct = rgBase ? pctRank(rgPremiumPts, rgBase.premiumPts) : null;
  const rgMap        = listCorrMap(matrixTickers, rgKey, rhoImpl) || CORR_MAP[rgKey] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Contexte liste */}
      {!embedded && lists && onModuleCtx && ctx.listId && (
        <window.ModuleCtxBar
          ctx={ctx}
          lists={lists}
          onCtx={upd => onModuleCtx(upd)}
          onClear={() => onModuleCtx({ listId: null, listName: null })}
        />
      )}

      {/* Header */}
      {!embedded && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>{view === 'regime' ? 'Régime & Structure' : 'Correlation Lab'}</h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0, maxWidth: 660 }}>
            {view === 'regime'
              ? 'Où se situe la prime dans son histoire, quelle structure la théorie favorise selon le régime, et comment la corrélation est façonnée (skew, terme). Un choix d\'exposition — pas une promesse de P&L.'
              : 'Le cœur de la stratégie : ce que le marché price (ρ implicite) face à ce qui a été observé (ρ̂ réalisée). L\'écart est la prime de corrélation.'}
          </p>
        </div>
        {listId && onNav && listIdParam && (
          <button onClick={() => onNav('list-detail', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>← Liste</button>
        )}
      </div>
      )}

      {/* Métriques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <MetricCard label="ρ implicite"         value={rhoImpl.toFixed(2)} accent="var(--accent)"
          hint="Corrélation « attendue » par le marché, déduite des IV d'options (indice vs composants, formule CBOE, vega-pondérée). Plus elle est élevée, plus le marché parie que les actions bougeront ensemble." />
        <MetricCard label="ρ̂ réalisée"          value={rhoReal.toFixed(2)} accent="var(--info)"
          hint="Corrélation réellement observée entre les composants sur la période récente (mesurée sur les cours). C'est le comportement passé." />
        <MetricCard label="Prime de corrélation" value={(prime >= 0 ? '+' : '') + prime} unit="pts" delta={C.delta || ''} accent="var(--pos)"
          hint="Écart entre corrélation implicite et réalisée (en points). Positif = le marché « sur-price » la corrélation → contexte favorable à une dispersion (on parie que les actions se décorrèlent)." />
        <MetricCard label="Lecture" value={parseFloat(prime) > 3 ? 'Favorable' : parseFloat(prime) > 0 ? 'Neutre' : 'Défavorable'}
          accent={parseFloat(prime) > 3 ? 'var(--pos)' : parseFloat(prime) > 0 ? 'var(--warn)' : 'var(--neg)'}
          hint="Synthèse du signal : Favorable si la prime dépasse ~3 pts, Neutre si elle est légèrement positive, Défavorable si négative." />
      </div>

      {/* ── Écran « Régime & Structure » : régime + playbook (+ skew/terme plus bas) ── */}
      {view === 'regime' && (<>
        {/* Régime : la prime du jour située dans son historique */}
        <CorrRegime premium={(rhoImpl - rhoReal) * 100} index={ctx.listIndex || C.index} mode={mode} onNav={onNav} />
        {/* Playbook : structure recommandée selon le régime + checklist de pré-trade */}
        <RegimePlaybook premiumPct={rgPremiumPct} premium={rgPremiumPts} skew={rgMap?.skew} term={rgMap?.term} mode={mode} onNav={onNav} listId={ctx.listId} />
      </>)}

      {/* ── Écran « Correlation Lab » : matrice, contribution, secteurs, historique ── */}
      {view !== 'regime' && (<>
      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          Une dispersion classique cherche une corrélation implicite supérieure à la réalisée : l'indice price une synchronisation plus forte que celle observée récemment. Plus la matrice est « froide » (ρ faibles, teintes teal), plus les composants bougent indépendamment.
        </BeginnerExplanationBox>
      )}

      {/* Matrice + Gauge */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16, alignItems: 'stretch' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Matrice de corrélation réalisée</h3>
            <Badge tone="neutral" size="sm">60 jours</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(${matrixTickers.length}, 1fr)`, gap: 3 }}>
            <div />
            {matrixTickers.map(t => <div key={t} style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 4 }}>{t}</div>)}
            {matrix.map((row, i) => (
              <React.Fragment key={i}>
                <div style={{ font: '600 9px/1 var(--font-mono)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>{matrixTickers[i]}</div>
                {row.map((v, j) => (
                  <div key={j} title={`${matrixTickers[i]} · ${matrixTickers[j]} = ${v.toFixed(2)}`}
                    style={{ aspectRatio: '1', borderRadius: 3, background: cellColor(v), display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 10px/1 var(--font-mono)', color: i === j ? 'var(--text-dim)' : 'var(--text)' }}>
                    {v.toFixed(2)}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--pos-bright)' }}>● ρ faible (favorable)</span>
            <span style={{ color: 'var(--neg-bright)' }}>● ρ élevée (risque)</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', justifyContent: 'center' }}>
            <PrimeGauge implied={rhoImpl} realized={rhoReal} size={240} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {parseFloat(prime) > 3 && <Badge tone="pos" dot>Prime élevée</Badge>}
            {parseFloat(prime) > 0 && <Badge tone="warn">Contexte favorable</Badge>}
            <Badge tone="neg">Risque sell-off corrélé</Badge>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, flex: 1, overflow: 'auto' }}>
            <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 4px' }}>Contribution à la prime</h3>
            <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 14px' }}>
              ρ implicite − ρ̄ du composant. Vert = apport positif à la dispersion.
            </p>
            <ContribChart matrixTickers={matrixTickers} matrix={matrix} rhoImpl={rhoImpl} />
          </div>
        </div>
      </div>

      {/* ── Décomposition sectorielle ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: '0 0 4px' }}>Décomposition sectorielle de la prime</h3>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 14px' }}>
          ρ̄ moyenne intra-secteur. Secteurs à ρ̄ basse = meilleurs contributeurs à la dispersion.
        </p>
        <SectorChart matrixTickers={matrixTickers} matrix={matrix} rhoImpl={rhoImpl} />
      </div>

      {/* Historique */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ font: 'var(--type-h3)', color: 'var(--text)', margin: 0 }}>Historique ρ implicite vs réalisée</h3>
          <div style={{ display: 'flex', gap: 16, font: 'var(--type-caption)' }}>
            <span style={{ color: 'var(--accent-hover)' }}>● implicite</span>
            <span style={{ color: 'var(--info)' }}>● réalisée</span>
          </div>
        </div>
        <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: '0 0 8px' }}>L'écart entre les deux courbes est la prime de corrélation.</p>
        {history.length >= 2 ? <HistoryChart data={history} /> : (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-dim)', font: 'var(--type-caption)' }}>Historique insuffisant (min. 2 fenêtres)</div>
        )}
      </div>
      </>)}

      {/* Structure de la corrélation (skew + terme) — écran « Régime & Structure » */}
      {view === 'regime' && (
      <CorrMap index={ctx.listIndex || C.index} mode={mode} tickers={matrixTickers} liveRho={rhoImpl} />
      )}

      {/* Le risque à garder en tête — tout en bas */}
      <WarningPanel tone="neg" title="Le risque à garder en tête">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div>Faire de la dispersion, c'est <strong>vendre de la corrélation</strong> : on parie que les actions bougent chacune de leur côté. Tant que le marché est calme, la prime se collecte tranquillement.</div>
          <div>Mais lors d'un <strong>sell-off corrélé</strong> (krach, panique), les actions chutent toutes ensemble : la corrélation <em>réalisée</em> bondit vers l'<em>implicite</em>, la prime se referme d'un coup, et la dispersion <strong>perd — parfois lourdement</strong>.</div>
          <div>{view === 'regime'
            ? <>C'est exactement ce que montre le <strong>skew</strong> juste au-dessus (la courbe « selon le scénario ») : le marché price déjà <strong>bien plus de corrélation sur la baisse</strong> (les puts, à −10 %) qu'à la monnaie. En vendant de la dispersion, vous êtes donc <strong>short ce risque de krach corrélé</strong> — vous touchez une prime pour porter précisément ce danger. Une prime positive est un point d'entrée potentiel, <strong>jamais une garantie</strong>.</>
            : <>C'est le <strong>skew</strong> de corrélation (écran <strong>Régime &amp; Structure</strong>) qui le montre : le marché price déjà <strong>bien plus de corrélation sur la baisse</strong> qu'à la monnaie. En vendant de la dispersion, vous êtes <strong>short ce risque de krach corrélé</strong> — une prime positive est un point d'entrée potentiel, <strong>jamais une garantie</strong>.</>}</div>
        </div>
      </WarningPanel>
    </div>
  );
}

function HistoryChart({ data }) {
  const w = 860, h = 200, padX = 36, padY = 24;
  const all = data.flatMap(p => [p.impl, p.real]);
  const min = Math.min(...all) - 0.04, max = Math.max(...all) + 0.04;
  const xs = i => padX + (i / (data.length - 1)) * (w - padX * 2);
  const ys = v => h - padY - ((v - min) / (max - min)) * (h - padY * 2);
  const line = key => data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(p[key])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="corrPremGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(38,166,154,0.20)" />
          <stop offset="100%" stopColor="rgba(38,166,154,0.01)" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(g => {
        const v = min + (max - min) * g;
        return (
          <g key={g}>
            <line x1={padX} y1={ys(v)} x2={w - padX} y2={ys(v)} stroke="var(--border-subtle)" />
            <text x={4} y={ys(v) + 3} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)">{v.toFixed(2)}</text>
          </g>
        );
      })}
      <path
        d={`${line('impl')} L ${xs(data.length - 1)} ${ys(data[data.length - 1].real)} ${[...data].reverse().map((p, i) => `L ${xs(data.length - 1 - i)} ${ys(p.real)}`).join(' ')} Z`}
        fill="url(#corrPremGrad)"
      />
      <path d={line('real')} fill="none" stroke="var(--info)" strokeWidth="2.5" />
      <path d={line('impl')} fill="none" stroke="var(--accent-hover)" strokeWidth="2.5" />
      {data.map((p, i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(p.impl)} r="2.5" fill="var(--accent-hover)" />
          <circle cx={xs(i)} cy={ys(p.real)} r="2.5" fill="var(--info)" />
          <text x={xs(i)} y={h - 5} fontSize="9" fontFamily="var(--font-mono)" fill="var(--text-dim)" textAnchor="middle">{p.d}</text>
        </g>
      ))}
    </svg>
  );
}

window.CorrelationLab = CorrelationLab;
