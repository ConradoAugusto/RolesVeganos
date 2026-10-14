-- Rolês Veganos: estrutura do banco no Supabase.
-- Como usar: Supabase > SQL Editor > New query > cole este arquivo inteiro > Run.
-- Pode rodar de novo sem problema (usa "if not exists" / "or replace").

-- ============ Admins ============
-- Quem está nesta tabela pode editar o site. Depois de criar seu usuário em
-- Authentication > Users, rode:  insert into public.admins (user_id) select id from auth.users where email = 'SEU_EMAIL';
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

drop policy if exists "admin vê a si mesmo" on public.admins;
create policy "admin vê a si mesmo" on public.admins for select using (user_id = auth.uid());

-- ============ Conteúdo do site ============
-- Uma linha só (id = 1) com lugares, artigos, documentários, receitas e cupons em JSON.
create table if not exists public.conteudo (
  id int primary key default 1 check (id = 1),
  dados jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.conteudo enable row level security;

drop policy if exists "todos leem o conteúdo" on public.conteudo;
create policy "todos leem o conteúdo" on public.conteudo for select using (true);
drop policy if exists "admin cria o conteúdo" on public.conteudo;
create policy "admin cria o conteúdo" on public.conteudo for insert with check (public.eh_admin());
drop policy if exists "admin edita o conteúdo" on public.conteudo;
create policy "admin edita o conteúdo" on public.conteudo for update using (public.eh_admin()) with check (public.eh_admin());

-- ============ Avaliações dos lugares ============
create table if not exists public.avaliacoes (
  id text primary key,
  place_id text not null,
  user_name text not null check (char_length(user_name) between 2 and 40),
  nota int not null check (nota between 1 and 5),
  texto text not null check (char_length(texto) between 10 and 600),
  data date not null default current_date,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  criado_em timestamptz not null default now()
);
alter table public.avaliacoes enable row level security;

drop policy if exists "todos veem avaliações aprovadas" on public.avaliacoes;
create policy "todos veem avaliações aprovadas" on public.avaliacoes for select using (status = 'aprovado' or public.eh_admin());
drop policy if exists "visitante envia avaliação pendente" on public.avaliacoes;
create policy "visitante envia avaliação pendente" on public.avaliacoes for insert with check (status = 'pendente' or public.eh_admin());
drop policy if exists "admin modera avaliações" on public.avaliacoes;
create policy "admin modera avaliações" on public.avaliacoes for update using (public.eh_admin());
drop policy if exists "admin apaga avaliações" on public.avaliacoes;
create policy "admin apaga avaliações" on public.avaliacoes for delete using (public.eh_admin());

-- ============ Comentários do blog ============
create table if not exists public.comentarios (
  id text primary key,
  post_id text not null,
  user_name text not null check (char_length(user_name) between 1 and 40),
  texto text not null check (char_length(texto) between 3 and 500),
  data date not null default current_date,
  criado_em timestamptz not null default now()
);
alter table public.comentarios enable row level security;

drop policy if exists "todos leem comentários" on public.comentarios;
create policy "todos leem comentários" on public.comentarios for select using (true);
drop policy if exists "visitante comenta" on public.comentarios;
create policy "visitante comenta" on public.comentarios for insert with check (true);
drop policy if exists "admin apaga comentários" on public.comentarios;
create policy "admin apaga comentários" on public.comentarios for delete using (public.eh_admin());

-- ============ Imagens (fotos de lugares, receitas, pôsteres, capas) ============
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do nothing;

drop policy if exists "todos veem imagens" on storage.objects;
create policy "todos veem imagens" on storage.objects for select using (bucket_id = 'imagens');
drop policy if exists "admin envia imagens" on storage.objects;
create policy "admin envia imagens" on storage.objects for insert with check (bucket_id = 'imagens' and public.eh_admin());
drop policy if exists "admin apaga imagens" on storage.objects;
create policy "admin apaga imagens" on storage.objects for delete using (bucket_id = 'imagens' and public.eh_admin());
