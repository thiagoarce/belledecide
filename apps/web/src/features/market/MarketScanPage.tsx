import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanBarcode, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { PageHeader } from "../../components/PageHeader";
import { PriceSemaforo } from "./PriceSemaforo";
import type { SemaforoCor } from "@belledecide/shared-types";

interface ProdutoRow {
  id: string;
  nome_normalizado: string;
  categoria: string | null;
}

interface HistoricoRow {
  preco_pago: number;
}

async function fetchProdutoPorEan(ean: string): Promise<ProdutoRow | null> {
  const { data, error } = await supabase
    .from("produtos")
    .select("id, nome_normalizado, categoria")
    .eq("codigo_barras", ean)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchHistorico(produtoId: string): Promise<HistoricoRow[]> {
  const { data, error } = await supabase
    .from("historico_precos")
    .select("preco_pago")
    .eq("produto_id", produtoId)
    .order("observado_em", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

/** Semáforo de Preço: compara o preço atual à média histórica da família. Ver specs/03-*.md. */
function classificarPreco(precoAtual: number, media: number | null): SemaforoCor {
  if (media === null) return "sem_dado";
  if (precoAtual <= media) return "verde";
  if (precoAtual <= media * 1.1) return "amarelo";
  return "vermelho";
}

export function MarketScanPage() {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [ean, setEan] = useState<string | null>(null);
  const [precoAtual, setPrecoAtual] = useState("");
  const [mercadoNome, setMercadoNome] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const produtoQuery = useQuery({
    queryKey: ["produto_ean", ean],
    queryFn: () => fetchProdutoPorEan(ean!),
    enabled: !!ean,
  });

  const historicoQuery = useQuery({
    queryKey: ["historico_precos", produtoQuery.data?.id],
    queryFn: () => fetchHistorico(produtoQuery.data!.id),
    enabled: !!produtoQuery.data,
  });

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    const video = videoRef.current;
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeOnceFromVideoDevice(undefined, video)
      .then((result) => {
        if (cancelled) return;
        setEan(result.getText());
        setScanning(false);
      })
      .catch(() => {
        if (!cancelled) setScanning(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scanning]);

  const media = historicoQuery.data?.length
    ? historicoQuery.data.reduce((sum, h) => sum + h.preco_pago, 0) / historicoQuery.data.length
    : null;

  const cor = precoAtual ? classificarPreco(Number(precoAtual), media) : null;

  const registrarMutation = useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase.from("family_profile").select("family_id").single();
      const { error } = await supabase.from("historico_precos").insert({
        family_id: profile!.family_id,
        produto_id: produtoQuery.data!.id,
        mercado_nome: mercadoNome,
        preco_pago: Number(precoAtual),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["historico_precos"] });
      setPrecoAtual("");
      setMercadoNome("");
      setEan(null);
    },
  });

  return (
    <div>
      <PageHeader
        eyebrow="Épico 3"
        title="Vale a pena comprar aqui?"
        subtitle="Escaneia o código de barras na prateleira e compara com o que sua família já pagou antes."
      />

      <div className="px-5 pb-8">
        {!ean && (
          <button onClick={() => setScanning(true)} className="btn-decide w-full">
            <ScanBarcode size={18} /> Escanear código de barras
          </button>
        )}

        {scanning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-noite/80 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base text-noite">Código de barras</h2>
                <button
                  onClick={() => setScanning(false)}
                  aria-label="Fechar"
                  className="rounded-full p-1 text-giz hover:bg-linho"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-hidden rounded-xl border-2 border-azulejo-600">
                <video ref={videoRef} className="w-full bg-noite" muted playsInline />
              </div>
            </div>
          </div>
        )}

        {ean && (
          <div className="card mt-4 p-4">
            {produtoQuery.isLoading && <p className="font-sans text-sm text-giz">Buscando produto…</p>}

            {!produtoQuery.isLoading && !produtoQuery.data && (
              <div>
                <p className="font-sans text-sm text-grafite">
                  Nenhum produto com este código ainda (<span className="font-mono text-xs">{ean}</span>).
                </p>
                <p className="mt-1 font-sans text-xs text-giz">
                  Ele entra pro catálogo automaticamente na próxima nota fiscal escaneada com esse item.
                </p>
                <button onClick={() => setEan(null)} className="btn-quiet mt-3 w-full">
                  Escanear outro
                </button>
              </div>
            )}

            {produtoQuery.data && (
              <div>
                <p className="font-display text-lg text-noite">{produtoQuery.data.nome_normalizado}</p>
                <p className="font-sans text-xs text-giz">{produtoQuery.data.categoria ?? "Sem categoria"}</p>

                {media !== null ? (
                  <p className="mt-2 font-mono text-xs text-giz">
                    Média que sua família pagou: R$ {media.toFixed(2)}
                  </p>
                ) : (
                  <p className="mt-2 font-sans text-xs text-giz">Ainda sem histórico de preço.</p>
                )}

                <div className="mt-3">
                  <label className="field-label">Preço aqui, agora</label>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={precoAtual}
                    onChange={(e) => setPrecoAtual(e.target.value)}
                    placeholder="0,00"
                    className="field-input"
                  />
                </div>

                {cor && <PriceSemaforo cor={cor} media={media} />}

                <div className="mt-3">
                  <label className="field-label">Mercado</label>
                  <input
                    value={mercadoNome}
                    onChange={(e) => setMercadoNome(e.target.value)}
                    placeholder="Ex: Extra Torre"
                    className="field-input"
                  />
                </div>

                <button
                  onClick={() => registrarMutation.mutate()}
                  disabled={!precoAtual || !mercadoNome || registrarMutation.isPending}
                  className="btn-decide mt-3 w-full"
                >
                  {registrarMutation.isPending ? "Registrando…" : "Registrar preço"}
                </button>
                <button onClick={() => setEan(null)} className="btn-quiet mt-2 w-full">
                  Escanear outro
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
