-- ATENÇÃO: Rode este script no SQL Editor do Supabase para atualizar a estrutura

-- 1. Tabela de Perfis (Vinculada ao Auth do Supabase)
create table if not exists public."profiles" (
  "id" uuid references auth.users not null primary key,
  "email" text,
  "name" text,
  "role" text default 'TECNICO',
  "avatar" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Clientes
create table if not exists public."clients" (
  "id" uuid default gen_random_uuid() primary key,
  "name" text not null,
  "document" text,
  "phone" text,
  "whatsapp" text,
  "email" text,
  "address" text,
  "type" text, 
  "notes" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de Máquinas
create table if not exists public."machines" (
  "id" uuid default gen_random_uuid() primary key,
  "clientId" uuid references public."clients"("id") on delete cascade,
  "type" text,
  "brand" text,
  "model" text,
  "capacityBTU" numeric,
  "serialNumber" text,
  "location" text,
  "installDate" text,
  "warrantyEnd" text,
  "technicianId" uuid, 
  "notes" text,
  "qrCodeData" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabela de Peças
create table if not exists public."parts" (
  "id" uuid default gen_random_uuid() primary key,
  "name" text not null,
  "code" text,
  "category" text,
  "unitValue" numeric default 0,
  "costPrice" numeric default 0,
  "unit" text,
  "stock" numeric default 0,
  "minStock" numeric default 0,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabela de Ordens de Serviço
create table if not exists public."service_orders" (
  "id" uuid default gen_random_uuid() primary key,
  "clientId" uuid references public."clients"("id"),
  "machineId" uuid references public."machines"("id"),
  "machineIds" jsonb default '[]'::jsonb,
  "technicianId" uuid references public."profiles"("id"),
  "type" text,
  "date" text,
  "status" text,
  "checklist" jsonb default '[]'::jsonb,
  "partsUsed" jsonb default '[]'::jsonb,
  "services" jsonb default '[]'::jsonb,
  "discount" numeric default 0,
  "total" numeric default 0,
  "paymentMethod" text,
  "technicianSignature" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tabela de PMOC (NOVA)
create table if not exists public."pmocs" (
  "id" uuid default gen_random_uuid() primary key,
  "clientId" uuid references public."clients"("id"),
  "technicianId" uuid references public."profiles"("id"),
  "date" timestamp with time zone default timezone('utc'::text, now()) not null,
  "machines" jsonb default '[]'::jsonb,
  "readings" jsonb default '{}'::jsonb,
  "status" text default 'Gerado',
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Trigger Otimizada
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public."profiles" ("id", "email", "name", "role", "avatar")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Novo Usuário'),
    coalesce(new.raw_user_meta_data->>'role', 'TECNICO'),
    'https://ui-avatars.com/api/?name=' || replace(coalesce(new.raw_user_meta_data->>'name', 'User'), ' ', '+')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Habilitar RLS e Políticas
alter table public."profiles" enable row level security;
alter table public."clients" enable row level security;
alter table public."machines" enable row level security;
alter table public."parts" enable row level security;
alter table public."service_orders" enable row level security;
alter table public."pmocs" enable row level security;

drop policy if exists "Enable all access for authenticated users" on public."profiles";
create policy "Enable all access for authenticated users" on public."profiles" for all using (auth.role() = 'authenticated');

drop policy if exists "Enable all access for authenticated users" on public."clients";
create policy "Enable all access for authenticated users" on public."clients" for all using (auth.role() = 'authenticated');

drop policy if exists "Enable all access for authenticated users" on public."machines";
create policy "Enable all access for authenticated users" on public."machines" for all using (auth.role() = 'authenticated');

drop policy if exists "Enable all access for authenticated users" on public."parts";
create policy "Enable all access for authenticated users" on public."parts" for all using (auth.role() = 'authenticated');

drop policy if exists "Enable all access for authenticated users" on public."service_orders";
create policy "Enable all access for authenticated users" on public."service_orders" for all using (auth.role() = 'authenticated');

drop policy if exists "Enable all access for authenticated users" on public."pmocs";
create policy "Enable all access for authenticated users" on public."pmocs" for all using (auth.role() = 'authenticated');

-- 4. Suporte a múltiplas máquinas em OS
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS "machineIds" jsonb DEFAULT '[]'::jsonb;
