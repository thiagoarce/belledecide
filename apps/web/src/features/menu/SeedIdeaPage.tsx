import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ChefHat } from "lucide-react";
import { apiFetch, ApiError } from "../../lib/apiClient";
import type { MenuGenerationResponse } from "@belledecide/shared-types";

const SUGESTOES = ["Carne de panela", "Frango ao curry", "Feijoada", "Peixe assado", "Macarronada"];

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
    <div>
      <header className="azulejo-pattern flex flex-col justify-end px-6 pb-10 pt-14 text-white">
        <ChefHat className="mb-3 text-manga" size={28} />
        <h1 className="font-display text-3xl italic text-white">O que vamos comer?</h1>
        <p className="mt-2 max-w-xs font-sans text-sm text-azulejo-100">
          Dá uma ideia semente. A Belle devolve o cardápio, a lista de compras e o roteiro
          pra cozinhar tudo de uma vez.
        </p>
      </header>

      <main className="-mt-4 rounded-t-2xl bg-linho px-6 pb-16 pt-8">
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
            className="field-input py-3.5 font-display text-lg italic"
            autoFocus
          />

          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setIdeiaSemente(s)}
                className="rounded-full border border-azulejo-100 bg-white px-3 py-1 font-sans text-xs text-azulejo-700 hover:bg-azulejo-50"
              >
                {s}
              </button>
            ))}
          </div>

          <button type="submit" disabled={mutation.isPending} className="btn-decide w-full">
            {mutation.isPending ? "A Belle está decidindo…" : "Decidir por mim"}
          </button>

          {mutation.isError && (
            <p className="font-sans text-sm text-manga-700">
              {mutation.error instanceof ApiError
                ? mutation.error.message
                : "Não foi possível gerar o cardápio agora."}
            </p>
          )}
        </form>
      </main>
    </div>
  );
}
