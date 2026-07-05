/* ── Statut d'ouverture des places boursières — logique PURE et testable ──
   Source unique : chargé comme script classique dans le navigateur (expose
   window.DXMarket) ET importable par Node pour les tests (assigne globalThis).
   Aucun `import`/`export` : valide dans les deux environnements.

   Horaires RÉGULIERS locaux à chaque place (via Intl/timeZone → DST géré),
   jours fériés et clôtures anticipées inclus. Minutes depuis minuit dans le
   fuseau de la place. ⚠️ Tables à mettre à jour chaque année (voir 2028+). */
(function (g) {
  'use strict';

  // Jours fériés marché US (NYSE + CME ferment) — 2026 & 2027.
  const US_HOLIDAYS = [
    '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
    '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
    '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
    '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
  ];
  // Clôtures anticipées NYSE à 13:00 ET (780 min) : lendemain de Thanksgiving, veille de Noël.
  const NYSE_EARLY = { '2026-11-27': 780, '2026-12-24': 780, '2027-11-26': 780 };

  // Euronext : Nouvel An, Vendredi saint, lundi de Pâques, 1er Mai, Noël, 26 déc.
  // (Euronext ne suit PAS les fériés nationaux type 14 juillet ou Toussaint).
  const EURONEXT_HOLIDAYS = [
    '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01', '2026-12-25', '2026-12-26',
    '2027-01-01', '2027-03-26', '2027-03-29', '2027-05-01', '2027-12-25', '2027-12-26',
  ];
  // Clôtures anticipées Euronext à 14:05 CET (845 min) : 24 et 31 décembre.
  const EURONEXT_EARLY = { '2026-12-24': 845, '2026-12-31': 845, '2027-12-24': 845, '2027-12-31': 845 };

  // Bourse de Tokyo (JPX) : fériés japonais + clôture de fin d'année (31 déc, 2–3 janv).
  const TSE_HOLIDAYS = [
    '2026-01-01', '2026-01-02', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20',
    '2026-04-29', '2026-05-04', '2026-05-05', '2026-05-06', '2026-07-20', '2026-08-11',
    '2026-09-21', '2026-09-22', '2026-09-23', '2026-10-12', '2026-11-03', '2026-11-23', '2026-12-31',
    '2027-01-01', '2027-01-11', '2027-02-11', '2027-02-23', '2027-03-22', '2027-04-29',
    '2027-05-03', '2027-05-04', '2027-05-05', '2027-07-19', '2027-08-11', '2027-09-20',
    '2027-09-23', '2027-10-11', '2027-11-03', '2027-11-23', '2027-12-31',
  ];

  const EXCHANGES = [
    { key: 'nyse',     label: 'NYSE',              desc: 'Actions US',   tz: 'America/New_York', sessions: [[570, 960]],             holidays: US_HOLIDAYS,       earlyCloses: NYSE_EARLY },     // 9:30–16:00 ET
    { key: 'cme',      label: 'CME',               desc: 'Futures US',   tz: 'America/New_York', sessions: 'cme',                    holidays: US_HOLIDAYS },                                     // dim 18:00 → ven 17:00 ET (pause 17–18h)
    { key: 'euronext', label: 'Euronext Paris',    desc: 'CAC 40',       tz: 'Europe/Paris',     sessions: [[540, 1050]],            holidays: EURONEXT_HOLIDAYS, earlyCloses: EURONEXT_EARLY }, // 9:00–17:30 CET
    { key: 'asia',     label: 'TSE',               desc: 'Tokyo',        tz: 'Asia/Tokyo',       sessions: [[540, 690], [750, 900]], holidays: TSE_HOLIDAYS },                                    // 9:00–11:30 / 12:30–15:00 JST
  ];

  function exchangeLocal(tz, now) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now);
    const get = (t) => { const p = parts.find(x => x.type === t); return p ? p.value : ''; };
    const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get('weekday')];
    let hh = parseInt(get('hour'), 10); if (hh === 24) hh = 0;   // minuit = 00, pas 24
    return { wd, mins: hh * 60 + parseInt(get('minute'), 10), date: `${get('year')}-${get('month')}-${get('day')}` };
  }

  function isExchangeOpen(ex, now) {
    const { wd, mins, date } = exchangeLocal(ex.tz, now);
    if (ex.holidays && ex.holidays.includes(date)) return false;    // jour férié → fermé
    const early = ex.earlyCloses && ex.earlyCloses[date];           // clôture anticipée éventuelle
    if (ex.sessions === 'cme') {
      // Globex (ES) : dimanche 18:00 ET → vendredi 17:00 ET, pause maintenance 17:00–18:00 ET (lun–jeu).
      if (wd === 6) return false;                       // samedi
      if (wd === 0) return mins >= 18 * 60;             // dimanche : ouvre 18:00
      if (wd === 5) return mins < 17 * 60;              // vendredi : ferme 17:00
      return !(mins >= 17 * 60 && mins < 18 * 60);      // lun–jeu : ouvert sauf pause 17–18h
    }
    if (wd === 0 || wd === 6) return false;             // week-end
    return ex.sessions.some(([a, b]) => mins >= a && mins < (early && early < b ? early : b));
  }

  g.DXMarket = { EXCHANGES, exchangeLocal, isExchangeOpen };
})(typeof globalThis !== 'undefined' ? globalThis : this);
