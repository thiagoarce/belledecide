-- Seed de desenvolvimento local. Roda depois das migrations via `supabase db reset`.
-- Não cria usuários (isso é feito via Supabase Auth, que dispara o trigger
-- handle_new_user e cria família + perfil automaticamente) — apenas popula o
-- catálogo global de produtos para testar o fluxo de estoque/cardápio sem
-- depender do scanner de NFC-e.

insert into produtos (nome_normalizado, categoria, unidade_padrao, codigo_barras) values
    ('Arroz branco tipo 1', 'Mercearia', 'kg', '7891234500019'),
    ('Feijão carioca', 'Mercearia', 'kg', '7891234500026'),
    ('Carne de segunda (para panela)', 'Açougue', 'kg', null),
    ('Cebola', 'Hortifruti', 'kg', null),
    ('Alho', 'Hortifruti', 'kg', null),
    ('Mandioca', 'Hortifruti', 'kg', null),
    ('Óleo de soja', 'Mercearia', 'L', '7891234500033'),
    ('Sal refinado', 'Mercearia', 'kg', '7891234500040')
on conflict (codigo_barras) do nothing;
