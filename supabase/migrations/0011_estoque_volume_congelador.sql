-- Épico 4: classificação de volume para itens congelados (P/M/G), evita
-- modelar volume em litros — ver specs/04-epico-4-gestao-espaco.md.
alter table estoque_casa
    add column volume_congelador text check (volume_congelador in ('P', 'M', 'G'));
