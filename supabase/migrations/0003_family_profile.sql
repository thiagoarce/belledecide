-- Perfil da família: usado pela IA (Épico 2) para personalizar cardápios.
-- 1:1 com families (substitui a tabela solta 'perfil_familia' do PRD original).

create table family_profile (
    family_id uuid primary key references families(id) on delete cascade,
    tamanho integer not null default 1 check (tamanho > 0),
    criancas integer not null default 0 check (criancas >= 0),
    alergias text[] not null default '{}',
    aversoes text[] not null default '{}',
    preferencias jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

-- Garante que toda família nova já nasce com um perfil default,
-- para o front-end nunca precisar tratar "perfil inexistente".
create function public.handle_new_family()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.family_profile (family_id) values (new.id);
    return new;
end;
$$;

create trigger on_family_created
    after insert on families
    for each row execute procedure public.handle_new_family();
