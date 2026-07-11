-- Raiz do multi-tenant: uma família agrupa 1+ usuários que compartilham
-- perfil, estoque, histórico de preços e cardápios. Ver specs/adr/0002.

create table families (
    id uuid primary key default gen_random_uuid(),
    name text not null default 'Minha família',
    created_at timestamptz not null default now()
);

create table family_members (
    id uuid primary key default gen_random_uuid(),
    family_id uuid not null references families(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'member' check (role in ('owner', 'member')),
    joined_at timestamptz not null default now(),
    unique (family_id, user_id)
);

create index idx_family_members_user_id on family_members(user_id);
create index idx_family_members_family_id on family_members(family_id);

-- Bootstrap automático: ao criar um usuário no Supabase Auth, cria uma família
-- nova e a membership 'owner' atomicamente. Evita um endpoint de "criar família"
-- e a race condition de "usuário logado sem família ainda".
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
    new_family_id uuid;
begin
    insert into public.families (name)
    values ('Minha família')
    returning id into new_family_id;

    insert into public.family_members (family_id, user_id, role)
    values (new_family_id, new.id, 'owner');

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
