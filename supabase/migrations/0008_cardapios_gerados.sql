-- Épico 2: resultado de cada geração de cardápio via IA.

create table cardapios_gerados (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references families(id) on delete cascade,
    ideia_semente text not null,
    status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
    cardapio_json jsonb,
    lista_compras_json jsonb,
    guia_execucao_json jsonb,
    llm_model text,
    created_by uuid references auth.users(id),
    created_at timestamptz not null default now()
);

create index idx_cardapios_gerados_family_id on cardapios_gerados(family_id, created_at desc);
