import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Snowflake } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { PageHeader } from "../../components/PageHeader";
import { ManualEntryForm } from "./ManualEntryForm";
import { NfceScanButton } from "./NfceScanButton";

interface EstoqueRow {
  id: string;
  nome_livre: string | null;
  quantidade: number;
  unidade_medida: string | null;
  origem: string;
  validade: string | null;
  volume_congelador: "P" | "M" | "G" | null;
  produtos: { nome_normalizado: string } | null;
}

const DIAS_RADAR_PERECIVEIS = 5;

async function fetchPantry(): Promise<EstoqueRow[]> {
  const { data, error } = await supabase
    .from("estoque_casa")
    .select(
      "id, nome_livre, quantidade, unidade_medida, origem, validade, volume_congelador, produtos(nome_normalizado)",
    )
    .order("data_entrada", { ascending: false });
  if (error) throw error;
  return data as unknown as EstoqueRow[];
}

function diasAteVencer(validade: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataValidade = new Date(`${validade}T00:00:00`);
  return Math.round((dataValidade.getTime() - hoje.getTime()) / 86_400_000);
}

function itemNome(item: EstoqueRow): string {
  return item.produtos?.nome_normalizado ?? item.nome_livre ?? "Item";
}

export function PantryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["estoque_casa"], queryFn: fetchPantry });

  const { vencendo, resto } = useMemo(() => {
    const vencendo: (EstoqueRow & { dias: number })[] = [];
    const resto: EstoqueRow[] = [];
    for (const item of data ?? []) {
      const dias = item.validade ? diasAteVencer(item.validade) : null;
      if (dias !== null && dias <= DIAS_RADAR_PERECIVEIS) {
        vencendo.push({ ...item, dias });
      } else {
        resto.push(item);
      }
    }
    vencendo.sort((a, b) => a.dias - b.dias);
    return { vencendo, resto };
  }, [data]);

  return (
    <div>
      <PageHeader
        eyebrow="Épico 1 + 4"
        title="Estoque da casa"
        subtitle="O que já está em casa — a Belle desconta isso da lista de compras."
        action={<NfceScanButton />}
      />

      <div className="px-5 pb-8">
        {vencendo.length > 0 && (
          <section className="mb-5">
            <h2 className="mb-2 flex items-center gap-1.5 font-sans text-sm font-bold text-manga-700">
              <AlertTriangle size={16} /> Vencendo em breve
            </h2>
            <ul className="space-y-2">
              {vencendo.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-manga-600/30 bg-manga-600/5 px-3 py-2.5"
                >
                  <span className="font-sans text-sm font-medium text-grafite">{itemNome(item)}</span>
                  <span className="font-mono text-xs font-medium text-manga-700">
                    {item.dias < 0
                      ? `venceu há ${Math.abs(item.dias)}d`
                      : item.dias === 0
                        ? "vence hoje"
                        : `vence em ${item.dias}d`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ManualEntryForm />

        <ul className="mt-4 divide-y divide-azulejo-100 overflow-hidden rounded-xl border border-azulejo-100 bg-white">
          {isLoading && <li className="p-4 font-sans text-sm text-giz">Carregando…</li>}
          {!isLoading && data?.length === 0 && (
            <li className="p-4 font-sans text-sm text-giz">
              Nenhum item ainda. Escaneie uma nota ou adicione à mão.
            </li>
          )}
          {resto.map((item) => (
            <li key={item.id} className="flex items-center justify-between p-3">
              <span className="font-sans text-sm text-grafite">{itemNome(item)}</span>
              <span className="flex items-center gap-2 font-mono text-xs text-giz">
                {item.quantidade} {item.unidade_medida ?? ""}
                {item.volume_congelador && (
                  <span
                    className="inline-flex items-center gap-0.5 rounded bg-azulejo-50 px-1.5 py-0.5 text-azulejo-700"
                    title="Volume no congelador"
                  >
                    <Snowflake size={11} /> {item.volume_congelador}
                  </span>
                )}
                <span className="rounded bg-linho px-1.5 py-0.5 text-giz">{item.origem}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
