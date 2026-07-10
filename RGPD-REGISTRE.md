# Registre des activités de traitement — DispersionX

*Document de conformité RGPD (art. 30). Établi à partir de l'architecture réelle
de l'application. Les champs `{{…}}` dépendent de votre identité/organisation et
sont à compléter. À conserver, dater et mettre à jour à chaque évolution.*

- **Responsable du traitement** : {{PRÉNOM NOM}} — entrepreneur individuel (micro-entreprise) — {{ADRESSE}} — {{EMAIL}}
- **Délégué à la protection des données (DPO)** : non désigné (non obligatoire pour ce profil — pas de suivi à grande échelle ni de données sensibles). Point de contact vie privée : {{EMAIL}}
- **Dernière mise à jour** : {{DATE}} — **Version** : 1

---

## 1. Sous-traitants (art. 28)

| Sous-traitant | Rôle | Localisation | Encadrement | DPA signé |
|---|---|---|---|---|
| **Supabase** | Authentification + base de données | **Région UE à sélectionner** (Francfort/Irlande) | DPA + hébergement UE | ☐ à archiver |
| **Vercel** | Hébergement front + fonctions serverless + mesure d'audience | États-Unis | DPF + Clauses Contractuelles Types (CCT) | ☐ à archiver |
| **Stripe** | Traitement des paiements (abonnement Pro) | Irlande / États-Unis | DPF + CCT ; PCI-DSS (aucune donnée carte chez l'éditeur) | ☐ à archiver |
| **Resend** | Envoi d'e-mails d'alerte | États-Unis | CCT | ☐ à archiver |

> **Ne sont PAS sous-traitants** (aucune donnée personnelle transmise) : les sources de données de marché **Cboe, Yahoo Finance, Finnhub** — les requêtes partent des serveurs de l'app, sans identifiant utilisateur.

## 2. Transferts hors Union européenne

- **Vercel, Stripe, Resend** (États-Unis) : transferts encadrés par le **Data Privacy Framework** (si le prestataire est certifié) **et** des **Clauses Contractuelles Types**.
- **Supabase** : en **choisissant une région d'hébergement UE**, aucun transfert hors UE pour la base et l'authentification. ← action recommandée.

---

## 3. Traitements

### T1 — Gestion des comptes utilisateurs
| Champ | Valeur |
|---|---|
| Finalité | Créer, authentifier et sécuriser le compte ; synchroniser les données entre appareils |
| Base légale | Exécution du contrat (art. 6-1-b) |
| Personnes concernées | Utilisateurs inscrits |
| Catégories de données | E-mail, mot de passe (haché par Supabase), pseudo, identifiant technique, statut de vérification e-mail, jetons de session |
| Destinataires / sous-traitant | Supabase |
| Transfert hors UE | Non (si région UE) |
| Durée de conservation | Tant que le compte est actif ; suppression sous 30 j après demande (art. 17) |
| Mesures de sécurité | RLS par utilisateur, mot de passe haché + politique forte (≥ 8, complexité), TLS |

### T2 — Fourniture du service d'analyse (contenu utilisateur)
| Champ | Valeur |
|---|---|
| Finalité | Fournir l'outil : listes d'actions, stratégies construites, positions suivies, journal, alertes, notifications |
| Base légale | Exécution du contrat |
| Personnes concernées | Utilisateurs inscrits |
| Catégories de données | Tickers, paramètres de stratégie, positions et snapshots, entrées de journal, réglages d'alerte, notifications, préférences ; tables : `lists`, `list_items`, `strategies`, `positions`, `trades`, `alerts`, `notifications`, `audit_log` |
| Destinataires / sous-traitant | Supabase |
| Transfert hors UE | Non (si région UE) |
| Durée de conservation | Tant que le compte est actif ; effacé à la suppression du compte (cascade) |
| Mesures de sécurité | RLS (`auth.uid() = user_id`), TLS |

### T3 — Gestion des abonnements & paiements
| Champ | Valeur |
|---|---|
| Finalité | Gérer l'abonnement Pro (souscription, renouvellement, résiliation, accès) |
| Base légale | Exécution du contrat + obligation légale (conservation comptable) |
| Personnes concernées | Abonnés Pro |
| Catégories de données | Identifiants client/abonnement Stripe, statut, fin de période, e-mail (table `pro_access`). **Aucune donnée bancaire** stockée par l'éditeur |
| Destinataires / sous-traitant | Stripe |
| Transfert hors UE | Oui — Stripe (DPF + CCT) |
| Durée de conservation | Données d'abonnement : tant que le compte est actif. **Justificatifs de paiement : 10 ans** (art. L123-22 C. com.) |
| Mesures de sécurité | Checkout hébergé (PCI-DSS Stripe), webhook signé (HMAC), clé service serveur uniquement |

### T4 — Partage de listes/stratégies entre utilisateurs
| Champ | Valeur |
|---|---|
| Finalité | Permettre à un abonné Pro de partager une liste/stratégie (lien ou e-mail) |
| Base légale | Exécution du contrat / intérêt légitime |
| Personnes concernées | Émetteur et destinataire du partage |
| Catégories de données | Identifiants de listes, e-mail du propriétaire, rôle, jeton de lien (tables `list_shares`, `share_links`) |
| Destinataires / sous-traitant | Utilisateurs destinataires ; Supabase |
| Transfert hors UE | Non (si région UE) |
| Durée de conservation | Tant que le partage est actif / le lien valide |
| Mesures de sécurité | RLS (partage réservé aux comptes Pro, `is_pro`), jetons |

### T5 — Envoi d'e-mails (transactionnels & alertes)
| Champ | Valeur |
|---|---|
| Finalité | E-mails transactionnels (confirmation, réinitialisation de mot de passe) et alertes déclenchées par l'utilisateur |
| Base légale | Exécution du contrat (transactionnels) ; contrat/consentement (alertes activées par l'utilisateur) |
| Personnes concernées | Utilisateurs inscrits ayant activé une alerte |
| Catégories de données | Adresse e-mail, contenu de l'alerte |
| Destinataires / sous-traitants | Supabase (transactionnels), Resend (alertes) |
| Transfert hors UE | Oui — Resend (CCT) |
| Durée de conservation | Le temps de la fourniture du service ; e-mail supprimé avec le compte |
| Mesures de sécurité | TLS, clés API serveur uniquement |

### T6 — Mesure d'audience
| Champ | Valeur |
|---|---|
| Finalité | Statistiques d'usage agrégées (pages vues, tunnel de conversion) |
| Base légale | Intérêt légitime — mesure d'audience **sans cookie**, exemptée au sens CNIL ; **opt-out** proposé dans l'app |
| Personnes concernées | Visiteurs du site |
| Catégories de données | Pages vues et événements **agrégés**, **sans identifiant ni cookie** (Vercel Web Analytics) |
| Destinataires / sous-traitant | Vercel |
| Transfert hors UE | Oui — Vercel (DPF + CCT) |
| Durée de conservation | Données agrégées, non individualisées |
| Mesures de sécurité | Sans cookie, sans donnée personnelle ; désactivable (Préférences) |

### T7 — Sécurité & journaux techniques
| Champ | Valeur |
|---|---|
| Finalité | Sécurité, prévention des abus, limitation de débit, bon fonctionnement |
| Base légale | Intérêt légitime (art. 6-1-f) |
| Personnes concernées | Tous les visiteurs |
| Catégories de données | Adresse IP, horodatage, statut des requêtes (journaux Vercel/Supabase) |
| Destinataires / sous-traitants | Vercel, Supabase |
| Transfert hors UE | Oui — Vercel (DPF + CCT) |
| Durée de conservation | **≤ 12 mois** (recommandation CNIL) |
| Mesures de sécurité | Accès restreint, HTTPS/HSTS |

---

## 4. Mesures de sécurité communes (art. 32)

- **Chiffrement en transit** : HTTPS/TLS partout ; **HSTS** (preload).
- **Cloisonnement** : Row Level Security Supabase (`auth.uid() = user_id`) sur toutes les tables utilisateur.
- **En-têtes** : CSP stricte (`script-src 'self'`), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP.
- **Secrets** : clé service role et clés API **côté serveur uniquement** ; jamais dans le bundle client.
- **Paiement** : Checkout hébergé Stripe (PCI-DSS) ; **aucune donnée carte** stockée ; webhook signé (HMAC-SHA256, temps constant, anti-rejeu).
- **Authentification** : mots de passe hachés (Supabase) + politique forte (≥ 8, majuscule/minuscule/chiffre/spécial).
- **API** : validation stricte du format des symboles, plafonnement des lots, limitation de débit (best-effort) ; endpoints privés protégés par JWT, crons par clé.
- **Effacement** : suppression du compte en cascade (FK `on delete cascade`).

## 5. Durées de conservation — récapitulatif

| Donnée | Durée |
|---|---|
| Compte & contenu (listes, stratégies, positions, journal, alertes) | Tant que le compte est actif |
| Après suppression du compte | Effacement (cascade), sauf obligation légale |
| Justificatifs de paiement | 10 ans (obligation comptable) |
| Journaux techniques | ≤ 12 mois |
| Données locales du navigateur (préférences, mode invité) | Jusqu'à effacement par l'utilisateur |

## 6. Droits des personnes (rappel)

Accès, rectification, effacement (**suppression de compte in-app**, art. 17), portabilité (**« Télécharger mes données » in-app**, art. 20), limitation, opposition — exerçables dans l'application ou à {{EMAIL}}. Réclamation possible auprès de la **CNIL**.

---

*Voir aussi : `SECURITY.md` (mesures techniques), politique de confidentialité (écran Confidentialité de l'app), `SUPABASE_SETUP.md` (schéma & RLS).*
