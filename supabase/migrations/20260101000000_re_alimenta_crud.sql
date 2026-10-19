-- Re-Alimenta · esquema base del CRUD
-- Ejecutar en Supabase: `supabase db push` o SQL Editor (ver README).
-- No destruye datos existentes: todo es CREATE ... IF NOT EXISTS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Función de updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tablas
-- auth.users es administrada por Supabase Auth; el diagrama la llamaba
-- `auth_users` y no se replica: las tablas de negocio la referencian.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  type text not null,
  tax_id text not null unique,
  verification_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  label text not null,
  address_line text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  donor_organization_id uuid not null references public.organizations (id) on delete restrict,
  recipient_organization_id uuid references public.organizations (id) on delete set null,
  pickup_address_id uuid not null references public.addresses (id) on delete restrict,
  delivery_address_id uuid references public.addresses (id) on delete set null,
  status text not null default 'draft',
  description text,
  available_from date,
  available_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donations_available_range check (
    available_from is null
    or available_until is null
    or available_until >= available_from
  )
);

create table if not exists public.donation_items (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations (id) on delete cascade,
  name text not null,
  quantity numeric(12, 2) not null check (quantity > 0),
  category text not null,
  condition text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations (id) on delete cascade,
  courier_id uuid references auth.users (id) on delete set null,
  origin_address_id uuid not null references public.addresses (id) on delete restrict,
  destination_address_id uuid not null references public.addresses (id) on delete restrict,
  status text not null default 'pending',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  status text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  occurred_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid references auth.users (id) on delete set null,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  resource_type text not null,
  resource_id uuid not null,
  storage_path text not null unique,
  mime_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists addresses_organization_id_idx on public.addresses (organization_id);
create index if not exists organization_members_organization_id_idx on public.organization_members (organization_id);
create index if not exists organization_members_user_id_idx on public.organization_members (user_id);
create index if not exists donations_donor_organization_id_idx on public.donations (donor_organization_id);
create index if not exists donations_recipient_organization_id_idx on public.donations (recipient_organization_id);
create index if not exists donations_status_idx on public.donations (status);
create index if not exists donation_items_donation_id_idx on public.donation_items (donation_id);
create index if not exists deliveries_donation_id_idx on public.deliveries (donation_id);
create index if not exists deliveries_courier_id_idx on public.deliveries (courier_id);
create index if not exists deliveries_status_idx on public.deliveries (status);
create index if not exists delivery_events_delivery_id_idx on public.delivery_events (delivery_id);
create index if not exists attachments_organization_id_idx on public.attachments (organization_id);
create index if not exists attachments_resource_idx on public.attachments (resource_type, resource_id);
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);

-- ---------------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'organizations', 'addresses', 'organization_members',
    'donations', 'donation_items', 'deliveries', 'attachments'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at
         before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helpers de autorización (SECURITY DEFINER evita recursión de RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.org_has_members(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.organization_members m where m.organization_id = org);
$$;

create or replace function public.can_access_donation(donation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.donations d
    where d.id = donation
      and (
        d.status = 'published'
        or public.is_org_member(d.donor_organization_id)
        or (d.recipient_organization_id is not null and public.is_org_member(d.recipient_organization_id))
      )
  );
$$;

create or replace function public.can_access_delivery(delivery uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deliveries d
    where d.id = delivery
      and (public.can_access_donation(d.donation_id) or d.courier_id = auth.uid())
  );
$$;

grant execute on function
  public.is_org_member(uuid),
  public.is_org_admin(uuid),
  public.org_has_members(uuid),
  public.can_access_donation(uuid),
  public.can_access_delivery(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.addresses enable row level security;
alter table public.organization_members enable row level security;
alter table public.donations enable row level security;
alter table public.donation_items enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_events enable row level security;
alter table public.attachments enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: cada usuario solo el suyo
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete to authenticated using (id = auth.uid());

-- organizations: visibles/administrables por sus miembros
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select to authenticated using (public.is_org_member(id));

drop policy if exists organizations_insert_authenticated on public.organizations;
create policy organizations_insert_authenticated on public.organizations
  for insert to authenticated with check (auth.uid() is not null);

drop policy if exists organizations_update_admin on public.organizations;
create policy organizations_update_admin on public.organizations
  for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));

drop policy if exists organizations_delete_admin on public.organizations;
create policy organizations_delete_admin on public.organizations
  for delete to authenticated using (public.is_org_admin(id));

-- addresses: según pertenencia a la organización
drop policy if exists addresses_select_member on public.addresses;
create policy addresses_select_member on public.addresses
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists addresses_insert_member on public.addresses;
create policy addresses_insert_member on public.addresses
  for insert to authenticated with check (public.is_org_member(organization_id));

drop policy if exists addresses_update_member on public.addresses;
create policy addresses_update_member on public.addresses
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists addresses_delete_admin on public.addresses;
create policy addresses_delete_admin on public.addresses
  for delete to authenticated using (public.is_org_admin(organization_id));

