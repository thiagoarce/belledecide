import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { ManualEntryForm } from "./ManualEntryForm";
import { NfceScanButton } from "./NfceScanButton";

interface EstoqueRow {
  id: string;
  nome_livre: string | null;
  quantidade: number;
  unidade_medida: string | null;
  origem: string;
  produtos: { nome_normalizado: string } | null;
}

async function fetchPantry(): Promise<EstoqueRow[]> {
  const { data, error } = await supabase
    .from("estoque_casa")
    .select("id, nome_livre, quantidade, unidade_medida, origem, produtos(nome_normalizado)")
    .order("data_entrada", { ascending: false });
  if (error) throw error;
  return data as unknown as EstoqueRow[];
}

export function PantryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["estoque_casa"], queryFn: fetchPantry });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900">Estoque da casa</h1>
        <NfceScanButton />
      </div>

      <ManualEntryForm />

      <ul className="mt-4 divide-y divide-stone-200 rounded-md border border-stone-200 bg-white">
        {isLoading && <li className="p-4 text-sm text-stone-500">Carregando…</li>}
        {!isLoading && data?.length === 0 && (
          <li className="p-4 text-sm text-stone-500">Nenhum item no estoque ainda.</li>
        )}
        {data?.map((item) => (
          <li key={item.id} className="flex items-center justify-between p-3 text-sm">
            <span>{item.produtos?.nome_normalizado ?? item.nome_livre}</span>
            <span className="text-stone-500">
              {item.quantidade} {item.unidade_medida ?? ""}
              <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">
                {item.origem}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
