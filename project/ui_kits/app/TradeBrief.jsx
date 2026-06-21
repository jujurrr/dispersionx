// Trade Brief — final synthesis before save / manual execution. Report-grade.
function TradeBrief() {
  const D = window.DXData;
  const { Button, Badge, MetricCard, RiskBadge, WarningPanel, ScoreBadge } = window.DispersionXDesignSystem_cb86be;
  const L = D.legs;

  const Section = ({ n, title, children }) => (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ font: 'var(--type-data-sm)', color: 'var(--text-dim)' }}>{n}</span>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );

  const LegRow = ({ cols, head }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4,1fr)', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
      {cols.map((c, i) => (
        <span key={i} style={{
          font: head ? 'var(--type-label)' : (i === 0 ? 'var(--type-ticker)' : 'var(--type-data-sm)'),
          textTransform: head ? 'uppercase' : 'none', letterSpacing: head ? '0.06em' : 0,
          color: head ? 'var(--text-muted)' : (i === 0 ? 'var(--text)' : 'var(--text-soft)'),
          textAlign: i === 0 ? 'left' : 'right',
        }}>{c}</span>
      ))}
    </div>
  );

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 30 }}>
      {/* Report header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, borderBottom: '1px solid var(--border)', paddingBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: 0, whiteSpace: 'nowrap' }}>Trade Brief</h1>
            <Badge tone="info">Brouillon</Badge>
          </div>
          <div style={{ font: 'var(--type-data-sm)', color: 'var(--text-muted)', marginTop: 8 }}>SPX · dispersion · 31 DTE · échéance 21 nov. · généré le 20 juin 2026</div>
        </div>
        <ScoreBadge score={82} size="lg" />
      </div>

      {/* 1. Résumé en une phrase */}
      <Section n="01" title="Résumé">
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--radius)', padding: '16px 18px', font: 'var(--type-body)', fontSize: 16, lineHeight: 1.6, color: 'var(--text-soft)' }}>
          Vous <strong style={{ color: 'var(--text)' }}>vendez la volatilité de l'indice</strong> (short straddle SPX) et <strong style={{ color: 'var(--text)' }}>achetez la volatilité de 5 composants</strong> (long straddles). La stratégie est approximativement <strong style={{ color: 'var(--pos-bright)' }}>vega-neutral</strong> et <strong style={{ color: 'var(--text)' }}>short corrélation</strong> : elle profite si les composants se dispersent davantage que ce que l'indice price.
        </div>
      </Section>

      {/* 2. Construction */}
      <Section n="02" title="Construction">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 16, alignItems: 'start' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--neg-bright)' }}>Jambe indice · short</div>
            <LegRow head cols={['', 'Prime', 'Vega', 'Theta', 'Qté']} />
            <LegRow cols={[`${L.index.t} ${L.index.strike}`, L.index.prime, L.index.vega, L.index.theta, L.index.qty]} />
            <div style={{ padding: '12px 14px', font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{L.index.action} · {L.index.exp}</div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--pos-bright)' }}>Panier composants · long</div>
            <LegRow head cols={['', 'Prime', 'Vega', 'Theta', 'Qté']} />
            {L.basket.map((b) => <LegRow key={b.t} cols={[b.t, b.prime, b.vega, b.theta, b.qty]} />)}
          </div>
        </div>
        {/* Vega balance */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginTop: 14 }}>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>Équilibrage vega</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ font: 'var(--type-data-sm)', color: 'var(--neg-bright)', width: 110 }}>Indice −620</span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '49%', background: 'var(--neg)' }} />
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '46%', background: 'var(--pos)' }} />
              <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 2, background: 'var(--text)' }} />
            </div>
            <span style={{ font: 'var(--type-data-sm)', color: 'var(--pos-bright)', width: 130, textAlign: 'right' }}>Composants +572</span>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10 }}><Badge tone="pos" dot>Vega net −48 · quasi-neutre</Badge></div>
        </div>
      </Section>

      {/* 3 & 4 side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Section n="03" title="Pourquoi ce trade ?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {['Prime de corrélation positive (+6.4 pts)', 'ρ implicite (0.61) > ρ̂ réalisée (0.48)', 'Composants à faible ρ disponibles (TSLA, META)', 'Position quasi vega-neutral'].map((t) => (
              <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--pos-bright)', marginTop: 2, flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section n="04" title="Ce qui peut mal se passer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[['Sell-off corrélé', 'critique'], ['Vol crush sur les composants', 'élevé'], ['Theta négatif sur le panier', 'modéré'], ['Earnings AAPL pendant la vie du trade', 'modéré']].map(([t, lv]) => (
              <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
                <RiskBadge level={lv} size="sm" />
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* 5. Données clés */}
      <Section n="05" title="Données clés">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <MetricCard label="Prime ρ" value="+6.4" unit="pts" accent="var(--pos)" />
          <MetricCard label="Vega net" value="−48" accent="var(--pos)" />
          <MetricCard label="Theta /jour" value="+96" unit="$" accent="var(--warn)" />
          <MetricCard label="Prime nette" value="+1,240" unit="$" accent="var(--accent)" />
          <MetricCard label="Composants" value="5" accent="var(--info)" />
          <MetricCard label="Couverture indice" value="21" unit="%" accent="var(--info)" />
          <MetricCard label="Coût estimé" value="−310" unit="$" accent="var(--neg)" />
          <MetricCard label="Pire scénario" value="−3,420" unit="$" accent="var(--neg)" />
        </div>
      </Section>

      {/* 6. Checklist */}
      <Section n="06" title="Checklist avant exécution">
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '6px 16px' }}>
          {['IV vérifiée sur source réelle (IBKR) — actuellement estimée', 'Aucun earnings non désiré dans la fenêtre', 'Spread bid/ask acceptable sur chaque jambe', 'Vega net dans la tolérance cible', 'Scénario sell-off corrélé compris et accepté', 'Taille de position validée'].map((t, i) => (
            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < 5 ? '1px solid var(--border-subtle)' : 'none', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked={i > 0 && i < 4} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
              <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)' }}>{t}</span>
            </label>
          ))}
        </div>
        <WarningPanel tone="warn" title="Avant tout trade" style={{ marginTop: 12 }}>
          L'IV est actuellement estimée depuis la HV. Branchez IBKR pour des valeurs réelles avant de préparer l'exécution. Outil d'aide à la décision, pas un conseil financier.
        </WarningPanel>
      </Section>

      {/* 7. Export */}
      <Section n="07" title="Export & suite">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="primary" size="lg">Préparer pour exécution manuelle</Button>
          <Button variant="outline">Sauvegarder</Button>
          <Button variant="outline">Export PDF</Button>
          <Button variant="outline">Export CSV</Button>
          <Button variant="outline">Copier les jambes</Button>
          <Button variant="ghost">Ouvrir dans le monitor</Button>
        </div>
      </Section>
    </div>
  );
}

Object.assign(window, { TradeBrief });
