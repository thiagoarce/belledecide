-- Row Level Security: isola dados por família. Ver specs/adr/0002-multi-tenant-rls-strategy.md.
--
-- Regra geral: toda tabela tenant-scoped usa a mesma policy baseada em
-- user_family_ids(), que é 'security definer' para evitar recursão de RLS
-- ao consultar a própria family_members.

create function public.user_family_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
    select family_id from family_members where user_id = auth.uid();
$$;

-- ── families ──────────────────────────────────────────────────────────────
alter table families enable row level security;

create policy families_select on families
    for select using (id in (select user_family_ids()));

create policy families_update on families
    for update using (
        id in (
            select family_id from family_members
            where user_id = auth.uid() and role = 'owner'
        )
    );
-- Sem policy de insert/delete: famílias só nascem via trigger handle_new_user
-- (security definer), nunca via API pública.

-- ── family_members ───────────────────────────────────────────────────────
alter table family_members enable row level security;

create policy family_members_select on family_members
    for select using (family_id in (select user_family_ids()));

create policy family_members_insert on family_members
    for insert with check (
        family_id in (
            select family_id from family_members
            where user_id = auth.uid() and role = 'owner'
        )
    );

create policy family_members_delete on family_members
    for delete using (
        family_id in (
            select family_id from family_members
            where user_id = auth.uid() and role = 'owner'
        )
    );

-- ── family_profile ───────────────────────────────────────────────────────
alter table family_profile enable row level security;

create policy family_profile_select on family_profile
    for select using (family_id in (select user_family_ids()));

create policy family_profile_update on family_profile
    for update using (family_id in (select user_family_ids()))
    with check (family_id in (select user_family_ids()));
-- Sem policy de insert/delete: perfil nasce via trigger handle_new_family.

-- ── estoque_casa ──────────────────────────────────────────────────────────
alter table estoque_casa enable row level security;

create policy estoque_casa_select on estoque_casa
    for select using (family_id in (select user_family_ids()));
create policy estoque_casa_insert on estoque_casa
    for insert with check (family_id in (select user_family_ids()));
create policy estoque_casa_update on estoque_casa
    for update using (family_id in (select user_family_ids()))
    with check (family_id in (select user_family_ids()));
create policy estoque_casa_delete on estoque_casa
    for delete using (family_id in (select user_family_ids()));

-- ── historico_precos ─────────────────────────────────────────────────────
alter table historico_precos enable row level security;

create policy historico_precos_select on historico_precos
    for select using (family_id in (select user_family_ids()));
create policy historico_precos_insert on historico_precos
    for insert with check (family_id in (select user_family_ids()));

-- ── notas_fiscais ─────────────────────────────────────────────────────────
alter table notas_fiscais enable row level security;

create policy notas_fiscais_select on notas_fiscais
    for select using (family_id in (select user_family_ids()));
-- Insert/update de notas_fiscais é feito pelo Worker via service-role
-- (bypassa RLS por design — ver adr/0003); sem policy de insert para o client.

-- ── notas_fiscais_itens ──────────────────────────────────────────────────
alter table notas_fiscais_itens enable row level security;

create policy notas_fiscais_itens_select on notas_fiscais_itens
    for select using (
        nota_id in (
            select id from notas_fiscais where family_id in (select user_family_ids())
        )
    );

-- ── cardapios_gerados ─────────────────────────────────────────────────────
alter table cardapios_gerados enable row level security;

create policy cardapios_gerados_select on cardapios_gerados
    for select using (family_id in (select user_family_ids()));
-- Insert/update feito pelo Worker via service-role (ver adr/0003).

-- ── produtos ──────────────────────────────────────────────────────────────
-- Catálogo global, de leitura pública para qualquer usuário autenticado
-- (não é tenant-scoped — ver specs/data-model.md).
alter table produtos enable row level security;

create policy produtos_select_authenticated on produtos
    for select using (auth.role() = 'authenticated');

-- ── eventos / evento_itens (Épico 5 — schema de extensão) ────────────────
alter table eventos enable row level security;

create policy eventos_select on eventos
    for select using (family_id in (select user_family_ids()));
create policy eventos_insert on eventos
    for insert with check (family_id in (select user_family_ids()));
create policy eventos_update on eventos
    for update using (family_id in (select user_family_ids()))
    with check (family_id in (select user_family_ids()));
create policy eventos_delete on eventos
    for delete using (family_id in (select user_family_ids()));

alter table evento_itens enable row level security;

create policy evento_itens_select on evento_itens
    for select using (
        evento_id in (select id from eventos where family_id in (select user_family_ids()))
    );
create policy evento_itens_insert on evento_itens
    for insert with check (
        evento_id in (select id from eventos where family_id in (select user_family_ids()))
    );
create policy evento_itens_update on evento_itens
    for update using (
        evento_id in (select id from eventos where family_id in (select user_family_ids()))
    );
create policy evento_itens_delete on evento_itens
    for delete using (
        evento_id in (select id from eventos where family_id in (select user_family_ids()))
    );
