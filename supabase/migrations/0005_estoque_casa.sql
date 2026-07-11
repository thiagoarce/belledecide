-- Estoque atual da família (Épico 1: alimentado por NFC-e; Épico 2: usado para
-- calcular a lista de compras reversa).

create table estoque_casa (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references families(id) on delete cascade,
    produto_id uuid references produtos(id),
    nome_livre text,
    quantidade numeric not null,
    unidade_medida text,
    validade date,
    origem text not null default 'manual' check (origem in ('manual', 'nfce', 'ia')),
    data_entrada timestamptz not null default now(),
    constraint estoque_casa_produto_ou_nome check (
        produto_id is not null or nome_livre is not null
    )
);

create index idx_estoque_casa_family_id on estoque_casa(family_id);
create index idx_estoque_casa_produto_id on estoque_casa(produto_id);
create index idx_estoque_casa_validade on estoque_casa(family_id, validade)
    where validade is not null;
