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

drop policy if exists "own_lists" on public.lists;
create policy "own_lists" on public.lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_list_items" on public.list_items;
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
drop policy if exists "own_strategies" on public.strategies;
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
drop policy if exists "own_positions" on public.positions;
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
drop policy if exists "owner_manages_shares" on public.list_shares;
create policy "owner_manages_shares" on public.list_shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "recipient_reads_shares" on public.list_shares;
create policy "recipient_reads_shares" on public.list_shares
  for select using (auth.uid() = shared_with);

-- Une liste partagée devient LISIBLE par le destinataire.
drop policy if exists "shared_lists_select" on public.lists;
create policy "shared_lists_select" on public.lists
  for select using (
    exists (select 1 from public.list_shares s where s.list_id = lists.id and s.shared_with = auth.uid())
  );
-- Ses items sont lisibles (viewer + editor)…
drop policy if exists "shared_items_select" on public.list_items;
create policy "shared_items_select" on public.list_items
  for select using (
    exists (select 1 from public.list_shares s where s.list_id = list_items.list_id and s.shared_with = auth.uid())
  );
-- …et modifiables uniquement par le rôle 'editor'.
drop policy if exists "shared_items_write" on public.list_items;
create policy "shared_items_write" on public.list_items
  for all using (
    exists (select 1 from public.list_shares s where s.list_id = list_items.list_id and s.shared_with = auth.uid() and s.role = 'editor')
  ) with check (
    exists (select 1 from public.list_shares s where s.list_id = list_items.list_id and s.shared_with = auth.uid() and s.role = 'editor')
  );

