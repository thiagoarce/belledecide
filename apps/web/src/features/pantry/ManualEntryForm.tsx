import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Snowflake } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import type { VolumeCongelador } from "@belledecide/shared-types";

export function ManualEntryForm() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [unidade, setUnidade] = useState("un");
  const [validade, setValidade] = useState("");
  const [congelado, setCongelado] = useState(false);
  const [volume, setVolume] = useState<VolumeCongelador>("M");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase.from("family_profile").select("family_id").single();
      const { error } = await supabase.from("estoque_casa").insert({
        family_id: profile!.family_id,
        nome_livre: nome,
        quantidade: Number(quantidade),
        unidade_medida: unidade,
        validade: validade || null,
        volume_congelador: congelado ? volume : null,
        origem: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNome("");
      setQuantidade("1");
      setValidade("");
      setCongelado(false);
      queryClient.invalidateQueries({ queryKey: ["estoque_casa"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (nome.trim()) mutation.mutate();
      }}
      className="card space-y-3 p-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <label className="field-label">Item</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Arroz"
            className="field-input"
          />
        </div>
        <div className="w-16">
          <label className="field-label">Qtd.</label>
          <input
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            type="number"
            step="any"
            className="field-input"
          />
        </div>
        <div className="w-20">
          <label className="field-label">Unidade</label>
          <input value={unidade} onChange={(e) => setUnidade(e.target.value)} className="field-input" />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <label className="field-label">Validade (opcional)</label>
          <input
            type="date"
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
            className="field-input"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 pb-2.5 font-sans text-sm text-grafite">
          <input
            type="checkbox"
            checked={congelado}
            onChange={(e) => setCongelado(e.target.checked)}
            className="h-4 w-4 rounded border-azulejo-300 text-azulejo-600 focus:ring-azulejo-600"
          />
          <Snowflake size={14} className="text-azulejo-600" /> Congelado
        </label>
        {congelado && (
          <div className="w-24 pb-0.5">
            <label className="field-label">Volume</label>
            <select
              value={volume}
              onChange={(e) => setVolume(e.target.value as VolumeCongelador)}
              className="field-input"
            >
              <option value="P">P</option>
              <option value="M">M</option>
              <option value="G">G</option>
            </select>
          </div>
        )}
      </div>

      <button type="submit" disabled={mutation.isPending} className="btn-quiet w-full">
        <Plus size={16} /> Adicionar ao estoque
      </button>
    </form>
  );
}
