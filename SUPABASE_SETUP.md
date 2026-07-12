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

-- Historique d'IV ATM (1 ligne/jour/symbole) → VRAI IV Rank 52 semaines façon
-- broker. Alimenté par le réchauffeur (/api/warm) + le scoring ; lu par
-- /api/stocks/auto-score. Optionnel : sans cette table, l'app affiche l'IV Rank
-- ESTIMÉ (vol réalisée sur ~1 an) et rien ne casse.
create table if not exists public.iv_history (
  symbol text not null,
  d date not null,
  iv numeric not null,
  primary key (symbol, d)
);
alter table public.iv_history enable row level security;
-- Aucune policy publique : seule la clé "service_role" (serveur) y accède.

-- Historique des SIGNAUX (dataset de validation/backtest du score) : le vecteur
-- complet du jour par (symbole, date, indice, échéance). Alimenté par le scoring.
-- Optionnel : sans cette table, le scoring fonctionne, on ne collecte juste pas
-- de données de validation (rien ne casse).
create table if not exists public.signal_history (
  symbol text not null,
  d date not null,
  index_symbol text not null default 'SPX',
  duration int not null default 30,
  score numeric,
  corr_score numeric, ivrank_score numeric, earnings_score numeric,
  idio_score numeric, liq_score numeric,
  rho_impl numeric, rho_real numeric, iv numeric, hv numeric, iv_rank numeric,
  spread_pct numeric, price numeric,
  earnings_in_window boolean,
  rho_impl_source text, iv_source text, iv_rank_method text,
  primary key (symbol, d, index_symbol, duration)
);
alter table public.signal_history enable row level security;
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

### 7b. Pré-remplir le cache des résultats (earnings) — recommandé

Le sous-score « Risque événement » lit le prochain **earnings** de chaque titre
(Finnhub). Finnhub est plafonné (~60 appels/min) → sans pré-remplissage, en
descendant dans une longue liste de composants, les titres du bas finissent par
afficher « momentanément indisponible ».

`/api/earnings/warm` remplit le cache Supabase (`EARN:<sym>`) **de façon régulée
et en rotation** (une tranche de l'univers par exécution). L'app lit alors le
cache au lieu d'appeler Finnhub pendant le scoring.

**Cron externe** (comme le réchauffeur d'IV), **toutes les ~3 min** :
```
GET https://TON-DOMAINE/api/earnings/warm?key=LA_CLE
```
- Clé = `WARM_KEY` (ou `ALERTS_KEY`). Nécessite `FINNHUB_API_KEY` + `SUPABASE_SERVICE_KEY`.
- Couvre tout l'univers (tous les indices) sur plusieurs passes, puis le rafraîchit
  en boucle. Cache valable 24 h. Sans ce cron, le cache se remplit quand même peu
  à peu au fil des scores (plus lentement, avec des « indisponible » transitoires).
- Note : la couverture earnings de Finnhub est surtout US ; certains composants
  européens (CAC/DAX) peuvent rester sans date (« aucun résultat »).

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

### 8b. Suivi quotidien automatique des positions (mark-to-market)
Un **relevé quotidien** (snapshot) reprend chaque position **ouverte** au marché
réel Cboe (spot + IV ATM par jambe, différé 15 min) et l'ajoute à l'historique
`snapshots` — d'où la **courbe P&L** et les Δ **vs entrée** / **vs veille** dans
l'écran de suivi. Le P&L est théorique au mid (relation de Brenner–Subrahmanyam
sur les straddles ATM), piloté par les vraies variations de spot et d'IV.

**Cron externe** (comme le réchauffeur d'IV et les alertes) — ex. cron-job.org :
```
GET https://TON-DOMAINE/api/monitor/snapshot-run?key=LA_CLE
```
- **Cadence au choix** : `1×/jour` après clôture US (historique quotidien propre)
  ou **toutes les 15 min pendant la séance** (suivi intraday). `15 min` est le
  **plancher utile** (les données Cboe sont différées de 15 min ; plus fréquent =
  mêmes données). L'historique est **compacté** automatiquement (tous les points
  du jour + 1 point de clôture par jour antérieur) → le stockage reste borné même
  à 15 min.
- Clé = `ALERTS_KEY` si définie, sinon `WARM_KEY` (déjà en place).
- Nécessite `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (déjà présents si le cache IV
  ou les alertes sont configurés) : le cron lit/écrit **toutes** les positions
  ouvertes via la clé service role (bypass RLS).
- Couverture : indices US + composants US = valorisés au marché ; composants
  **européens** (CAC/DAX, sans options US) → estimés en décroissance temporelle
  et marqués non couverts. Aucune config n'est requise côté client.
- **Affichage temps réel indépendant du cron** : à l'ouverture d'une position,
  l'app fait une **reprise live** (≤ 15 min) pour afficher des chiffres frais sans
  rien persister (bouton **« Actualiser »**). Le bouton **« Snapshot »** enregistre
  un point à la demande. Le cron n'est donc utile que pour bâtir l'**historique**.

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
    -- strategies.list_id est en TEXT, list_shares.list_id en UUID → cast.
    exists (select 1 from public.list_shares s where s.list_id::text = strategies.list_id and s.shared_with = auth.uid())
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

## 12. Accès « Pro » (module Auto-chercheur d'opportunités)
Le module **Opportunités Pro** (auto-chercheur des meilleurs paniers d'un indice)
n'apparaît que pour les comptes autorisés. Simple table + RLS : chacun lit sa
propre ligne, personne ne peut s'auto-attribuer le Pro (les octrois se font en SQL).

Dans **SQL Editor → New query → Run** :

```sql
create table if not exists public.pro_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  since timestamptz not null default now()
);
alter table public.pro_access enable row level security;
drop policy if exists "read_own_pro" on public.pro_access;
create policy "read_own_pro" on public.pro_access
  for select using (auth.uid() = user_id);
