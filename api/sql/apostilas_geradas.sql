-- ══════════════════════════════════════════════════════════
-- AprendAI — tabela "Minhas Apostilas" (histórico do aluno)
-- Rode este script uma vez no SQL Editor do Supabase antes de usar
-- o endpoint /api/apostilas.js.
--
-- Todo acesso a esta tabela é feito pelo backend (service_role key),
-- nunca diretamente pelo navegador do aluno — por isso o RLS fica
-- habilitado sem políticas: bloqueia qualquer acesso direto via
-- anon/authenticated key e força tudo a passar pela validação de
-- usuário feita em /api/apostilas.js.
-- ══════════════════════════════════════════════════════════

create table if not exists public.apostilas_geradas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  disciplina text not null,
  assunto text not null,
  banca text,
  modo text default 'livre',
  edital_orgao text,
  dados jsonb not null,
  criado_em timestamptz not null default now()
);

create index if not exists apostilas_geradas_user_id_idx
  on public.apostilas_geradas (user_id, criado_em desc);

alter table public.apostilas_geradas enable row level security;
