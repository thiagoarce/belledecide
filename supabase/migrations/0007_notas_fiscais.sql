-- Épico 1: registro de cada NFC-e escaneada e seus itens extraídos.
-- 'status' modela explicitamente os casos de falha graciosa (ver specs/01-*.md).

create table notas_fiscais (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references families(id) on delete cascade,
    uploaded_by uuid references auth.users(id),
    chave_acesso text not null,
    uf text not null,
    qr_url text not null,
    status text not null default 'pending' check (status in (
        'pending', 'parsed', 'partial', 'parse_failed',
        'fetch_failed', 'unsupported_uf', 'duplicate'
    )),
    mercado_nome text,
    mercado_cnpj text,
    emitida_em timestamptz,
    parse_error text,
    created_at timestamptz not null default now(),
    unique (family_id, chave_acesso)
);

create index idx_notas_fiscais_family_id on notas_fiscais(family_id, created_at desc);

create table notas_fiscais_itens (
    id uuid primary key default gen_random_uuid(),
    nota_id uuid not null references notas_fiscais(id) on delete cascade,
    produto_id uuid references produtos(id),
    descricao_extraida text not null,
    quantidade numeric not null,
    unidade text,
    valor_unitario numeric,
    valor_total numeric,
    matched_confidence numeric check (matched_confidence between 0 and 1)
);

create index idx_notas_fiscais_itens_nota_id on notas_fiscais_itens(nota_id);
