-- Série temporal de preços observados por produto/mercado — base do
-- "Semáforo de Preço" do Épico 3 (não implementado nesta fase, apenas os dados).

create table historico_precos (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references families(id) on delete cascade,
    produto_id uuid not null references produtos(id),
    mercado_nome text not null,
    mercado_cnpj text,
    preco_pago numeric not null check (preco_pago >= 0),
    observado_em timestamptz not null default now()
);

create index idx_historico_precos_family_id on historico_precos(family_id);
create index idx_historico_precos_produto_id on historico_precos(produto_id, observado_em desc);