```

**T'activer en Pro** (par e-mail — remplace l'adresse) :
```sql
insert into public.pro_access (user_id)
select id from auth.users where lower(email) = lower('ton-email@exemple.com')
on conflict (user_id) do nothing;
```
Recharge la page après : l'entrée **« Opportunités »** apparaît dans la barre
latérale. Pour retirer l'accès : `delete from public.pro_access where user_id =
(select id from auth.users where lower(email) = lower('ton-email@exemple.com'));`.

## 13. Paiement Pro par abonnement Stripe (optionnel)
Permet à un utilisateur de **passer Pro tout seul** en payant (abonnement
mensuel), sans octroi manuel en SQL. Le navigateur ne fait que déclencher le
paiement ; c'est le **webhook Stripe** (serveur, clé service role) qui accorde
réellement le Pro. Non-cassant : sans les variables d'env Stripe, le bouton
« Passer Pro » renvoie « paiement indisponible » et l'octroi manuel (§12) marche
toujours.

**1) Colonnes d'abonnement** (SQL Editor → Run). Les octrois manuels du §12
restent valides (`status` par défaut = `active`, pas d'expiration) :
```sql
alter table public.pro_access
  add column if not exists status               text default 'active',
  add column if not exists stripe_customer_id   text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end   timestamptz;
create index if not exists pro_access_sub_idx
  on public.pro_access (stripe_subscription_id);
