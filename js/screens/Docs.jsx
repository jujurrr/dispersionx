/* ─── Docs: formulas & reference ────────────────────────────────── */
function Docs({ mode }) {
  const { BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;

  const formulas = [
    { title: 'ρ implicite (vs indice)', formula: 'ρᵢ,ₘ = βᵢ × σ_indice / σᵢ' },
    { title: 'Correction ex-action', formula: 'ρᵢ,₋ᵢ = (ρᵢ,ₘ·σ_m − wᵢ·σᵢ) / √(σ_m² − 2wᵢρᵢ,ₘσᵢσ_m + wᵢ²σᵢ²)' },
    { title: 'ρ̂ réalisée (multi-fenêtre)', formula: 'ρ̂ = régime × Σₖ wₖ · ρₖ,₋ᵢ ,  k ∈ {20,60,120,252}j' },
    { title: 'Facteur de régime', formula: 'régime = 1 + sensibilité × (IV_actuel / IV_moy_1Y − 1)' },
    { title: 'Edge', formula: 'Edge = ρ_implicite,₋ᵢ − ρ̂_réalisée' },
    { title: 'Score V1 — pondéré (0–100)', formula: 'V1 = 0,45·corr + 0,20·IV-rank + 0,15·events + 0,10·idio + 0,10·liquidité' },
    { title: 'Score V2 — porte × qualité', formula: 'V2 = porte(corr) × [0,6·IV-rank + 0,4·idio]' },
    { title: 'Score ALT — vol idio − coût (exp.)', formula: 'ALT = perc( z(vol idio réalisée) − z(coût) )' },
    { title: 'Dispersion (Cboe)', formula: 'D = Σ wᵢ σᵢ² − σ²_indice' },
    { title: 'ρ̄ moyen (Markowitz)', formula: 'ρ̄ = (σ²_idx − Σ wᵢ²σᵢ²) / (2 Σᵢ<ⱼ wᵢ wⱼ σᵢ σⱼ)' },
  ];

  // Seuils de BADGE par modèle (0–100). Alignés sur js/store.js (ALT_TH / getScoreModel) et
  // api/stocks/auto-score.js. Le COÛT d'exécution est délibérément HORS du score (l'y intégrer
  // dégradait le classement — testé) : il est affiché à part, car c'est lui qui décide du P&L net.
  const scoreModels = [
    { model: 'V1 — pondéré (historique)', fort: '≥ 75', mod: '≥ 55', scale: 'Somme de 5 sous-scores (corrélation, IV-rank, events, idio, liquidité), 0–100.' },
    { model: 'V2 — porte × qualité', fort: '≥ 62', mod: '≥ 19', scale: 'Porte de corrélation × qualité. Distribution basse (médiane ~5 vs ~46 en V1) → mêmes couleurs, cutoffs différents.' },
    { model: 'ALT — vol idio − coût (exp.)', fort: '≥ 90', mod: '≥ 65', scale: 'Rang percentile de « vol idio réalisée − coût » dans l’indice (cross-sectionnel — cf. section ALT plus bas).' },
  ];

  const sources = [
    { status: 'Volatilité implicite & HV', desc: 'Cboe (cotations différées ~15 min) : IV ATM réelle par échéance, interpolée en variance au DTE choisi. Indices US en direct ; CAC 40 / DAX 40 via ETF proxy (EWQ, EWG) remis à l\'échelle. Les composants européens sans options US sont estimés (décroissance temporelle).' },
    { status: 'Grecs (Δ, Γ, vega, theta)', desc: 'Calculés en Black-Scholes sur straddle ATM (strike fixe), à partir du spot et de l\'IV réels. Le delta net part ~neutre et dérive avec le sous-jacent (gamma).' },
    { status: 'Prix', desc: 'Yahoo Finance (clôtures + variations jour / semaine) et Finnhub (quasi temps réel), agrégés. Données différées — usage pédagogique.' },
    { status: 'Corrélation', desc: 'ρ implicite (baromètre ~2 ans + rang percentile) vs ρ̂ réalisée multi-fenêtre (20 / 60 / 120 / 252 j) ; prime de corrélation et z-score.' },
    { status: 'Résultats (earnings)', desc: 'Calendrier des résultats à venir — avertissement quand une date tombe dans la fenêtre de la stratégie.' },
    { status: 'Suivi mark-to-market', desc: 'Reprise des positions au marché réel (spot + IV Cboe) : P&L, grecs nets, snapshots quotidiens et courbe d\'évolution du P&L.' },
  ];

  // ── Brique 5 : la chaîne de valeur de la corrélation (qui vend quoi, à qui) ──
  // Source : backtest/ECONOMIE_CORRELATION.md §2. C'est CE tableau qui explique
  // pourquoi la prime existe : chaque acteur passe un risque au suivant.
  const chain = [
    { who: 'Le particulier', role: "achète un autocallable (produit structuré) — donc vend, sans le savoir, une assurance sur le pire sous-jacent du panier", gain: 'encaisse un gros coupon', lose: 'perd si le panier casse sa barrière (krach corrélé)' },
    { who: 'La banque', role: "structure le produit et se retrouve mécaniquement exposée à la corrélation qu'elle vient de fabriquer", gain: 'frais de structuration + spread', lose: 'doit racheter de la corrélation, parfois en urgence' },
    { who: 'Les fonds de dispersion', role: "vendent cette corrélation à la banque — c'est l'entrepôt naturel du risque", gain: 'la prime de corrélation', lose: 'perdent gros dans un vrai krach corrélé' },
    { who: 'Les teneurs de marché', role: 'fournissent la liquidité sur chaque jambe', gain: "encaissent le spread — celui que nous, nous PAYONS", lose: 'risque d\'inventaire' },
  ];

  // ── Brique 9 : les 4 angles testés et ce qui tue chacun ──
  // Source : backtest/DISPERSION_SYNTHESE.md. Chiffres mesurés sur ThetaData
  // 2022-2026 (501 noms, spread réel), PAS supposés.
  const angles = [
    { angle: 'À la monnaie (ATM)', prime: 'mince', killer: 'Le COÛT réel', detail: "L'écart achat/vente est ~19× plus large sur un composant que sur l'ETF d'indice (0,62 % vs 11,8 % sur le straddle 30 j réellement tradé). Le seuil de rentabilité impose de tenir 5 à 56 semaines une option de 30 jours." },
    { angle: 'Skew (baisse)', prime: 'grande — ρ 0,44 anticipé vs 0,17 réalisé', killer: 'La QUEUE non réalisée', detail: "Vendre la corrélation à la baisse, c'est vendre l'assurance-krach. Notre fenêtre 2022-2026 ne contient aucun krach de corrélation : la prime paraît gratuite parce que le sinistre n'est jamais venu." },
    { angle: 'Flux (gamma des teneurs)', prime: 'signal réel isolément', killer: 'REDONDANT avec le niveau de vol', detail: "Le signal meurt dès qu'on contrôle la volatilité implicite : il ne fait que repérer les périodes calmes, ce qu'un simple filtre de vol fait gratuitement." },
    { angle: 'Structure par terme', prime: 'prime ×5 sur le long terme', killer: 'PAS indépendante du niveau', detail: "La pente ne porte pas d'information propre, et la prime longue est une assurance-krach à un an : statistiquement, on ne dispose que de 4-5 observations vraiment indépendantes." },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Formules & référence</h1>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>
          Les mathématiques et les données réelles derrière le scoring de dispersion de DispersionX — puis,
          plus bas, <strong style={{ color: 'var(--text-soft)' }}>pourquoi la prime de corrélation existe</strong> et
          {' '}<strong style={{ color: 'var(--text-soft)' }}>ce que nos propres tests ont trouvé</strong>, y compris ce qui ne marche pas.
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

      {/* Seuils de signal — par MODÈLE (0–100), coût EXCLU du score */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Seuils de signal</h2>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '0 0 14px', maxWidth: 820 }}>
          Le score est sur <strong style={{ color: 'var(--text-soft)' }}>0–100</strong> (plus haut = meilleur candidat de dispersion). Trois modèles coexistent, sélectionnables dans <strong style={{ color: 'var(--text-soft)' }}>Préférences → Modèle de score</strong> ; chacun a ses propres seuils de badge. Le <strong style={{ color: 'var(--text-soft)' }}>coût d'exécution est volontairement hors du score</strong> — l'y intégrer dégradait le classement dans nos tests ; on l'affiche à part, car c'est lui qui décide du P&L net.
        </p>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                {['Modèle', 'Badge FORT', 'MODÉRÉ', 'Échelle'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scoreModels.map((m, i) => (
                <tr key={m.model} style={{ borderBottom: i < scoreModels.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '11px 14px', font: 'var(--type-body-sm)', fontWeight: 600, color: 'var(--text)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{m.model}</td>
                  <td style={{ padding: '11px 14px', font: '600 13px/1 var(--font-mono)', color: 'var(--pos-bright)', verticalAlign: 'top' }}>{m.fort}</td>
                  <td style={{ padding: '11px 14px', font: '600 13px/1 var(--font-mono)', color: 'var(--accent-hover)', verticalAlign: 'top' }}>{m.mod}</td>
                  <td style={{ padding: '11px 14px', font: 'var(--type-caption)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{m.scale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data sources roadmap */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 14px' }}>Sources de données & couverture</h2>
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

      {/* ═══ Brique 5 — Comprendre la prime de corrélation (l'histoire économique) ═══ */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Comprendre la prime de corrélation</h2>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: '0 0 16px', maxWidth: 780 }}>
          Pourquoi le marché paie-t-il pour vendre de la corrélation ? Parce que quelqu'un, en amont, a besoin
          d'en racheter. Cette prime n'est pas une erreur de marché à arbitrer : c'est une <strong style={{ color: 'var(--text-soft)' }}>rémunération pour un service</strong>.
        </p>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 14, borderLeft: '3px solid var(--accent)' }}>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>L'origine : les produits structurés</div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-soft)', margin: 0, lineHeight: 1.65 }}>
            Des particuliers achètent, partout dans le monde, des <strong style={{ color: 'var(--text)' }}>autocallables</strong> — ces
            produits qui promettent un gros coupon tant qu'un panier d'actions ne s'effondre pas (marché mondial ≈ 127 Md$).
            En les achetant, ils <strong style={{ color: 'var(--text)' }}>vendent en réalité une assurance</strong> sur le pire titre du panier.
            La banque qui structure le produit se retrouve alors, mécaniquement, exposée à la corrélation : si tout tombe
            ensemble, sa couverture se retourne. Elle doit donc <strong style={{ color: 'var(--accent-hover)' }}>racheter de la corrélation</strong> —
            et ce sont les fonds de dispersion qui la lui vendent, contre une prime. <strong style={{ color: 'var(--text)' }}>Cette prime, c'est le prix
            de ce service</strong>, pas un cadeau.
          </p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflowX: 'auto', marginBottom: 14 }}>
          <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                {['Acteur', 'Son rôle sur la corrélation', 'Il gagne', 'Il perd'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chain.map((c, i) => (
                <tr key={c.who} style={{ borderBottom: i < chain.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <td style={{ padding: '11px 14px', font: 'var(--type-body-sm)', fontWeight: 600, color: 'var(--text)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{c.who}</td>
                  <td style={{ padding: '11px 14px', font: 'var(--type-body-sm)', color: 'var(--text-soft)', lineHeight: 1.5 }}>{c.role}</td>
                  <td style={{ padding: '11px 14px', font: 'var(--type-caption)', color: 'var(--pos-bright)', verticalAlign: 'top', lineHeight: 1.5 }}>{c.gain}</td>
                  <td style={{ padding: '11px 14px', font: 'var(--type-caption)', color: 'var(--neg-bright)', verticalAlign: 'top', lineHeight: 1.5 }}>{c.lose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 6 }}>Pourquoi elle ne disparaît pas</div>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              Depuis 2008, la réglementation bancaire (Bâle III) rend très coûteux, en capital, le fait de porter ce
              risque. Les banques exigent donc <strong style={{ color: 'var(--text-soft)' }}>davantage</strong> de compensation pour le garder — et la prime
              persiste au lieu d'être arbitrée jusqu'à zéro. Elle peut même s'élargir quand les bilans sont sous tension.
            </p>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 6 }}>Où votre place se situe</div>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              Dans cette chaîne, un particulier qui fait de la dispersion tient le rôle du <strong style={{ color: 'var(--text-soft)' }}>fonds de
              dispersion</strong> : l'entrepôt du risque. Ce n'est donc pas un repas gratuit — c'est une prime de risque
              assumée, à dimensionner en sachant qu'on est vendeur du krach corrélé.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ Brique 9 — La fiche vérité : ce que nos tests ont réellement trouvé ═══ */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>La fiche vérité de la dispersion</h2>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: '0 0 16px', maxWidth: 780 }}>
          Ce que nous avons testé, ce que nous avons trouvé, et ce qui ne marche pas. Nous publions ce bilan
          parce qu'un outil qui ne montre que ses bons résultats ne mérite pas votre confiance.
        </p>

        <div style={{ background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 14 }}>
          <div style={{ font: 'var(--type-title)', color: 'var(--warn)', marginBottom: 6 }}>Le verdict, sans détour</div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-soft)', margin: 0, lineHeight: 1.65 }}>
            Sur données d'options réelles (2022-2026, 501 titres, coûts <em>mesurés</em> et non supposés), nous n'avons
            trouvé <strong style={{ color: 'var(--text)' }}>aucun gain net robuste</strong> — et c'est le résultat qu'il fallait attendre.
            La dispersion est une prime de risque, pas une inefficience : un résultat net proche de zéro après coûts est
            la signature d'un marché qui fonctionne. <strong style={{ color: 'var(--text)' }}>Ce site ne vend donc pas un signal qui imprime</strong> ;
            il vous donne une carte de là où le marché paie, ce que ça coûte, et le risque réellement pris.
          </p>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ padding: '10px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', font: '600 9px/1 var(--font-mono)', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Les 4 façons d'aborder la dispersion — et ce qui tue chacune
          </div>
          {angles.map((a, i) => (
            <div key={a.angle} style={{ padding: '14px 16px', borderBottom: i < angles.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 5 }}>
                <span style={{ font: 'var(--type-title)', color: 'var(--text)' }}>{a.angle}</span>
                <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)' }}>prime brute : {a.prime}</span>
                <span style={{ font: '600 10px/1 var(--font-mono)', padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--neg-soft)', color: 'var(--neg-bright)', border: '1px solid var(--neg)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{a.killer}</span>
              </div>
              <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{a.detail}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 6 }}>Ce que dit la littérature</div>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              Les études publiées trouvent une dispersion positive, mais avec un rapport rendement/risque de
              <strong style={{ color: 'var(--text-soft)' }}> 0,34 à 0,82</strong> — l'ordre de grandeur d'une prime de risque, pas d'un alpha. Plusieurs
              précisent que <strong style={{ color: 'var(--text-soft)' }}>seul un teneur de marché</strong> aurait pu capter le résultat annoncé, une fois
              les frais d'exécution comptés. Nos chiffres disent la même chose.
            </p>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 6 }}>Le vrai levier : l'exécution</div>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              Le teneur de marché <em>encaisse</em> l'écart achat/vente ; nous le <em>payons</em>. C'est là, et non dans une
              formule, que se joue la différence. D'où le curseur d'exécution du module Construction : mieux exécuter est
              le seul levier réellement à votre portée.
            </p>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 6 }}>Le biais de notre échantillon</div>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              2022-2026 ne contient <strong style={{ color: 'var(--text-soft)' }}>aucun krach de corrélation</strong> de type 2008 ou 2020. Autrement dit,
              la prime encaissée n'a jamais eu à payer le sinistre qu'elle assure. Tout backtest flatteur sur cette
              fenêtre l'est <em>parce que</em> l'événement n'est pas venu — y compris les nôtres.
            </p>
          </div>
        </div>

        <p style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', margin: '12px 0 0', lineHeight: 1.6 }}>
          Méthode : options réelles par strike et échéance (2022-2026), écarts achat/vente mesurés, sélection à la date
          (sans regarder l'avenir), contrôle du niveau de volatilité, correction de l'autocorrélation, examen des
          sous-périodes de stress. Les chiffres brillants croisés en route (paniers à ratio 4, corrélation-swap à 13)
          se sont tous révélés être des artefacts de sélection ou de queue non réalisée.
        </p>
      </section>

      {/* ═══ Le modèle ALT (expérimental) — vol idio bon marché, couvert net sur l'indice ═══ */}
      <section>
        <h2 style={{ font: 'var(--type-h2)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>Le modèle ALT — vol idio bon marché (expérimental)</h2>
        <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: '0 0 16px', maxWidth: 780 }}>
          Un second modèle de score, activable dans <strong style={{ color: 'var(--text-soft)' }}>Préférences → Modèle de score</strong>.
          Il classe les composants autrement — et, jugé en dollars sur options réelles, mieux que le modèle par défaut. C'est un{' '}
          <strong style={{ color: 'var(--text)' }}>facteur expérimental</strong>, en cours de validation en conditions réelles.
        </p>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 14 }}>
          <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 6 }}>Ce qu'il note, et pourquoi</div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-soft)', margin: '0 0 8px', lineHeight: 1.65 }}>
            <strong style={{ color: 'var(--text)' }}>ALT = rang de « vol idiosyncratique réalisée − coût d'exécution »</strong> parmi les titres de l'indice,{' '}
            <strong style={{ color: 'var(--text)' }}>sans prime de corrélation</strong>. L'idée : privilégier les actions qui bougent
            beaucoup <em>indépendamment</em> de l'indice (elles font payer le straddle long) et dont les options sont peu chères à trader.
          </p>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            Pourquoi retirer la prime de corrélation ? Parce que, mesurée en <em>dollars</em> sur options réelles, elle prédit
            bien la corrélation future mais <strong style={{ color: 'var(--text-soft)' }}>pas le gain</strong> — alors que « bouge beaucoup, pas cher »
            le prédit mieux. Dans nos backtests, ALT bat le modèle par défaut de façon significative.
          </p>
        </div>

        {/* LE point pratique — le hedge net sur l'indice, mis en avant */}
        <div style={{ background: 'var(--pos-soft)', border: '1px solid var(--pos)', borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 14 }}>
          <div style={{ font: 'var(--type-title)', color: 'var(--pos-bright)', marginBottom: 6 }}>À trader delta-hedgé NET sur l'indice — pas jambe par jambe</div>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-soft)', margin: 0, lineHeight: 1.65 }}>
            C'est le complément indispensable, et il change tout. Couvrir chaque action avec son propre titre retire justement
            l'<em>idiosyncratique</em> — le rendement même de la dispersion — et coûte cher (~20 instruments à rééquilibrer). Il faut
            neutraliser le <strong style={{ color: 'var(--text)' }}>delta-dollar NET de toute la position avec une seule position indice</strong>{' '}
            (l'ETF SPY/QQQ) : on garde l'exposition idiosyncratique (le payoff), on ne couvre que le risque de marché, pour un coût
            minime. Dans nos tests, c'est ce qui fait passer ALT de « bon signal » à réellement <strong style={{ color: 'var(--text)' }}>tradeable</strong>.
          </p>
        </div>

        <div style={{ background: 'var(--warn-soft)', border: '1px solid var(--warn)', borderRadius: 'var(--radius-lg)', padding: 18 }}>
          <div style={{ font: 'var(--type-title)', color: 'var(--warn)', marginBottom: 6 }}>Ce que ce n'est PAS</div>
          <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', margin: 0, lineHeight: 1.6 }}>
            Pas une promesse de rendement. ALT est un <strong style={{ color: 'var(--text)' }}>facteur régime-sensible</strong> (long vol
            idiosyncratique), fort quand cette vol est récompensée, tiède sinon. Son edge est réel dans nos backtests <em>in-sample</em>,
            mais reste à confirmer en <strong style={{ color: 'var(--text-soft)' }}>forward</strong> — le seul vrai test hors-échantillon ; notre
            univers a de plus un biais de survivance (les sociétés disparues n'y figurent pas). À manier comme une hypothèse, jamais comme un signal d'achat.
          </p>
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
