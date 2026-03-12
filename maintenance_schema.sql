-- 9. Tabela de Sessões de Manutenção (NOVA)
create table if not exists public."maintenance_sessions" (
  "id" uuid default gen_random_uuid() primary key,
  "machineId" uuid references public."machines"("id") on delete cascade,
  "clientId" uuid references public."clients"("id") on delete cascade,
  "serviceOrderId" uuid references public."service_orders"("id") on delete set null,
  "technicianId" uuid references public."profiles"("id"),
  "status" text default 'Ativa',
  "partsUsed" jsonb default '[]'::jsonb,
  "services" jsonb default '[]'::jsonb,
  "observations" text,
  "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
  "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public."maintenance_sessions" enable row level security;

-- Política de acesso
drop policy if exists "Enable all access for authenticated users" on public."maintenance_sessions";
create policy "Enable all access for authenticated users" on public."maintenance_sessions" for all using (auth.role() = 'authenticated');