-- organization_members
drop policy if exists organization_members_select on public.organization_members;
create policy organization_members_select on public.organization_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));

drop policy if exists organization_members_insert on public.organization_members;
create policy organization_members_insert on public.organization_members
  for insert to authenticated
  with check (
    public.is_org_admin(organization_id)
    or (user_id = auth.uid() and not public.org_has_members(organization_id))
  );

drop policy if exists organization_members_update_admin on public.organization_members;
create policy organization_members_update_admin on public.organization_members
  for update to authenticated
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

drop policy if exists organization_members_delete on public.organization_members;
create policy organization_members_delete on public.organization_members
  for delete to authenticated
  using (public.is_org_admin(organization_id) or user_id = auth.uid());

-- donations
drop policy if exists donations_select on public.donations;
create policy donations_select on public.donations
  for select to authenticated using (public.can_access_donation(id));

drop policy if exists donations_insert_donor_member on public.donations;
create policy donations_insert_donor_member on public.donations
  for insert to authenticated with check (public.is_org_member(donor_organization_id));

drop policy if exists donations_update_member on public.donations;
create policy donations_update_member on public.donations
  for update to authenticated
  using (
    public.is_org_member(donor_organization_id)
    or (recipient_organization_id is not null and public.is_org_member(recipient_organization_id))
  )
  with check (
    public.is_org_member(donor_organization_id)
    or (recipient_organization_id is not null and public.is_org_member(recipient_organization_id))
  );

drop policy if exists donations_delete_donor_member on public.donations;
create policy donations_delete_donor_member on public.donations
  for delete to authenticated
  using (public.is_org_member(donor_organization_id) and status in ('draft', 'cancelled'));

-- donation_items
drop policy if exists donation_items_select on public.donation_items;
create policy donation_items_select on public.donation_items
  for select to authenticated using (public.can_access_donation(donation_id));

drop policy if exists donation_items_write on public.donation_items;
create policy donation_items_write on public.donation_items
  for insert to authenticated with check (public.is_org_member(
    (select donor_organization_id from public.donations where id = donation_id)
  ));

drop policy if exists donation_items_update on public.donation_items;
create policy donation_items_update on public.donation_items
  for update to authenticated
  using (public.can_access_donation(donation_id))
  with check (public.can_access_donation(donation_id));

drop policy if exists donation_items_delete on public.donation_items;
create policy donation_items_delete on public.donation_items
  for delete to authenticated using (public.can_access_donation(donation_id));

-- deliveries
drop policy if exists deliveries_select on public.deliveries;
create policy deliveries_select on public.deliveries
  for select to authenticated
  using (public.can_access_donation(donation_id) or courier_id = auth.uid());

drop policy if exists deliveries_insert on public.deliveries;
create policy deliveries_insert on public.deliveries
  for insert to authenticated with check (public.can_access_donation(donation_id));

drop policy if exists deliveries_update on public.deliveries;
create policy deliveries_update on public.deliveries
  for update to authenticated
  using (public.can_access_donation(donation_id) or courier_id = auth.uid())
  with check (public.can_access_donation(donation_id) or courier_id = auth.uid());

drop policy if exists deliveries_delete on public.deliveries;
create policy deliveries_delete on public.deliveries
  for delete to authenticated
  using (public.is_org_member(
    (select donor_organization_id from public.donations where id = donation_id)
  ) and status = 'pending');

-- delivery_events: historial inmutable desde el cliente
drop policy if exists delivery_events_select on public.delivery_events;
create policy delivery_events_select on public.delivery_events
  for select to authenticated using (public.can_access_delivery(delivery_id));

drop policy if exists delivery_events_insert on public.delivery_events;
create policy delivery_events_insert on public.delivery_events
  for insert to authenticated with check (public.can_access_delivery(delivery_id) and actor_id = auth.uid());

-- Sin políticas de update/delete: el historial no se modifica ni se borra.

-- attachments
drop policy if exists attachments_select on public.attachments;
create policy attachments_select on public.attachments
  for select to authenticated using (public.is_org_member(organization_id));

drop policy if exists attachments_insert on public.attachments;
create policy attachments_insert on public.attachments
  for insert to authenticated with check (public.is_org_member(organization_id) and uploaded_by = auth.uid());

drop policy if exists attachments_update on public.attachments;
create policy attachments_update on public.attachments
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

drop policy if exists attachments_delete on public.attachments;
create policy attachments_delete on public.attachments
  for delete to authenticated using (public.is_org_member(organization_id));

-- audit_logs: solo lectura de los propios registros; la escritura es del servidor
-- (service role, que omite RLS).
drop policy if exists audit_logs_select_own on public.audit_logs;
create policy audit_logs_select_own on public.audit_logs
  for select to authenticated using (actor_id = auth.uid());
