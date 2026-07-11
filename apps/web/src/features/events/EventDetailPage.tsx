import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

interface EventoRow {
  id: string;
  nome: string;
  data_evento: string | null;
}

interface EventoItemRow {
  id: string;
  descricao: string;
  quantidade: string | null;
  local_sugerido: string | null;
  comprado: boolean;
}

async function fetchEvento(id: string): Promise<EventoRow> {
  const { data, error } = await supabase.from("eventos").select("id, nome, data_evento").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function fetchItens(eventoId: string): Promise<EventoItemRow[]> {
  const { data, error } = await supabase
    .from("evento_itens")
    .select("id, descricao, quantidade, local_sugerido, comprado")
    .eq("evento_id", eventoId)
    .order("comprado", { ascending: true });
  if (error) throw error;
  return data;
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState("");

  const eventoQuery = useQuery({ queryKey: ["evento", id], queryFn: () => fetchEvento(id!) });
  const itensQuery = useQuery({ queryKey: ["evento_itens", id], queryFn: () => fetchItens(id!) });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("evento_itens").insert({
        evento_id: id,
        descricao,
        quantidade: quantidade || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDescricao("");
      setQuantidade("");
      queryClient.invalidateQueries({ queryKey: ["evento_itens", id] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, comprado }: { itemId: string; comprado: boolean }) => {
      const { error } = await supabase.from("evento_itens").update({ comprado }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evento_itens", id] }),
  });

  return (
    <div>
      <div className="px-5 pt-8">
        <Link to="/events" className="inline-flex items-center gap-1 font-sans text-sm text-azulejo-700">
          <ArrowLeft size={15} /> Eventos
        </Link>
        {eventoQuery.data && (
          <div className="mt-2">
            <p className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-azulejo-600">
              {eventoQuery.data.data_evento
                ? new Date(`${eventoQuery.data.data_evento}T00:00:00`).toLocaleDateString("pt-BR")
                : "Sem data definida"}
            </p>
            <h1 className="mt-1 font-display text-2xl text-noite">{eventoQuery.data.nome}</h1>
          </div>
        )}
      </div>

      <div className="px-5 py-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (descricao.trim()) addItemMutation.mutate();
          }}
          className="card mb-4 flex flex-wrap items-end gap-2 p-3"
        >
          <div className="min-w-[140px] flex-1">
            <label className="field-label">Item</label>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Carvão"
              className="field-input"
            />
          </div>
          <div className="w-24">
            <label className="field-label">Qtd.</label>
            <input
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="2 sacos"
              className="field-input"
            />
          </div>
          <button type="submit" disabled={addItemMutation.isPending} className="btn-quiet">
            <Plus size={16} />
          </button>
        </form>

        <ul className="card divide-y divide-linho">
          {itensQuery.data?.length === 0 && (
            <li className="p-4 font-sans text-sm text-giz">Nenhum item na lista ainda.</li>
          )}
          {itensQuery.data?.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <input
                type="checkbox"
                checked={item.comprado}
                onChange={(e) => toggleMutation.mutate({ itemId: item.id, comprado: e.target.checked })}
                className="h-4 w-4 rounded border-azulejo-300 text-azulejo-600 focus:ring-azulejo-600"
              />
              <span
                className={`flex-1 font-sans text-sm ${
                  item.comprado ? "text-giz line-through" : "text-grafite"
                }`}
              >
                {item.descricao}
              </span>
              {item.quantidade && <span className="font-mono text-xs text-giz">{item.quantidade}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
