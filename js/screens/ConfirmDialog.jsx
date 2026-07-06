/* ─── ConfirmDialog : confirmation in-app (remplace le confirm() navigateur) ──
   Contrôlé : l'écran garde l'état et rend <window.ConfirmDialog open=… />.
   tone : 'danger' (rouge, défaut) pour une action destructive, 'default'
   (accent) sinon. Ferme au clic sur le fond ou Annuler. */
function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', tone = 'danger', onConfirm, onCancel, busy }) {
  if (!open) return null;
  const confirmBg = tone === 'danger' ? 'var(--neg)' : 'var(--accent)';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget && !busy && onCancel) onCancel(); }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ font: 'var(--type-h3)', color: 'var(--text)' }}>{title}</div>
        {message && <div style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', lineHeight: 1.5 }}>{message}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onCancel} disabled={busy}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-soft)', cursor: busy ? 'default' : 'pointer' }}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} disabled={busy}
            style={{ font: '600 12px/1 var(--font-sans)', padding: '8px 18px', borderRadius: 'var(--radius)', border: 'none', background: confirmBg, color: '#fff', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>{busy ? '…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

window.ConfirmDialog = ConfirmDialog;
