// Point d'entrée du bundle Vite. On importe les fichiers existants EN SIDE-EFFECT,
// dans le MÊME ordre que les <script> de index.html — c'est cet ordre qui garantit
// que chaque global (window.DXApi, window.DXRisk, window.Topbar…) est prêt avant
// d'être utilisé. Aucun fichier applicatif n'a été réécrit : Vite se contente de
// les regrouper, minifier et versionner à la place du Babel navigateur.

// 1) React/ReactDOM en global — AVANT tout le reste.
import './globals-setup.js';

// 1a) Analytics privacy-first (Vercel Web Analytics, cookieless, RGPD) → window.DXTrack.
import './analytics.js';

// 1a-bis) Politique de mot de passe (source unique) → window.DXPasswordError.
import '../js/lib/password.js';

// 1b) Couche cloud (Supabase) → window.DXCloud. Inactive sans clés VITE_SUPABASE_*
//     (l'app reste en localStorage). Doit exister avant que les écrans tournent.
import './cloud.js';

// 1c) Internationalisation (fr/en/zh) → window.DXI18n, window.t, window.useLang.
//     Repli sur le français : toute chaîne non traduite reste affichée en FR.
//     Doit exister avant les écrans (ils appellent window.t au rendu).
import '../js/i18n.js';

// 1d) Devise d'affichage (USD ⇆ EUR) → window.DXMoney, window.useCurrency.
//     Conversion PURE et non-cassante : défaut USD (rendu identique à l'existant),
//     fail-safe USD si le taux /api/fx est indisponible. Affichage seulement.
import '../js/lib/currency.js';

// 1e) Rendu balisé des chaînes traduites (gras + liens en ligne) → window.DXRich.
//     Utilisé par les pages légales/dialogues pour garder une clé i18n par
//     paragraphe. Après React et i18n (il lit window.React au rendu).
import '../js/lib/rich-text.js';

// 2) Styles du design system.
import '../project/styles.css';

// 3) Thème (applique data-theme) + bundle du design system.
import '../project/ui_kits/theme.js';
import '../js/screens/HintDot.jsx';         // window.HintDot (infobulles « ? » dans la DA, utilisé par MetricCard)
import '../project/_ds_bundle.js';

// 4) Données de démo, client API, store/préchargeur, logique pure partagée.
import '../js/data.js';
import '../js/api.js';
import '../js/store.js';
import '../js/notif-store.js';   // window.DXNotifStore (store partagé des notifications, cloud)
import '../js/lib/market-hours.js';
import '../js/lib/corr-skew-data.js';   // window.DXSkewComp : skew moyen par composant → skew de corrélation ajusté à la liste
import '../js/lib/corr-cost-data.js';   // window.DXCostComp : coût d'exécution réel par composant (repli + référence historique du spread)
import '../js/lib/corr-baseline-data.js';   // window.DXCorrBaseline : quantiles historiques de la prime de corrélation (Correlation Lab + Construction)
// Maths du coût d'exécution → window.DXCost. On importe la SOURCE serveur (api/_lib) telle
// quelle : c'est de l'ESM pur sans dépendance Node, donc Vite la bundle sans adaptation. Une
// seule implémentation, couverte par `npm test`, partagée par l'API et les écrans — pas de
// miroir navigateur à resynchroniser à la main (contrairement à DXProxy/proxy-scale).
import * as DXCostMath from '../api/_lib/dispersion-cost.js';
window.DXCost = DXCostMath;
import '../js/lib/ibkr-export.js';   // window.DXIbkr (CSV Risk Navigator/What-If à partir d'une stratégie)

// 5) Écrans (ordre identique à index.html — dépendances de globals au top-level).
import '../js/screens/LoadingSpinner.jsx';  // window.DXLoader (roue + texte tournant, écrans de chargement)
import '../js/screens/ConfirmDialog.jsx';   // window.ConfirmDialog, utilisé par plusieurs écrans
import '../js/screens/FirstVisitGuide.jsx'; // window.DXGuide (pancarte d'accueil 1re visite d'un module)
import '../js/screens/ShareDialog.jsx';     // window.ShareDialog (partage liste/construction)
import '../js/screens/IbkrExportDialog.jsx'; // window.IbkrExportDialog (export CSV IBKR What-If, Pro)
import '../js/screens/ActivityFeed.jsx';    // window.ActivityFeed + window.DXActivity (helpers audit)
import '../js/screens/DXChart.jsx';          // window.DXChart (graphe en courbes interactif réutilisable)
import '../js/screens/TailWarning.jsx';      // window.DXTailWarning (avertissement prime de risque / queue, au moment du trade)
import '../js/screens/Shell.jsx';
import '../js/screens/Home.jsx';
import '../js/screens/IndexDetail.jsx';
import '../js/screens/ScoreModal.jsx';
import '../js/screens/Lists.jsx';
import '../js/screens/Strategies.jsx';
import '../js/screens/StrategyDetail.jsx';
import '../js/screens/PrevStrategyBand.jsx';
import '../js/screens/ErrorBoundary.jsx';
import '../js/screens/ListDetail.jsx';
import '../js/screens/Dashboard.jsx';
import '../js/screens/CorrelationLab.jsx';
import '../js/screens/VolatilityLab.jsx';
import '../js/screens/RiskLab.jsx';
import '../js/screens/Construction.jsx';
import '../js/screens/Builder.jsx';
import '../js/screens/StrategyMonitor.jsx';
import '../js/screens/ProUpsell.jsx';            // window.ProUpsellCard / ProLockedPreview / ProPricing (offre Pro)
import '../js/screens/OpportunityFinder.jsx';   // window.OpportunityFinder (module Pro)
import '../js/screens/CorrelationPro.jsx';       // window.CorrelationBarometer (baromètre ρ)
import '../js/screens/AlertsPanel.jsx';           // window.AlertsPanel (alertes de corrélation, Pro)
import '../js/screens/EarningsPanel.jsx';         // window.EarningsPanel (calendrier des résultats, Pro)
import '../js/screens/MarketPro.jsx';             // window.MarketPro (onglet contexte de marché, Pro)
import '../js/screens/Journal.jsx';               // window.Journal (journal de trades, Pro)
import '../js/screens/DXReport.jsx';              // window.DXReport (rapports PDF imprimables)
import '../js/screens/Checklist.jsx';
import '../js/screens/MonitorList.jsx';
import '../js/screens/PositionDetail.jsx';
import '../js/screens/Docs.jsx';
import '../js/legal-info.js';              // window.DXLegal (identité légale — source unique)
import '../js/screens/Privacy.jsx';        // window.Privacy (politique de confidentialité)
import '../js/screens/Legal.jsx';          // window.Legal (mentions légales)
import '../js/screens/Terms.jsx';          // window.Terms (CGU)
import '../js/screens/Sales.jsx';          // window.Sales (CGV)
import '../js/screens/Landing.jsx';
import '../js/screens/Auth.jsx';
import '../js/screens/MfaSection.jsx';     // window.MfaSection (double authentification TOTP)
import '../js/screens/Preferences.jsx';   // window.Preferences (compte / abonnement)
import '../js/screens/NotificationsPage.jsx';   // window.NotificationsPage (page dédiée notifs + activité)

// 6) Point d'entrée applicatif — monte React (doit être en DERNIER).
import '../js/app.jsx';
