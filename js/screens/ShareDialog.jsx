/* ─── ShareDialog : modale de partage réutilisable (liste OU construction) ────
   Partage par e-mail (rôle lecture/modif) + par lien. Réutilisée par Lists,
   Construction et StrategyMonitor. Partager une construction = partager sa liste
   (la construction et le Risk Lab suivent via la RLS des tables strategies).
   Props : { list:{id,name}, onClose, addToast, kind:'list'|'construction' } */
function ShareDialog({ list, onClose, addToast, kind }) {
  const [shareEmail, setShareEmail] = React.useState('');
  const [shareRole, setShareRole] = React.useState('viewer');
  const [shareRows, setShareRows] = React.useState([]);
  const [sharing, setSharing] = React.useState(false);
  const [shareLinks, setShareLinks] = React.useState([]);
  const [linkRole, setLinkRole] = React.useState('viewer');
  const [newLink, setNewLink] = React.useState('');
  const [genLoading, setGenLoading] = React.useState(false);

  const listId = list && list.id;
  const toast = (m, t) => addToast && addToast(m, t);
  function loadRows() { DXApi.getListShares(listId).then(setShareRows).catch(() => setShareRows([])); }
  function loadLinks() { DXApi.getShareLinks(listId).then(setShareLinks).catch(() => setShareLinks([])); }
  React.useEffect(() => { if (listId) { loadRows(); loadLinks(); } /* eslint-disable-line */ }, [listId]);

  const shareErr = (err) => {
    const m = String(err?.message || '');
    if (m.includes('user_not_found')) return 'aucun compte avec cet e-mail.';
    if (m.includes('recipient_not_pro')) return 'ce compte n\'a pas l\'offre Pro — le partage est réservé aux comptes Pro.';
    if (m.includes('not_owner')) return 'vous n\'êtes pas propriétaire.';
    if (m.includes('cannot_share_self')) return 'c\'est déjà à vous.';
    if (m.includes('bad_role')) return 'rôle invalide.';
    return m || 'erreur inconnue.';
  };
  async function submitShare(e) {
    e.preventDefault();
    if (!shareEmail.trim() || !listId) return;
    setSharing(true);
    try {
      await DXApi.shareList(listId, shareEmail.trim(), shareRole);
      toast(`Partagé avec ${shareEmail.trim()}.`);
      setShareEmail(''); loadRows();
    } catch (err) { toast('Partage impossible : ' + shareErr(err), 'error'); }
    finally { setSharing(false); }
  }
  async function changeShareRole(row, role) {
    try { await DXApi.setShareRole(row.id, role); loadRows(); }
    catch (err) { toast('Erreur : ' + shareErr(err), 'error'); }
  }
  async function revokeShareRow(row) {
    try { await DXApi.revokeShare(row.id); loadRows(); toast('Accès retiré.'); }
    catch (err) { toast('Erreur : ' + shareErr(err), 'error'); }
  }
  const linkUrl = (token) => window.location.origin + '/#join=' + token;
  async function genLink() {
    if (!listId) return;
    setGenLoading(true);
    try {
      const l = await DXApi.createShareLink(listId, linkRole);
      const url = linkUrl(l.token);
      setNewLink(url); loadLinks();
      try { await navigator.clipboard.writeText(url); toast('Lien généré et copié dans le presse-papiers.'); }
      catch { toast('Lien généré.'); }
    } catch (err) { toast('Génération du lien impossible : ' + shareErr(err), 'error'); }
    finally { setGenLoading(false); }
  }
  async function copyLink(url) {
    try { await navigator.clipboard.writeText(url); toast('Lien copié.'); }
    catch { toast('Copie impossible — sélectionnez le lien à la main.', 'error'); }
  }
  async function revokeLinkRow(l) {
    try {
      await DXApi.revokeShareLink(l.id);
      if (newLink && newLink.indexOf(l.token) !== -1) setNewLink('');
      loadLinks(); toast('Lien révoqué.');
    } catch (err) { toast('Erreur : ' + shareErr(err), 'error'); }
  }

  if (!list) return null;

  // Garde : le partage est réservé à l'offre Pro. Les points d'entrée gèrent déjà
  // le verrouillage ; ceci est un filet de sécurité (menant vers l'offre Pro).
  if (!(window.DXCloud && window.DXCloud.pro)) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <div style={{ font: '30px/1' }}>🔒</div>
          <div style={{ font: 'var(--type-h3)', color: 'var(--text)' }}>Le partage est une fonctionnalité Pro</div>
          <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', maxWidth: 340 }}>
            Partagez vos listes et stratégies par lien ou par e-mail avec l'offre <strong style={{ color: 'var(--accent-hover)' }}>Pro</strong>.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={() => { onClose(); window.__dxNav && window.__dxNav('pricing'); }}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 20px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Découvrir Pro →</button>
            <button onClick={onClose}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '10px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Fermer</button>
          </div>
        </div>
      </div>
    );
  }

  const isConstruction = kind === 'construction';
  const title = isConstruction ? `Partager la construction « ${list.name} »` : `Partager « ${list.name} »`;
  const subtitle = isConstruction
    ? 'La liste et sa construction (analyse Risk Lab incluse) sont partagées. La personne doit avoir un compte.'
    : 'Par e-mail. La personne doit avoir un compte DispersionX.';
  const linkNote = isConstruction
    ? 'Quiconque ouvre le lien (et se connecte) accède à la construction avec le rôle choisi. Révocable à tout moment.'
    : 'Quiconque ouvre le lien (et se connecte) rejoint la liste avec le rôle choisi. Révocable à tout moment.';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ font: 'var(--type-h3)', color: 'var(--text)' }}>{title}</div>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</div>
        </div>
        <form onSubmit={submitShare} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="email" value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="email@exemple.com" required
            style={{ flex: 1, minWidth: 180, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', font: 'var(--type-body)', padding: '9px 12px', outline: 'none', boxSizing: 'border-box' }} />
          <select value={shareRole} onChange={e => setShareRole(e.target.value)}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', font: 'var(--type-body)', padding: '9px 12px', outline: 'none' }}>
            <option value="viewer">Lecture seule</option>
            <option value="editor">Peut modifier</option>
          </select>
          <button type="submit" disabled={sharing}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 18px', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>{sharing ? '…' : 'Partager'}</button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Accès actuels</div>
          {shareRows.length === 0
            ? <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-dim)', padding: '6px 0' }}>Personne pour l'instant.</div>
            : shareRows.map(row => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ flex: 1, font: 'var(--type-body-sm)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.email || '—'}</span>
                <select value={row.role} onChange={e => changeShareRole(row, e.target.value)}
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-soft)', font: 'var(--type-caption)', padding: '5px 8px', outline: 'none' }}>
                  <option value="viewer">Lecture</option>
                  <option value="editor">Modif.</option>
                </select>
                <button onClick={() => revokeShareRow(row)} title="Retirer l'accès"
                  style={{ font: '600 11px/1 var(--font-sans)', padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' }}>×</button>
              </div>
            ))}
        </div>

        {/* Ou par lien */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ font: 'var(--type-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Ou par lien</div>
          <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{linkNote}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={linkRole} onChange={e => setLinkRole(e.target.value)}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', font: 'var(--type-body-sm)', padding: '8px 10px', outline: 'none' }}>
              <option value="viewer">Lecture seule</option>
              <option value="editor">Peut modifier</option>
            </select>
            <button onClick={genLink} disabled={genLoading}
              style={{ font: '600 12px/1 var(--font-sans)', padding: '9px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent-hover)', cursor: 'pointer' }}>{genLoading ? '…' : '🔗 Générer un lien'}</button>
          </div>
          {newLink && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input readOnly value={newLink} onFocus={e => e.target.select()}
                style={{ flex: 1, minWidth: 0, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-soft)', font: '11px/1.4 var(--font-mono)', padding: '8px 10px', outline: 'none' }} />
              <button onClick={() => copyLink(newLink)} style={{ font: '600 11px/1 var(--font-sans)', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Copier</button>
            </div>
          )}
          {shareLinks.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ font: '10px/1.4 var(--font-mono)', color: 'var(--text-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>lien …{String(l.token).slice(-12)}</span>
              <span style={{ font: 'var(--type-caption)', color: 'var(--text-dim)', flexShrink: 0 }}>{l.role === 'editor' ? 'Modif.' : 'Lecture'}</span>
              <button onClick={() => copyLink(linkUrl(l.token))} title="Copier le lien"
                style={{ font: '600 11px/1 var(--font-sans)', padding: '5px 9px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Copier</button>
              <button onClick={() => revokeLinkRow(l)} title="Révoquer le lien"
                style={{ font: '600 11px/1 var(--font-sans)', padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--neg)', background: 'transparent', color: 'var(--neg-bright)', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: 'pointer' }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

window.ShareDialog = ShareDialog;
