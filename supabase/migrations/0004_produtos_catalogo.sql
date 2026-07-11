-- Catálogo global de produtos (não tenant-scoped): permite reuso de matching
-- e histórico de preço entre famílias diferentes.

create table produtos (
    id uuid primary key default gen_random_uuid(),
    codigo_barras text unique,
    nome_normalizado text not null,
    categoria text,
    unidade_padrao text,
    aliases text[] not null default '{}',
    created_at timestamptz not null default now()
);

-- Suporta matching por similaridade de texto (itens de NFC-e vêm com nomes
-- livres e variações, ex: "ARROZ TIO JOAO 5KG" vs "Arroz").
create index idx_produtos_nome_trgm on produtos using gin (nome_normalizado gin_trgm_ops);

-- Matching heurístico usado pelo Worker ao propagar itens de NFC-e para o
-- catálogo (Épico 1) — evita LLM no caminho crítico de escaneamento.
-- Ver specs/01-epico-1-abastecimento-passivo.md.
create function public.match_produto(busca text, min_similarity real default 0.35)
returns table(produto_id uuid, similarity real)
language sql
stable
as $$
    select id, similarity(nome_normalizado, busca) as similarity
    from produtos
    where similarity(nome_normalizado, busca) >= min_similarity
    order by similarity desc
    limit 1;
$$;
