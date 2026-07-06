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

## 7. (Fiabilité IV) Cache partagé d'IV — recommandé pour la prod
Sans ça, certaines régions Vercel (ex. Paris) peuvent ne pas joindre le Cboe de
façon fiable → l'IV retombe parfois sur une estimation (ex. ZS affiché 128 au
lieu de ~58). Un cache PARTAGÉ dans Supabase règle ça : dès qu'une région a
récupéré un symbole, toutes les régions le lisent depuis Supabase.

**a) Créer la table** (SQL Editor → Run) :
```sql
create table if not exists public.iv_cache (
  symbol text not null,
  dte int not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (symbol, dte)
);
alter table public.iv_cache enable row level security;
-- Aucune policy publique : seule la clé "service_role" (serveur) y accède.
```

**b) Ajouter la clé service dans Vercel** :
- Supabase → **Project Settings → API → `service_role` `secret`** (⚠️ SECRÈTE — ne
  jamais la mettre côté client / dans un fichier `.env` avec préfixe `VITE_`).
- Vercel → **Settings → Environment Variables** → ajoute :
  - `SUPABASE_SERVICE_KEY` = (la clé service_role)
  - (et vérifie que `VITE_SUPABASE_URL` y est aussi — le serveur en a besoin.)
- **Redéploie.**

Sans `SUPABASE_SERVICE_KEY`, le cache est simplement désactivé (rien ne casse).

## 8. Stratégies + positions synchronisées (recommandé)
Même principe que les listes : une fois connecté, tes **stratégies construites**
(Builder / Construction) et tes **positions suivies** (checklist → suivi) sont
sauvegardées côté serveur et partagées entre tes appareils. Sans ces tables (ou
sans connexion), tout continue de marcher en **local** (localStorage), à
l'identique.

Dans **SQL Editor → New query → Run** :

```sql
-- Stratégies construites : une par liste (clé (user_id, list_id)).
create table if not exists public.strategies (
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id text not null,
  data jsonb not null,
  built_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, list_id)
);
alter table public.strategies enable row level security;
create policy "own_strategies" on public.strategies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Positions committées + historique des snapshots (jsonb).
create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id text,
  name text,
  strategy jsonb not null,
  status text not null default 'open',
  snapshots jsonb not null default '[]'::jsonb,
  committed_at timestamptz not null default now()
);
create index if not exists positions_user_idx on public.positions(user_id);
alter table public.positions enable row level security;
create policy "own_positions" on public.positions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

À ta première connexion après avoir créé ces tables, tes stratégies présentes en
local sont **remontées automatiquement** vers ton compte (une seule fois), puis
l'app lit/écrit côté serveur. Les positions créées hors-ligne restent gérées en
local et n'interfèrent pas.

## 9. Partage de listes (tranche 3)
Permet de partager une de tes listes avec un(e) autre utilisateur **par son
e-mail** (il doit avoir un compte), en **lecture seule** (`viewer`) ou avec
**modification** (`editor`). Sans ces objets (ou sans connexion), rien ne change :
le bouton « Partager » n'a simplement aucun effet et tes listes restent privées.

Point de sécurité : le partage par e-mail passe par une **fonction serveur
`share_list` (SECURITY DEFINER)** qui traduit l'e-mail en utilisateur **sans
jamais exposer la table des comptes** (`auth.users`) au navigateur.

Dans **SQL Editor → New query → Run** :

```sql
-- Qui a accès à quelle liste, et avec quel rôle.
create table if not exists public.list_shares (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text,
  shared_with uuid not null references auth.users(id) on delete cascade,
  shared_with_email text,
  role text not null default 'viewer' check (role in ('viewer','editor')),
  created_at timestamptz not null default now(),
  unique (list_id, shared_with)
);
create index if not exists list_shares_shared_with_idx on public.list_shares(shared_with);
create index if not exists list_shares_list_id_idx on public.list_shares(list_id);

alter table public.list_shares enable row level security;
-- Le propriétaire gère les partages de SES listes ; le destinataire lit les siens.
create policy "owner_manages_shares" on public.list_shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "recipient_reads_shares" on public.list_shares
  for select using (auth.uid() = shared_with);

-- Une liste partagée devient LISIBLE par le destinataire.
create policy "shared_lists_select" on public.lists
  for select using (
    exists (select 1 from public.list_shares s where s.list_id = lists.id and s.shared_with = auth.uid())
  );
-- Ses items sont lisibles (viewer + editor)…
create policy "shared_items_select" on public.list_items
  for select using (
    exists (select 1 from public.list_shares s where s.list_id = list_items.list_id and s.shared_with = auth.uid())
  );
-- …et modifiables uniquement par le rôle 'editor'.
create policy "shared_items_write" on public.list_items
  for all using (
    exists (select 1 from public.list_shares s where s.list_id = list_items.list_id and s.shared_with = auth.uid() and s.role = 'editor')
  ) with check (
    exists (select 1 from public.list_shares s where s.list_id = list_items.list_id and s.shared_with = auth.uid() and s.role = 'editor')
  );

-- Partage par e-mail : résout l'e-mail en utilisateur sans exposer auth.users,
-- et vérifie que l'appelant possède bien la liste.
create or replace function public.share_list(p_list_id uuid, p_email text, p_role text default 'viewer')
returns json language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid := auth.uid();
  v_owner_email text;
  v_target uuid;
  v_target_email text;
begin
  if v_owner is null then raise exception 'not_authenticated'; end if;
  if p_role not in ('viewer','editor') then raise exception 'bad_role'; end if;
  if not exists (select 1 from public.lists where id = p_list_id and user_id = v_owner) then
    raise exception 'not_owner';
  end if;
  select id, email into v_target, v_target_email
    from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_target is null then raise exception 'user_not_found'; end if;
  if v_target = v_owner then raise exception 'cannot_share_self'; end if;
  select email into v_owner_email from auth.users where id = v_owner;
  insert into public.list_shares (list_id, owner_id, owner_email, shared_with, shared_with_email, role)
  values (p_list_id, v_owner, v_owner_email, v_target, v_target_email, p_role)
  on conflict (list_id, shared_with) do update
    set role = excluded.role, shared_with_email = excluded.shared_with_email;
  return json_build_object('ok', true, 'shared_with_email', v_target_email, 'role', p_role);
end; $$;
revoke all on function public.share_list(uuid, text, text) from public, anon;
grant execute on function public.share_list(uuid, text, text) to authenticated;
```

Ensuite, dans **Mes listes** : bouton **Partager** sur tes listes (e-mail +
rôle, gestion/retrait des accès) et section **Partagées avec moi**.

## Ce qui se passe ensuite
- À ta première connexion, si tu avais des listes en local, elles sont
  **automatiquement copiées** vers ton compte (une seule fois).
- Sans connexion (ou sans config Supabase), rien ne change : mode local.
