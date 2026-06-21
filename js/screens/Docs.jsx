/* ─── Docs: formulas & reference ────────────────────────────────── */
function Docs({ mode }) {
  const { BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;

  const formulas = [
    { title: 'ρ implicite (vs indice)', formula: 'ρᵢ,ₘ = βᵢ × σ_indice / σᵢ' },
    { title: 'Correction ex-action', formula: 'ρᵢ,₋ᵢ = (ρᵢ,ₘ·σ_m − wᵢ·σᵢ) / √(σ_m² − 2wᵢρᵢ,ₘσᵢσ_m + wᵢ²σᵢ²)' },
    { title: 'ρ̂ réalisée (multi-fenêtre)', formula: 'ρ̂ = régime × Σₖ wₖ · ρₖ,₋ᵢ ,  k ∈ {20,60,120,252}j' },
    { title: 'Facteur de régime', formula: 'régime = 1 + sensibilité × (IV_actuel / IV_moy_1Y − 1)' },
    { title: 'Edge', formula: 'Edge = ρ_implicite,₋ᵢ − ρ̂_réalisée' },
    { title: 'Score', formula: 'Score = Edge + (HV − IV) − coûts' },
    { title: 'Dispersion (Cboe)', formula: 'D = Σ wᵢ σᵢ² − σ²_indice' },
    { title: 'ρ̄ moyen (Markowitz)', formula: 'ρ̄ = (σ²_idx − Σ wᵢ²σᵢ²) / (2 Σᵢ<ⱼ wᵢ wⱼ σᵢ σⱼ)' },
  ];

  const thresholds = [
    { range: 'Score > +10', label: 'FORT', desc: 'Signal long dispersion confirmé', color: 'var(--pos-bright)', bg: 'var(--pos-soft)' },
    { range: '+4 à +10', label: 'MODÉRÉ', desc: 'Opportunité à surveiller', color: 'var(--accent-hover)', bg: 'var(--accent-soft)' },
    { range: '0 à +4', label: 'FAIBLE', desc: 'Insuffisant pour initier', color: 'var(--warn)', bg: 'var(--warn-soft)' },
    { range: '< 0', label: 'NÉGATIF', desc: 'Coûts > primes', color: 'var(--neg-bright)', bg: 'var(--neg-soft)' },
  ];

  const sources = [
    { status: 'Actuel', desc: 'yfinance (prix EOD), IV estimée depuis HV×1.10, earnings best-effort.' },
    { status: 'V2 (IBKR)', desc: 'IV ATM réelle, grecs (delta/gamma/theta/vega), chaînes d\'options, straddles.' },
    { status: 'Options (IV, Greeks, HV)', desc: 'MarketData.app (plan gratuit 100 req/jour) en priorité, IBKR en secours.' },
    { status: 'Prix temps réel', desc: 'Finnhub + yfinance (variations jour/semaine).' },
    { status: 'Autres', desc: 'Financial Modeling Prep (earnings), Polygon (optionnel). Configurez la clé API en variable d\'environnement et l\'agrégateur la détectera automatiquement.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Formules de référence</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>
          Les mathématiques derrière le scoring de dispersion d'DispersionX.
        </p>
      </div>

      {/* Formulas grid */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Formules fondamentales</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {formulas.map((f, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ font: 'var(--type-title)', color: 'var(--text-soft)', marginBottom: 10 }}>{f.title}</div>
              <div style={{ font: '13px/1.6 var(--font-mono)', color: 'var(--accent-hover)', background: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', wordBreak: 'break-all' }}>
                {f.formula}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Thresholds */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Seuils de signal</h2>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {thresholds.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: i < thresholds.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: t.color }} />
              <div style={{ flex: 1 }}>
                <span style={{ font: '600 13px/1 var(--font-mono)', color: t.color }}>{t.range}</span>
                <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', marginLeft: 10 }}>— </span>
                <span style={{ font: '600 12px/1 var(--font-sans)', color: t.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.label}</span>
              </div>
              <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', textAlign: 'right' }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Data sources roadmap */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Roadmap des sources de données</h2>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {sources.map((s, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: i < sources.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ font: 'var(--type-title)', color: 'var(--accent-hover)', marginBottom: 4 }}>{s.status}</div>
              <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Workflow de dispersion</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {[
            ['1', 'Choisir un indice', 'Sélectionner l\'indice ou ETF proxy'],
            ['2', 'Analyser les composants', 'Score de dispersion par action'],
            ['3', 'Construire une liste', 'Grouper les composants retenus'],
            ['4', 'Corrélation Lab', 'Mesurer ρ implicite vs ρ̂ réalisée'],
            ['5', 'Strategy Builder', 'Calculer les jambes et le sizing'],
            ['6', 'Risk Lab', 'Stress-tester la stratégie'],
            ['7', 'Checklist & Suivi', 'Valider et committer la position'],
          ].map(([n, title, desc]) => (
            <div key={n} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 11px/1 var(--font-mono)', color: 'var(--accent-hover)', flexShrink: 0 }}>{n}</span>
                <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{title}</span>
              </div>
              <p style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          La prime de corrélation (ρ_implicite − ρ̂_réalisée) est le cœur du signal de dispersion. Quand le marché price une corrélation plus forte que celle observée historiquement, il y a une opportunité : vendre la vol implicite de l'indice et acheter celle des composants.
        </BeginnerExplanationBox>
      )}
    </div>
  );
}

window.Docs = Docs;
