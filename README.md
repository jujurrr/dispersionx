# CODING AGENTS: READ THIS FIRST

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read the chat transcripts first.** There are 1 chat transcript(s) in `chats/`. The transcripts show the full back-and-forth between the user and the design assistant — they tell you **what the user actually wants** and **where they landed** after iterating. Don't skip them. The final HTML files are the output, but the chat is where the intent lives.

**Find the primary design file under `project/` and read it top to bottom.** The chat transcripts will tell you which file the user was last iterating on. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `README.md` — this file
- `chats/` — conversation transcripts (read these!)
- `project/` — the `DispersionX Design System` project files (HTML prototypes, assets, components)

---

# DispersionX — développement, tests et déploiement

L'application réelle vit à la racine (pas dans `project/`, qui ne contient que les
maquettes de design d'origine).

## Structure

- `index.html` — point d'entrée ; charge React + Babel (CDN), puis les écrans JSX.
- `js/` — front-end : écrans (`js/screens/*.jsx`), client API (`js/api.js`),
  données de démo (`js/data.js`), logique pure partagée (`js/lib/*.js`).
- `api/` — fonctions serverless **Vercel** (edge), avec la logique métier dans
  `api/_lib/` (Cboe, échelles proxy…).
- `netlify/functions/` — **miroir** des fonctions : de simples ré-exports des
  handlers `api/` (sauf `correlation-matrix.mjs`, copie autonome).
- `test/`, `scripts/`, `.github/workflows/` — tests, vérification JSX, CI.

## Déploiement — Vercel fait foi

**La plateforme canonique est Vercel** : les fonctions `api/**` sont écrites au
format Vercel (edge runtime), et `vercel.json` sert la racine en statique. Le
dossier `netlify/functions/` est un **miroir de secours** — chaque fichier
ré-exporte le handler Vercel correspondant, donc les deux hébergeurs restent
synchronisés, mais **Vercel est la référence**. En cas de doute, c'est `api/`
et `vercel.json` qui priment.

## Tests (aucune installation requise pour les tests unitaires)

Les tests unitaires utilisent le lanceur intégré de Node (`node --test`) — pas
de dépendance à installer.

```bash
npm test          # tests unitaires : grecs BS, IV, échelles proxy, horaires de marché
npm run test:jsx  # vérifie que tous les .jsx compilent (nécessite `npm install`)
npm run test:all  # les deux
```

## Intégration continue

`.github/workflows/ci.yml` rejoue, à chaque push et pull request, la
compilation JSX puis les tests unitaires. Un changement qui casse le JSX ou la
logique financière échoue **avant** le déploiement.
