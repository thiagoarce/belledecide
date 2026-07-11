import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

export function ManualEntryForm() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [unidade, setUnidade] = useState("un");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase.from("family_profile").select("family_id").single();
      const { error } = await supabase.from("estoque_casa").insert({
        family_id: profile!.family_id,
        nome_livre: nome,
        quantidade: Number(quantidade),
        unidade_medida: unidade,
        origem: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNome("");
      setQuantidade("1");
      queryClient.invalidateQueries({ queryKey: ["estoque_casa"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (nome.trim()) mutation.mutate();
      }}
      className="flex flex-wrap items-end gap-2 rounded-md border border-stone-200 bg-white p-3"
    >
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-medium text-stone-500">Item</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Arroz"
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="w-20">
        <label className="block text-xs font-medium text-stone-500">Qtd.</label>
        <input
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          type="number"
          step="any"
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="w-24">
        <label className="block text-xs font-medium text-stone-500">Unidade</label>
        <input
          value={unidade}
          onChange={(e) => setUnidade(e.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50"
      >
        Adicionar
      </button>
    </form>
  );
}
