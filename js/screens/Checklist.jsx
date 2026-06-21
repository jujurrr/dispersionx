/* ─── Trade Checklist: validate before committing a position ──── */
function Checklist({ listId, onNav, addToast, mode }) {
  const { WarningPanel, BeginnerExplanationBox } = window.DispersionXDesignSystem_cb86be;
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [listName, setListName] = React.useState('');
  const [commitName, setCommitName] = React.useState('');
  const [checked, setChecked] = React.useState({});
  const [committing, setCommitting] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      DXApi.getList(listId).catch(() => ({ name: `Liste ${listId}` })),
      DXApi.getChecklist(listId).catch(() => null),
    ]).then(([list, cl]) => {
      setListName(list?.name || `Liste ${listId}`);
      setData(cl);
      setLoading(false);
    });
  }, [listId]);

  function toggleCheck(key) {
    setChecked(c => ({ ...c, [key]: !c[key] }));
  }

  async function handleCommit() {
    setCommitting(true);
    try {
      const res = await DXApi.commitPosition(listId, commitName || null);
      addToast && addToast('Position créée et suivie.', 'ok');
      onNav('monitor-list', { listId });
    } catch (err) {
      addToast && addToast(`Erreur : ${err.message}`, 'error');
    } finally {
      setCommitting(false);
    }
  }

  if (loading) return (
    <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)', font: 'var(--type-body)' }}>Évaluation de la checklist…</div>
  );

  // Normalise data shape — real API vs mock
  const sections = data
    ? [
        { title: 'Données', checks: data.data || normaliseSection(data?.sections?.find(s => s.name === 'Données')) },
        { title: 'Construction', checks: data.construction || normaliseSection(data?.sections?.find(s => s.name === 'Construction')) },
        { title: 'Risque', checks: data.risk || normaliseSection(data?.sections?.find(s => s.name === 'Risque')) },
      ]
    : [];

  const validations = data?.validations || [
    { key: 'understand_risk', label: "J'ai compris les risques identifiés dans le Risk Lab." },
    { key: 'checked_data', label: "Les données d'options (IV, greeks) sont récentes et vérifiées." },
    { key: 'no_earnings', label: "Aucun earnings majeur ne survient pendant la durée de la stratégie." },
    { key: 'risk_ok', label: "La perte maximale en scénario de stress est acceptable pour mon portefeuille." },
  ];

  const sm = data?.summary || { n_ok: 0, n_warn: 0, n_fail: 0 };
  const allValidated = validations.every(v => checked[v.key]);
  const hasBlockers = (sm.n_fail || 0) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ font: 'var(--type-h1)', letterSpacing: 'var(--track-snug)', color: 'var(--text)', margin: '0 0 6px' }}>
            Trade Checklist — {listName}
          </h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: 0 }}>
            {sm.n_ok || 0} OK · {sm.n_warn || 0} avertissement(s) · {sm.n_fail || 0} bloquant(s). Validez avant de committer.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onNav('risk', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
            ← Risk Lab
          </button>
          <button onClick={() => onNav('monitor-list', { listId })}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>
            Positions suivies →
          </button>
        </div>
      </div>

      {/* Sections */}
      {sections.map(sec => (
        <CheckSection key={sec.title} title={sec.title} checks={sec.checks || []} />
      ))}

      {/* Validation box */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
        <div style={{ font: 'var(--type-title)', color: 'var(--text)', marginBottom: 4 }}>Confirmation — cochez pour valider</div>
        <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', marginBottom: 16 }}>
          Toutes les cases doivent être cochées pour committer la position au suivi.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {validations.map(v => (
            <label key={v.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
              <div onClick={() => toggleCheck(v.key)} style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                background: checked[v.key] ? 'var(--accent)' : 'var(--bg-elevated)',
                border: `2px solid ${checked[v.key] ? 'var(--accent)' : 'var(--border-strong)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all var(--dur-fast) var(--ease)', cursor: 'pointer',
              }}>
                {checked[v.key] && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-soft)', lineHeight: 1.5 }}>{v.label}</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={commitName}
            onChange={e => setCommitName(e.target.value)}
            placeholder="Nom de la position (optionnel)"
            style={{
              flex: 1, minWidth: 200, background: 'var(--bg-base)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)',
              font: 'var(--type-body-sm)',
            }}
          />
          <button
            onClick={handleCommit}
            disabled={!allValidated || committing}
            style={{
              font: '600 13px/1 var(--font-sans)', padding: '9px 20px', borderRadius: 'var(--radius)',
              border: 'none', cursor: allValidated ? 'pointer' : 'not-allowed',
              background: allValidated ? 'var(--accent)' : 'var(--bg-elevated)',
              color: allValidated ? '#fff' : 'var(--text-dim)',
              transition: 'all var(--dur-fast) var(--ease)',
              opacity: committing ? 0.6 : 1,
            }}>
            {committing ? 'Committing…' : 'Suivre cette stratégie'}
          </button>
        </div>

        {hasBlockers && (
          <div style={{ marginTop: 12, font: 'var(--type-body-sm)', color: 'var(--neg-bright)' }}>
            ⚠ {sm.n_fail} point(s) bloquant(s) détecté(s) — vérifiez les sections ci-dessus.
          </div>
        )}
      </div>

      {mode === 'Débutant' && (
        <BeginnerExplanationBox>
          La checklist vérifie automatiquement que la stratégie est bien construite, que les données sont disponibles et que les risques identifiés sont acceptables. Toutes les cases manuelles doivent être cochées pour confirmer que vous avez pris connaissance des risques.
        </BeginnerExplanationBox>
      )}
    </div>
  );
}

function CheckSection({ title, checks }) {
  const statusMap = {
    ok: { icon: '✓', color: 'var(--pos-bright)' },
    warn: { icon: '⚠', color: 'var(--warn)' },
    fail: { icon: '✗', color: 'var(--neg-bright)' },
    manual: { icon: '○', color: 'var(--text-muted)' },
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
        {title}
      </div>
      <div style={{ padding: '8px 0' }}>
        {checks.map((c, i) => {
          // Handle both real API shape {status,label,detail} and mock shape {text,ok,warn}
          const status = c.status || (c.ok ? 'ok' : c.warn ? 'warn' : 'manual');
          const label = c.label || c.text || '';
          const detail = c.detail || '';
          const { icon, color } = statusMap[status] || statusMap.manual;
          return (
            <div key={c.id || i} style={{ display: 'flex', gap: 14, padding: '10px 20px', borderBottom: i < checks.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <span style={{ color, fontWeight: 700, flexShrink: 0, width: 16, textAlign: 'center', marginTop: 1 }}>{icon}</span>
              <div>
                <div style={{ font: 'var(--type-body-sm)', color: 'var(--text)', fontWeight: 500 }}>{label}</div>
                {detail && <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>{detail}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normaliseSection(sec) {
  if (!sec) return [];
  return (sec.checks || []).map(c => ({
    status: c.ok ? 'ok' : c.warn ? 'warn' : 'manual',
    label: c.text,
    detail: '',
  }));
}

window.Checklist = Checklist;