```
> La RLS reste en **lecture de sa propre ligne** uniquement. Les écritures se
> font exclusivement via la clé **service role** (webhook serveur) — le client
> n'écrit jamais dans cette table.

**2) Côté Stripe** (dashboard) :
- Crée un **produit** « DispersionX Pro » avec un **prix récurrent mensuel** →
  note son **Price ID** (`price_…`).
- Crée un **webhook** vers `https://TON-DOMAINE/api/pro/webhook`, événements :
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted` → note le **signing secret** (`whsec_…`).
- Active le **Customer Portal** (Settings → Billing → Customer portal) : c'est ce
  qui alimente le bouton « Gérer l'abonnement » (`/api/pro/portal`, résiliation /
  carte / factures depuis l'app). Aucune clé supplémentaire.

**3) Variables d'environnement Vercel** (Project → Settings → Environment
Variables) — **jamais** exposées au client :
```
STRIPE_SECRET_KEY        = sk_live_… (ou sk_test_…)
STRIPE_PRICE_ID          = price_…
STRIPE_WEBHOOK_SECRET    = whsec_…
SUPABASE_URL             = https://xxxx.supabase.co   (déjà présent si cache IV)
SUPABASE_SERVICE_KEY     = clé service role           (déjà présent si cache IV)
APP_URL                  = https://ton-domaine        (repli si l'origine manque)
```
Redéploie. Teste d'abord en **mode test** Stripe (carte `4242 4242 4242 4242`).
À la fin du paiement, le retour `?pro=success` rafraîchit l'accès ; le webhook a
écrit `status='active'` + `current_period_end`. À la résiliation, Stripe envoie
`customer.subscription.deleted` → `status='canceled'` → le Pro se retire tout seul.

## 14. Alertes de corrélation (optionnel)
Permet à un utilisateur d'être prévenu quand la corrélation implicite d'un indice
dépasse un percentile (le moment où une dispersion devient attractive). Chacun
gère ses alertes (RLS). Un cron externe les évalue ; l'e-mail est facultatif.

**1) Table + RLS** (SQL Editor → Run) :
```sql
create table if not exists public.alerts (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  email          text,
  index_symbol   text not null,
  kind           text not null default 'impl_corr_pct',
  threshold      int  not null default 80,
  tickers        jsonb not null default '[]',
  active         boolean not null default true,
  last_percentile int,
  triggered_at   timestamptz,
  notified_at    timestamptz,
  created_at     timestamptz not null default now()
);
alter table public.alerts enable row level security;
drop policy if exists "alerts_rw" on public.alerts;
create policy "alerts_rw" on public.alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
> Les écritures du cron passent par la clé **service role** (bypass RLS). Le
> navigateur ne lit/écrit que ses propres alertes.

**2) Cron externe** (comme le réchauffeur d'IV) — ex. cron-job.org, **~1×/jour
après la clôture US** :
```
GET https://TON-DOMAINE/api/alerts/run?key=LA_CLE
```
La clé = `ALERTS_KEY` si définie, sinon `WARM_KEY` (déjà en place). Déclenchement
sur **front** : un e-mail est envoyé au passage au-dessus du seuil, pas à chaque
exécution ; l'alerte se ré-arme quand la corrélation repasse sous le seuil.

**3) E-mail (facultatif, via Resend)** — variables d'env Vercel :
```
RESEND_API_KEY = re_…                    (https://resend.com, offre gratuite)
ALERTS_FROM    = alertes@ton-domaine     (expéditeur vérifié chez Resend)
APP_URL        = https://ton-domaine     (lien dans l'e-mail)
```
Sans ces variables, l'alerte se déclenche quand même et reste **visible dans
l'app** (statut « Déclenchée le … ») — seul l'e-mail est désactivé.

## 15. Journal de trades (optionnel)
Permet à un abonné d'enregistrer ses dispersions et de suivre sa performance
(réalisé vs attendu, taux de réussite, P&L cumulé). Chacun gère les siens (RLS).

