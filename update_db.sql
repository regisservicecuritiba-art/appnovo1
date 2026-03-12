-- 1. Migração de Dados (Padronização de Status)
-- O novo frontend utiliza "Em Execução" e "Finalizada". 
-- Se houver registros antigos com "Em Andamento" ou "Concluída", atualizamos aqui.

UPDATE public.service_orders
SET status = 'Em Execução'
WHERE status = 'Em Andamento';

UPDATE public.service_orders
SET status = 'Finalizada'
WHERE status = 'Concluída';

-- 2. Garantir tabela de PMOCs
-- Caso você ainda não tenha rodado o schema anterior completo.

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

-- 3. Políticas de Segurança (RLS) para PMOC
alter table public."pmocs" enable row level security;

drop policy if exists "Enable all access for authenticated users" on public."pmocs";
create policy "Enable all access for authenticated users" on public."pmocs" for all using (auth.role() = 'authenticated');

-- 4. Suporte a múltiplas máquinas em OS
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS "machineIds" jsonb DEFAULT '[]'::jsonb;

-- 5. Tabela de Serviços (Catálogo)
create table if not exists public."services" (
  "id" uuid default gen_random_uuid() primary key,
  "name" text not null,
  "category" text,
  "value" numeric default 0,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public."services" enable row level security;

drop policy if exists "Enable all access for authenticated users" on public."services";
create policy "Enable all access for authenticated users" on public."services" for all using (auth.role() = 'authenticated');
