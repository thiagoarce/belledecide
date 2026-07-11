-- Extensões necessárias: geração de UUID e matching de texto por similaridade
-- (usado no matching de itens de NFC-e contra o catálogo de produtos).
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