Dans **SQL Editor → New query → Run** :
```sql
create table if not exists public.trades (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  label        text,
  index_symbol text,
  tickers      jsonb not null default '[]',
  entry_date   date,
  horizon      int,
  entry_pct    int,          -- percentile de corrélation implicite à l'entrée
  entry_prime  numeric,      -- prime attendue (pts)
  status       text not null default 'open',   -- open | closed
  exit_date    date,
  pnl          numeric,      -- P&L réalisé saisi par l'utilisateur
  outcome      text,         -- win | loss | flat
  notes        text,
  created_at   timestamptz not null default now()
);
alter table public.trades enable row level security;
drop policy if exists "trades_rw" on public.trades;
create policy "trades_rw" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
Le P&L est **saisi par l'utilisateur** (son suivi réel). Un bouton « Journaliser »
sur chaque opportunité pré-remplit une entrée.

## 16. Groupes de listes (optionnel)

Permet d'organiser les listes en **groupes/dossiers** (vue « Groupes » de l'écran
Mes listes). Une seule colonne à ajouter — **non-cassant** : sans cette migration,
l'app fonctionne comme avant, mais l'affectation d'une liste à un groupe échouera
avec un message invitant à l'appliquer.

```sql
-- Un groupe = une simple étiquette texte sur la liste (pas de table dédiée).
alter table public.lists add column if not exists group_name text;
```

Rien d'autre : la RLS existante de `lists` couvre déjà cette colonne, et le tri
chronologique s'appuie sur `created_at` (déjà présent).

### 16b. Groupes de positions (optionnel)

Même principe pour organiser les **positions suivies** en groupes (vue « Groupes »
de l'onglet Pro **Suivi**). Une seule colonne — **non-cassant** : sans elle, l'app
fonctionne comme avant, les positions locales (hors-ligne) rangent quand même leur
groupe en local, et l'affectation d'une position **cloud** échoue avec un message
invitant à appliquer cette migration.

```sql
-- Un groupe = une simple étiquette texte sur la position (pas de table dédiée).
alter table public.positions add column if not exists group_name text;
```

La RLS existante de `positions` couvre déjà cette colonne ; le tri chronologique
s'appuie sur `committed_at` (déjà présent).

## 17. Notifications « intelligentes » (fil Activité)

Notifications personnelles affichées, colorées, dans le fil **Activité** : dérive
des grecs / seuils de P&L des positions, expiration d'abonnement Pro, corrélation
attractive. Les clients les **lisent** (RLS) ; ce sont les **crons serveur** (clé
service) qui les **écrivent**. Non-cassant : sans cette table, l'app fonctionne
comme avant (les inserts des crons échouent silencieusement).

```sql
create table if not exists public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null,                 -- greek_drift | pnl | subscription | correlation
  tone        text not null default 'info',  -- pos | neg | warn | info
  title       text not null,
  body        text,
  ref         text,                          -- clé de dédup (anti-spam), ex. « pos:<id>:delta »
  created_at  timestamptz not null default now()
);
alter table public.notifications enable row level security;
-- Lecture : chacun voit UNIQUEMENT les siennes. Écriture réservée à la clé service.
drop policy if exists "notifications_read" on public.notifications;
create policy "notifications_read" on public.notifications
  for select using (auth.uid() = user_id);
create index if not exists notifications_user_created
  on public.notifications (user_id, created_at desc);
```

**Crons (scheduler externe, ex. cron-job.org), ~1×/jour après clôture US** — mêmes
`ALERTS_KEY` + `SUPABASE_SERVICE_KEY` que les crons existants :
- `GET /api/monitor/snapshot-run?key=…` → relevé des positions **+ notifs grecs/P&L** (déjà planifié pour le suivi).
- `GET /api/notifications/run?key=…` → **expiration d'abonnement** (paliers 7/3/1 j).
- `GET /api/alerts/run?key=…` → alertes de corrélation (insère aussi une notif quand elles se déclenchent).

Anti-spam : chaque notif porte un `ref` ; une même condition n'est ré-écrite qu'au
plus ~1×/20 h (dédup côté serveur).

## 18. Partage réservé à Pro — côté ÉMETTEUR **et** DESTINATAIRE (sécurité)

Le partage est une fonctionnalité Pro. L'app verrouille déjà l'émission côté
client, mais **la vraie protection est côté serveur (RLS)** : sans ça, il
suffirait qu'un compte Pro envoie un lien à un compte gratuit pour lui donner
accès au contenu Pro. Cette migration exige que **le destinataire soit Pro** pour
voir/rejoindre une liste partagée — impossible à contourner depuis le client.

Prérequis : §9 (partage), §11 (liens), §12 (`pro_access`). Non-cassant.

```sql
-- 0) Helper : l'utilisateur a-t-il un accès Pro ? (octroi manuel = présence
--    dans pro_access). SECURITY DEFINER pour lire pro_access d'autrui.
create or replace function public.is_pro(p_uid uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.pro_access p where p.user_id = p_uid);
$$;
revoke all on function public.is_pro(uuid) from public, anon;
grant execute on function public.is_pro(uuid) to authenticated;
-- (Abonnement Stripe §13 : pour exclure les abonnements EXPIRÉS, remplace le
--  exists ci-dessus par «  … and (p.current_period_end is null
--  or p.current_period_end > now()) ».)

