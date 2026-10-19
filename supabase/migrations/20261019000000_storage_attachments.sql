-- Re-Alimenta · Storage de evidencias
-- Bucket privado y políticas RLS para que el JWT del usuario solo pueda
-- leer/escribir objetos de organizaciones a las que pertenece.
--
-- Convención de ruta (generada por el backend):
--   {organization_id}/{resource_type}/{resource_id}/{uuid}.{ext}

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'donation-evidence',
  'donation-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Primer segmento de la ruta como UUID; null si la ruta no cumple el formato.
create or replace function public.storage_path_org(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  segment text;
begin
  segment := (storage.foldername(object_name))[1];
  return segment::uuid;
exception
  when others then
    return null;
end;
$$;

revoke all on function public.storage_path_org(text) from public;
grant execute on function public.storage_path_org(text) to authenticated;

drop policy if exists re_alimenta_storage_select on storage.objects;
create policy re_alimenta_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'donation-evidence'
    and public.is_org_member(public.storage_path_org(name))
  );

drop policy if exists re_alimenta_storage_insert on storage.objects;
create policy re_alimenta_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'donation-evidence'
    and public.is_org_member(public.storage_path_org(name))
  );

drop policy if exists re_alimenta_storage_update on storage.objects;
create policy re_alimenta_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'donation-evidence'
    and public.is_org_member(public.storage_path_org(name))
  )
  with check (
    bucket_id = 'donation-evidence'
    and public.is_org_member(public.storage_path_org(name))
  );

drop policy if exists re_alimenta_storage_delete on storage.objects;
create policy re_alimenta_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'donation-evidence'
    and public.is_org_member(public.storage_path_org(name))
  );
