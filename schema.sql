-- Execute este arquivo uma vez no SQL Editor do seu projeto Supabase.
create extension if not exists pgcrypto;

create table if not exists public.site_admins (
  id uuid primary key default gen_random_uuid(),
  slot smallint not null unique check (slot in (1, 2)),
  username text not null unique check (username = lower(username)),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('Institucional', 'Loja virtual', 'Landing page')),
  description text not null,
  price_label text not null default 'Sob consulta',
  demo_url text not null default '',
  image_url text not null default '',
  accent text not null default 'mint',
  badge text not null default 'PROJETO CONCEITUAL',
  mock_title text not null default '',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_whatsapp text not null,
  project_title text not null,
  brief text not null,
  status text not null default 'novo' check (status in ('novo', 'em_conversa', 'em_andamento', 'concluido', 'arquivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null
);

alter table public.site_admins enable row level security;
alter table public.projects enable row level security;
alter table public.orders enable row level security;
alter table public.site_settings enable row level security;

revoke all on public.site_admins, public.projects, public.orders, public.site_settings from anon, authenticated;
grant all on public.site_admins, public.projects, public.orders, public.site_settings to service_role;
grant usage, select on all sequences in schema public to service_role;

insert into public.site_settings (key, value) values
  ('brand_name', '"Raiz Studio"'::jsonb),
  ('tagline', '"Criamos sites rápidos, bonitos e pensados para transformar visitas em conversas."'::jsonb),
  ('whatsapp', '""'::jsonb),
  ('whatsapp_secondary', '""'::jsonb),
  ('instagram_url', '""'::jsonb),
  ('contact_email', '""'::jsonb)
on conflict (key) do nothing;

insert into public.projects (slug, title, category, description, price_label, accent, badge, mock_title, sort_order)
values
  ('casa-nativa', 'Casa Nativa', 'Institucional', 'Uma presença digital acolhedora para um estúdio de arquitetura e interiores.', 'Sob consulta', 'mint', 'ARQUITETURA', 'Espaços com histórias para contar.', 1),
  ('flor-de-sol', 'Flor de Sol', 'Loja virtual', 'Uma loja leve e intuitiva para uma marca independente de cuidado pessoal.', 'Sob consulta', 'sun', 'E-COMMERCE', 'Um cuidado que floresce.', 2),
  ('movimento-livre', 'Movimento Livre', 'Landing page', 'Uma página de campanha direta, feita para transformar interesse em contato.', 'Sob consulta', 'rose', 'CAMPANHA', 'Seu próximo passo começa aqui.', 3)
on conflict (slug) do nothing;
