import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PartyPopper, Plus } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { PageHeader } from "../../components/PageHeader";

interface EventoRow {
  id: string;
  nome: string;
  data_evento: string | null;
  tipo: string | null;
}

async function fetchEventos(): Promise<EventoRow[]> {
  const { data, error } = await supabase
    .from("eventos")
    .select("id, nome, data_evento, tipo")
    .order("data_evento", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data;
}

export function EventsPage() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["eventos"], queryFn: fetchEventos });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase.from("family_profile").select("family_id").single();
      const { error } = await supabase.from("eventos").insert({
        family_id: profile!.family_id,
        nome,
        data_evento: dataEvento || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNome("");
      setDataEvento("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Épico 5"
        title="Ocasiões especiais"
        subtitle="Listas isoladas do estoque do dia a dia — churrasco, aniversário, o que for."
        action={
          <button onClick={() => setShowForm((s) => !s)} className="btn-quiet !px-3 !py-2">
            <Plus size={16} />
          </button>
        }
      />

      <div className="px-5 pb-8">
        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (nome.trim()) mutation.mutate();
            }}
            className="card mb-4 space-y-3 p-4"
          >
            <div>
              <label className="field-label">Nome do evento</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Churrasco de aniversário"
                className="field-input"
                autoFocus
              />
            </div>
            <div>
              <label className="field-label">Data (opcional)</label>
              <input
                type="date"
                value={dataEvento}
                onChange={(e) => setDataEvento(e.target.value)}
                className="field-input"
              />
            </div>
            <button type="submit" disabled={mutation.isPending} className="btn-decide w-full">
              {mutation.isPending ? "Criando…" : "Criar evento"}
            </button>
          </form>
        )}

        {isLoading && <p className="font-sans text-sm text-giz">Carregando…</p>}

        {!isLoading && data?.length === 0 && !showForm && (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <PartyPopper className="text-azulejo-300" size={32} />
            <p className="font-sans text-sm text-giz">
              Nenhum evento ainda. Toque em <strong className="text-grafite">+</strong> pra criar o
              primeiro.
            </p>
          </div>
        )}

        <ul className="space-y-2">
          {data?.map((evento) => (
            <li key={evento.id}>
              <Link
                to={`/events/${evento.id}`}
                className="card flex items-center justify-between p-4 transition hover:border-azulejo-600"
              >
                <div>
                  <p className="font-display text-base text-noite">{evento.nome}</p>
                  {evento.data_evento && (
                    <p className="font-mono text-xs text-giz">
                      {new Date(`${evento.data_evento}T00:00:00`).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