-- La CONSTRUCTION (stratégie) devient lisible dès que sa liste est partagée avec
-- vous → partager une construction = partager sa liste (Risk Lab inclus).
drop policy if exists "shared_strategies_select" on public.strategies;
create policy "shared_strategies_select" on public.strategies
  for select using (
    exists (select 1 from public.list_shares s where s.list_id = strategies.list_id and s.shared_with = auth.uid())
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

## 10. Journal d'audit (tranche 3 — suite)
Enregistre automatiquement « qui a fait quoi, quand » sur les listes : création /
renommage / suppression, ajout / retrait d'une action, partage / retrait / rôle.
C'est la **base de données** qui journalise (via des *triggers*) : impossible à
contourner depuis le navigateur, et le vrai auteur est toujours capturé. L'app se
contente de **lire** le journal (bouton « Activité » dans le détail d'une liste).

Sans ces objets, rien ne change : le bouton Activité affiche simplement un journal
vide.

Dans **SQL Editor → New query → Run** :

```sql
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  list_id uuid,                 -- pas de FK : le journal survit à la suppression de la liste
  actor_id uuid,
  actor_email text,
  action text not null,         -- item_added | item_removed | list_created | list_renamed | list_deleted | shared | role_changed | unshared
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_list_id_idx on public.audit_log(list_id, created_at desc);

alter table public.audit_log enable row level security;
-- Lecture : propriétaire de la liste, personnes avec qui elle est partagée, ou
-- l'auteur de l'action. Aucune policy d'écriture → seuls les triggers écrivent.
drop policy if exists "audit_read" on public.audit_log;
create policy "audit_read" on public.audit_log
  for select using (
    auth.uid() = actor_id
    or exists (select 1 from public.lists l where l.id = audit_log.list_id and l.user_id = auth.uid())
    or exists (select 1 from public.list_shares s where s.list_id = audit_log.list_id and s.shared_with = auth.uid())
  );

-- Triggers (SECURITY DEFINER) : enregistrent l'action + l'auteur (auth.uid()).
create or replace function public.audit_list_items() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  -- Import en masse : on NE journalise PAS chaque action (une seule entrée
  -- « list_created » suffit). Le drapeau est posé par la fonction import_list.
  if current_setting('app.skip_item_audit', true) = 'on' then return null; end if;
  select email into v_email from auth.users where id = auth.uid();
  if (tg_op = 'INSERT') then
    insert into public.audit_log(list_id, actor_id, actor_email, action, detail)
    values (new.list_id, auth.uid(), v_email, 'item_added', jsonb_build_object('ticker', new.ticker));
  elsif (tg_op = 'DELETE') then
    insert into public.audit_log(list_id, actor_id, actor_email, action, detail)
    values (old.list_id, auth.uid(), v_email, 'item_removed', jsonb_build_object('ticker', old.ticker));
  end if;
  return null;
end; $$;
drop trigger if exists trg_audit_list_items on public.list_items;
create trigger trg_audit_list_items after insert or delete on public.list_items
  for each row execute function public.audit_list_items();

create or replace function public.audit_lists() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if (tg_op = 'INSERT') then
    insert into public.audit_log(list_id, actor_id, actor_email, action, detail)
    values (new.id, auth.uid(), v_email, 'list_created', jsonb_build_object('name', new.name));
  elsif (tg_op = 'UPDATE') then
    if new.name is distinct from old.name then
      insert into public.audit_log(list_id, actor_id, actor_email, action, detail)
      values (new.id, auth.uid(), v_email, 'list_renamed', jsonb_build_object('from', old.name, 'to', new.name));
    end if;
  elsif (tg_op = 'DELETE') then
    insert into public.audit_log(list_id, actor_id, actor_email, action, detail)
    values (old.id, auth.uid(), v_email, 'list_deleted', jsonb_build_object('name', old.name));
  end if;
  return null;
end; $$;
drop trigger if exists trg_audit_lists on public.lists;
create trigger trg_audit_lists after insert or update or delete on public.lists
  for each row execute function public.audit_lists();

create or replace function public.audit_list_shares() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  if (tg_op = 'INSERT') then
    insert into public.audit_log(list_id, actor_id, actor_email, action, detail)
    values (new.list_id, auth.uid(), v_email, 'shared', jsonb_build_object('with', new.shared_with_email, 'role', new.role));
  elsif (tg_op = 'UPDATE') then
    if new.role is distinct from old.role then
      insert into public.audit_log(list_id, actor_id, actor_email, action, detail)
      values (new.list_id, auth.uid(), v_email, 'role_changed', jsonb_build_object('with', new.shared_with_email, 'role', new.role));
    end if;
  elsif (tg_op = 'DELETE') then
    insert into public.audit_log(list_id, actor_id, actor_email, action, detail)
    values (old.list_id, auth.uid(), v_email, 'unshared', jsonb_build_object('with', old.shared_with_email));
  end if;
  return null;
end; $$;
drop trigger if exists trg_audit_list_shares on public.list_shares;
create trigger trg_audit_list_shares after insert or update or delete on public.list_shares
  for each row execute function public.audit_list_shares();

-- Import d'une liste en UNE transaction : journalise « list_created » une fois,
-- puis pose le drapeau app.skip_item_audit pour ne PAS journaliser chaque action.
create or replace function public.import_list(p_name text, p_index text, p_description text, p_items jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_item jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.lists (user_id, name, index_symbol, description)
  values (auth.uid(), p_name, coalesce(nullif(p_index, ''), 'SPX'), coalesce(p_description, ''))
  returning id into v_id;                                   -- déclenche 'list_created' (une fois)
  perform set_config('app.skip_item_audit', 'on', true);    -- true = local à la transaction
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    insert into public.list_items (list_id, ticker, weight, score, score_data)
    values (
      v_id,
      upper(trim(v_item->>'ticker')),
      nullif(v_item->>'weight', '')::numeric,
      nullif(v_item->>'score', '')::int,
      case when v_item ? 'score_data' then v_item->'score_data' else null end
    )
    on conflict (list_id, ticker) do nothing;
  end loop;
  return v_id;
end; $$;
revoke all on function public.import_list(text, text, text, jsonb) from public, anon;
grant execute on function public.import_list(text, text, text, jsonb) to authenticated;

-- Suppression d'une liste en UNE transaction : journalise « list_deleted » une
-- fois, et pose app.skip_item_audit pour ne PAS journaliser chaque action retirée
-- (la cascade supprime les items). Seul le propriétaire peut supprimer.
create or replace function public.delete_list(p_list_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  perform set_config('app.skip_item_audit', 'on', true);   -- true = local à la transaction
  delete from public.lists where id = p_list_id and user_id = auth.uid();
end; $$;
revoke all on function public.delete_list(uuid) from public, anon;
grant execute on function public.delete_list(uuid) to authenticated;
```

Ensuite, dans le détail d'une liste : bouton **« Activité »** qui déroule le journal.

## 11. Partage par lien (invitation)
En plus du partage par e-mail, le propriétaire peut générer un **lien** (avec un
rôle lecture/modification). Quiconque ouvre le lien **en étant connecté** rejoint
la liste. Le lien est **révocable** à tout moment. Sans ces objets, le bouton
« Générer un lien » n'a simplement aucun effet.

Dans **SQL Editor → New query → Run** :

```sql
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  role text not null default 'viewer' check (role in ('viewer','editor')),
  created_at timestamptz not null default now()
);
create index if not exists share_links_list_id_idx on public.share_links(list_id);
alter table public.share_links enable row level security;
-- Le propriétaire gère les liens de SES listes.
drop policy if exists "owner_manages_links" on public.share_links;
create policy "owner_manages_links" on public.share_links
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id
    and exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));

-- Réclamer un lien : ajoute l'utilisateur connecté aux partages de la liste.
-- SECURITY DEFINER : il peut lire le lien par son token sans l'exposer au client.
create or replace function public.redeem_share_link(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_link public.share_links;
  v_me uuid := auth.uid();
  v_owner_email text; v_me_email text;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  select * into v_link from public.share_links where token = p_token;
  if v_link.id is null then raise exception 'invalid_link'; end if;
  if v_link.owner_id = v_me then return v_link.list_id; end if;   -- c'est déjà ta liste
  select email into v_owner_email from auth.users where id = v_link.owner_id;
  select email into v_me_email from auth.users where id = v_me;
  insert into public.list_shares (list_id, owner_id, owner_email, shared_with, shared_with_email, role)
  values (v_link.list_id, v_link.owner_id, v_owner_email, v_me, v_me_email, v_link.role)
  on conflict (list_id, shared_with) do update set role = excluded.role;
  return v_link.list_id;
end; $$;
revoke all on function public.redeem_share_link(uuid) from public, anon;
grant execute on function public.redeem_share_link(uuid) to authenticated;
```

Le lien a la forme `https://ton-domaine/#join=<token>`. En l'ouvrant, l'app le
réclame (après connexion si besoin) et t'ajoute à « Partagées avec moi ».

## Ce qui se passe ensuite
- À ta première connexion, si tu avais des listes en local, elles sont
  **automatiquement copiées** vers ton compte (une seule fois).
- Sans connexion (ou sans config Supabase), rien ne change : mode local.
