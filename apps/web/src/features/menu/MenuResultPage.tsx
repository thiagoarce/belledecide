import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import type { MenuGenerationResponse } from "@belledecide/shared-types";

type Tab = "cardapio" | "lista" | "guia";

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

  if (!data) return <p className="p-6 text-stone-500">Carregando cardápio…</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-4 text-xl font-semibold text-stone-900">Seu cardápio</h1>

      <div className="mb-4 flex gap-1 rounded-md bg-stone-100 p-1 text-sm">
        {(
          [
            ["cardapio", "Cardápio"],
            ["lista", "Lista de compras"],
            ["guia", "Guia de execução"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded px-3 py-1.5 font-medium ${
              tab === key ? "bg-white text-violet-800 shadow-sm" : "text-stone-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "cardapio" && (
        <ul className="space-y-2">
          {data.cardapio.map((dia, idx) => (
            <li key={idx} className="rounded-md border border-stone-200 bg-white p-3">
              <p className="text-xs font-medium text-violet-700">Dia {dia.dia}</p>
              <p className="font-medium text-stone-900">{dia.refeicao}</p>
              <p className="text-sm text-stone-500">{dia.ingredientes_usados.join(", ")}</p>
            </li>
          ))}
        </ul>
      )}

      {tab === "lista" && (
        <ul className="divide-y divide-stone-200 rounded-md border border-stone-200 bg-white">
          {data.lista_compras.map((item, idx) => (
            <li key={idx} className="flex items-center justify-between p-3 text-sm">
              <span>{item.item}</span>
              <span className="text-stone-500">
                {item.quantidade} · {item.setor}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tab === "guia" && (
        <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-700">
          {data.guia_execucao.map((passo, idx) => (
            <li key={idx}>{passo}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
