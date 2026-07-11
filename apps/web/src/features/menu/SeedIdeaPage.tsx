import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../../lib/apiClient";
import type { MenuGenerationResponse } from "@belledecide/shared-types";

export function SeedIdeaPage() {
  const navigate = useNavigate();
  const [ideiaSemente, setIdeiaSemente] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<MenuGenerationResponse>("/v1/menu/generate", {
        method: "POST",
        body: JSON.stringify({ ideiaSemente }),
      }),
    onSuccess: (data) => {
      navigate(`/menu/${data.id}`, { state: { result: data } });
    },
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-1 text-2xl font-semibold text-stone-900">O que vamos comer?</h1>
      <p className="mb-6 text-sm text-stone-500">
        Me dê uma ideia semente — o resto eu resolvo: cardápio, lista de compras e o roteiro
        pra cozinhar tudo de uma vez.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ideiaSemente.trim().length >= 2) mutation.mutate();
        }}
        className="space-y-3"
      >
        <input
          value={ideiaSemente}
          onChange={(e) => setIdeiaSemente(e.target.value)}
          placeholder="Ex: Carne de panela"
          className="w-full rounded-md border border-stone-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
        >
          {mutation.isPending ? "A Belle está decidindo…" : "Gerar cardápio"}
        </button>
        {mutation.isError && (
          <p className="text-sm text-red-600">
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : "Não foi possível gerar o cardápio agora."}
          </p>
        )}
      </form>
    </div>
  );
}
