import type { SemaforoCor } from "@belledecide/shared-types";

const CONFIG: Record<SemaforoCor, { label: string; classes: string }> = {
  verde: { label: "Bom preço — compre aqui", classes: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  amarelo: { label: "Preço na média — dá pra levar", classes: "bg-amber-50 text-amber-800 border-amber-200" },
  vermelho: { label: "Caro — considere outro mercado", classes: "bg-manga-600/10 text-manga-700 border-manga-600/30" },
  sem_dado: { label: "Sem histórico ainda pra comparar", classes: "bg-linho text-giz border-azulejo-100" },
};

export function PriceSemaforo({ cor }: { cor: SemaforoCor; media: number | null }) {
  const { label, classes } = CONFIG[cor];
  return (
    <div className={`mt-2 rounded-lg border px-3 py-2 font-sans text-sm font-medium ${classes}`}>
      {label}
    </div>
  );
}