-- 1) RLS : un destinataire NON-Pro ne voit RIEN de partagé.
drop policy if exists "recipient_reads_shares" on public.list_shares;
create policy "recipient_reads_shares" on public.list_shares
  for select using (auth.uid() = shared_with and public.is_pro(auth.uid()));

drop policy if exists "shared_lists_select" on public.lists;
create policy "shared_lists_select" on public.lists
  for select using (
    public.is_pro(auth.uid())
    and exists (select 1 from public.list_shares s where s.list_id = lists.id and s.shared_with = auth.uid())
  );

drop policy if exists "shared_items_select" on public.list_items;
create policy "shared_items_select" on public.list_items
  for select using (
    public.is_pro(auth.uid())
    and exists (select 1 from public.list_shares s where s.list_id = list_items.list_id and s.shared_with = auth.uid())
  );

drop policy if exists "shared_items_write" on public.list_items;
create policy "shared_items_write" on public.list_items
  for all using (
    public.is_pro(auth.uid())
    and exists (select 1 from public.list_shares s where s.list_id = list_items.list_id and s.shared_with = auth.uid() and s.role = 'editor')
  ) with check (
    public.is_pro(auth.uid())
    and exists (select 1 from public.list_shares s where s.list_id = list_items.list_id and s.shared_with = auth.uid() and s.role = 'editor')
  );

drop policy if exists "shared_strategies_select" on public.strategies;
create policy "shared_strategies_select" on public.strategies
  for select using (
    public.is_pro(auth.uid())
    and exists (select 1 from public.list_shares s where s.list_id::text = strategies.list_id and s.shared_with = auth.uid())
  );

