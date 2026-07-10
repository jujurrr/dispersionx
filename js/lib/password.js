/* ─── Politique de mot de passe — SOURCE UNIQUE ───────────────────────────────
   Un seul endroit pour la règle : inscription, changement (Préférences) et
   réinitialisation (lien e-mail). Exigence : au moins 8 caractères, avec une
   minuscule, une majuscule, un chiffre ET un caractère spécial.
   DXPasswordError(pw) → message d'erreur (string) si invalide, sinon null.
   NB : ne s'applique PAS à la connexion (on ne verrouille pas les comptes
   existants) — uniquement à la CRÉATION ou au CHANGEMENT d'un mot de passe. */
window.DXPasswordMin = 8;
window.DXPasswordHint = 'Au moins 8 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial.';

window.DXPasswordError = function (pw) {
  pw = String(pw == null ? '' : pw);
  if (pw.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.';
  if (!/[a-z]/.test(pw)) return 'Ajoutez au moins une lettre minuscule.';
  if (!/[A-Z]/.test(pw)) return 'Ajoutez au moins une lettre majuscule.';
  if (!/[0-9]/.test(pw)) return 'Ajoutez au moins un chiffre.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Ajoutez au moins un caractère spécial (ex. ! ? @ #).';
  return null;
};
