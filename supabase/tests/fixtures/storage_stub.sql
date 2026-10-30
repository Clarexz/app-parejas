-- Stub mínimo de las tablas de Storage para el CI.
-- En el VPS las crea el servicio de Storage (storage-api); la imagen supabase/postgres
-- solo trae el schema vacío. Con este stub las migraciones crean las políticas de
-- storage.objects y supabase/tests/ las prueba. NUNCA se aplica en el servidor.
-- Se corre como supabase_admin (el schema storage no es de postgres).

create table if not exists storage.buckets (
  id text primary key,
  name text not null unique,
  owner uuid,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored,
  version text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;

grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;

-- Mismo dueño que en el servidor: así el CI detecta si `postgres` no puede crear políticas.
alter table storage.objects owner to supabase_storage_admin;
alter table storage.buckets owner to supabase_storage_admin;
