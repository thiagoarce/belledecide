-- Épico 5 (spec apenas nesta fase — ver specs/05-epico-5-eventos.md):
-- schema de extensão para listas isoladas de eventos/ocasiões especiais.

create table eventos (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references families(id) on delete cascade,
    nome text not null,
    data_evento date,
    tipo text,
    created_at timestamptz not null default now()
);

create index idx_eventos_family_id on eventos(family_id);

create table evento_itens (
    id uuid primary key default gen_random_uuid(),
    evento_id uuid not null references eventos(id) on delete cascade,
    descricao text not null,
    quantidade text,
    local_sugerido text,
    comprado boolean not null default false
);

create index idx_evento_itens_evento_id on evento_itens(evento_id);
