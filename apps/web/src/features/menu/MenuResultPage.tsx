import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ShoppingBasket, ListChecks } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { PageHeader } from "../../components/PageHeader";
import type { MenuGenerationResponse } from "@belledecide/shared-types";

type Tab = "cardapio" | "lista" | "guia";

const TABS = [
  { key: "cardapio", label: "Cardápio", icon: CalendarDays },
  { key: "lista", label: "Lista", icon: ShoppingBasket },
  { key: "guia", label: "Guia", icon: ListChecks },
] as const;

async function fetchMenu(id: string): Promise<MenuGenerationResponse> {
  const { data, error } = await supabase
    .from("cardapios_gerados")
    .select("id, status, cardapio_json, lista_compras_json, guia_execucao_json")
    .eq("id", id)
    .single();
  if (error) throw error;
  return {
    id: data.id,
    status: data.status,
    cardapio: data.cardapio_json ?? [],
    lista_compras: data.lista_compras_json ?? [],
    guia_execucao: data.guia_execucao_json ?? [],
  };
}

export function MenuResultPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const stateResult = (location.state as { result?: MenuGenerationResponse } | null)?.result;
  const [tab, setTab] = useState<Tab>("cardapio");

  const { data } = useQuery({
    queryKey: ["cardapio", id],
    queryFn: () => fetchMenu(id!),
    initialData: stateResult,
    enabled: !stateResult,
  });

  if (!data) return <p className="p-6 font-sans text-giz">Carregando cardápio…</p>;

  return (
    <div>
      <PageHeader eyebrow="A Belle decidiu" title="Seu cardápio" />

      <div className="px-5">
        {/* Fichário: abas como cartões de índice, a ativa "puxada" pra frente */}
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-t-lg border border-b-0 px-2 py-2.5 font-sans text-xs font-bold transition ${
                tab === key
                  ? "border-azulejo-100 bg-white text-azulejo-700"
                  : "border-transparent bg-transparent text-giz hover:text-azulejo-600"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="rounded-b-xl rounded-tr-xl border border-azulejo-100 bg-white p-4">
          {tab === "cardapio" && (
            <ul className="space-y-3">
              {data.cardapio.map((dia, idx) => (
                <li key={idx} className="border-l-2 border-manga pl-3">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-azulejo-600">
                    Dia {dia.dia}
                  </p>
                  <p className="font-display text-base text-noite">{dia.refeicao}</p>
                  <p className="mt-0.5 font-sans text-sm text-giz">
                    {dia.ingredientes_usados.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {tab === "lista" && (
            <ul className="divide-y divide-linho">
              {data.lista_compras.map((item, idx) => (
                <li key={idx} className="flex items-center justify-between py-2.5">
                  <span className="font-sans text-sm text-grafite">{item.item}</span>
                  <span className="font-mono text-xs text-giz">
                    {item.quantidade} · {item.setor}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {tab === "guia" && (
            <ol className="space-y-3">
              {data.guia_execucao.map((passo, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="font-mono text-sm font-bold text-manga">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="font-sans text-sm text-grafite">{passo}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