-- 2) Réclamer un lien (redeem) : le destinataire DOIT être Pro.
create or replace function public.redeem_share_link(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_link public.share_links;
  v_me uuid := auth.uid();
  v_owner_email text; v_me_email text;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  if not public.is_pro(v_me) then raise exception 'pro_required'; end if;
  select * into v_link from public.share_links where token = p_token;
  if v_link.id is null then raise exception 'invalid_link'; end if;
  if v_link.owner_id = v_me then return v_link.list_id; end if;
  select email into v_owner_email from auth.users where id = v_link.owner_id;
  select email into v_me_email from auth.users where id = v_me;
  insert into public.list_shares (list_id, owner_id, owner_email, shared_with, shared_with_email, role)
  values (v_link.list_id, v_link.owner_id, v_owner_email, v_me, v_me_email, v_link.role)
  on conflict (list_id, shared_with) do update set role = excluded.role;
  return v_link.list_id;
end; $$;
revoke all on function public.redeem_share_link(uuid) from public, anon;
grant execute on function public.redeem_share_link(uuid) to authenticated;

-- 3) Partage par e-mail : le DESTINATAIRE doit être Pro (sinon l'envoi échoue).
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
  if not public.is_pro(v_target) then raise exception 'recipient_not_pro'; end if;
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

Effet : un compte gratuit qui reçoit un lien ou un partage e-mail **ne peut ni le
rejoindre ni voir la liste** ; l'émetteur reçoit une erreur claire s'il partage à
un e-mail non-Pro. Retirer le Pro d'un compte lui coupe l'accès aux listes reçues.

## 19. Enforcement serveur de la double authentification — RLS `aal2` (optionnel)

Rend la **MFA (TOTP)** vraiment contraignante côté serveur : un utilisateur qui a
**activé la 2FA** ne peut lire/écrire ses données **que** si sa session est de niveau
**AAL2** (mot de passe **+** code validé). Sans ce SQL, la 2FA n'est qu'un contrôle
côté client (le défi est demandé, mais une session AAL1 conserve techniquement l'accès).

Prérequis : MFA activée dans le projet (Authentication → MFA → TOTP). **Non-cassant** :
un compte **sans** facteur vérifié garde exactement l'accès actuel (AAL1 accepté).

> ⚠️ **Ne PAS lire `auth.mfa_factors` directement dans la policy.** Dans les projets
> Supabase récents, le rôle `authenticated` n'a **pas** le droit de lire cette table :
> l'expression de policy lève alors une erreur de permission pour **tous** les comptes
> (2FA comme non-2FA) → toutes les lectures cloud échouent et l'app tombe sur son repli
> invité (données qui *semblent* effacées / réinitialisées). L'ancien pattern « direct »
> de la doc Supabase est daté et casse sur les projets verrouillés. On passe donc par une
> fonction `security definer` (ci-dessous).
>
> Côté client, la **porte MFA globale** (`MfaGate` dans `js/app.jsx`, via l'événement
> `dx-mfa-required` émis par `src/cloud.js`) demande le code sur TOUS les modes d'entrée
> (mot de passe, OAuth, rechargement) → la session atteint bien AAL2.

**Étape A — fonction `security definer`.** Elle s'exécute avec les droits de son
propriétaire (`postgres`, qui *peut* lire `auth.mfa_factors`) et répond juste « ce
compte a-t-il un facteur vérifié ? ». SQL Editor → Run :

```sql
create or replace function public.dx_user_has_mfa()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from auth.mfa_factors
    where user_id = (select auth.uid()) and status = 'verified'
  );
$$;

revoke all on function public.dx_user_has_mfa() from public;
grant execute on function public.dx_user_has_mfa() to authenticated;
```

Vérifie qu'elle s'exécute **sans erreur** (doit renvoyer `true`/`false`) :
`select public.dx_user_has_mfa();`

**Étape B — policy restrictive** (ajoutée en ET logique) sur chaque table de données
personnelles, appelant la fonction au lieu de lire la table :

```sql
do $$
declare t text;
begin
  foreach t in array array[
    'lists','list_items','strategies','positions','list_shares',
    'share_links','audit_log','pro_access','alerts','trades','notifications'
  ] loop
    execute format('drop policy if exists "mfa_aal2" on public.%I;', t);
    execute format($f$
      create policy "mfa_aal2" on public.%I
        as restrictive to authenticated
        using (
          (select auth.jwt()->>'aal') = 'aal2'
          or not (select public.dx_user_has_mfa())
        )
        with check (
          (select auth.jwt()->>'aal') = 'aal2'
          or not (select public.dx_user_has_mfa())
        );
    $f$, t);
  end loop;
end $$;
```

Lecture de la règle : « AAL2 **ou** l'utilisateur n'a aucun facteur vérifié ». Donc
seuls les comptes ayant activé la 2FA sont contraints à l'AAL2 ; les autres inchangés.

**Tester (dans l'ordre)** : (1) compte **sans** 2FA → doit charger ses données
normalement, sans écran de code ; (2) compte **avec** 2FA → « Vérification en deux
étapes » → après le code (AAL2), tout revient ; (3) créer une liste puis se déconnecter
→ elle ne doit PAS réapparaître en invité ; (4) rechargement → OK.

**Retour arrière** (désactive l'enforcement — règle **et** fonction) :

```sql
do $$
declare t text;
begin
  foreach t in array array[
    'lists','list_items','strategies','positions','list_shares',
    'share_links','audit_log','pro_access','alerts','trades','notifications'
  ] loop
    execute format('drop policy if exists "mfa_aal2" on public.%I;', t);
  end loop;
end $$;
drop function if exists public.dx_user_has_mfa();
```

## Ce qui se passe ensuite
- À ta première connexion, si tu avais des listes en local, elles sont
  **automatiquement copiées** vers ton compte (une seule fois).
- Sans connexion (ou sans config Supabase), rien ne change : mode local.
