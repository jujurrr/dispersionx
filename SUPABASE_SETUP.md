# Activer les comptes + listes synchronisées (Supabase)

Le code est déjà en place. Tant que ces étapes ne sont pas faites, l'app tourne
normalement en **mode local** (localStorage, sans comptes). Une fois configuré,
la connexion s'active et **tes listes sont sauvegardées côté serveur**, partagées
entre tous tes appareils/navigateurs.

## 1. Créer un projet Supabase (~3 min)
1. Va sur https://supabase.com → **New project** (plan gratuit).
2. Choisis un nom, un mot de passe de base, une région proche (Europe).
3. Attends que le projet soit prêt.

## 2. Créer les tables (copier-coller le SQL)
Dans le projet Supabase : menu **SQL Editor** → **New query** → colle ceci → **Run** :

```sql
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  index_symbol text not null default 'SPX',
  description text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  ticker text not null,
  weight numeric,
  score integer,
  score_data jsonb,
  added_at timestamptz not null default now(),
  unique (list_id, ticker)
);
create index if not exists list_items_list_id_idx on public.list_items(list_id);

-- Sécurité : chaque utilisateur ne voit/modifie QUE ses propres données
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "own_lists" on public.lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_list_items" on public.list_items
  for all
  using (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()))
  with check (exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));
```

## 3. Récupérer tes 2 clés
Menu **Project Settings → API** :
- **Project URL** → `VITE_SUPABASE_URL`
- **Project API keys → `anon` `public`** → `VITE_SUPABASE_ANON_KEY`
  (⚠️ PAS la clé `service_role`, qui est secrète.)

## 4. Renseigner les variables d'environnement
**En local** : crée un fichier `.env.local` à la racine (copie de `.env.example`) :
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```
Puis relance `npm run vite`.

**En production (Vercel)** : Project → **Settings → Environment Variables** → ajoute
les deux mêmes variables (Environment : Production), puis **redéploie**.

## 5. E-mail / mot de passe
Ça marche tout de suite. Par défaut Supabase **exige une confirmation par e-mail**
à l'inscription (l'app affiche « vérifie ta boîte mail »). Pour tester plus vite,
tu peux désactiver ça : **Authentication → Providers → Email → décoche "Confirm email"**
(à réactiver pour la vraie prod).

## 6. Connexion Google (optionnel)
1. **Authentication → Providers → Google** → active-le. Supabase explique comment
   créer un identifiant OAuth Google (Google Cloud Console) et te donne l'URL de
   redirection à y coller.
2. **Authentication → URL Configuration → Redirect URLs** : ajoute
   `https://dispersionx.vercel.app` (et `http://localhost:5173` pour le local).

> Tu peux commencer avec **e-mail/mot de passe seulement** et ajouter Google plus
> tard — le bouton Google n'apparaît que si Supabase est configuré.

## Ce qui se passe ensuite
- À ta première connexion, si tu avais des listes en local, elles sont
  **automatiquement copiées** vers ton compte (une seule fois).
- Sans connexion (ou sans config Supabase), rien ne change : mode local.
