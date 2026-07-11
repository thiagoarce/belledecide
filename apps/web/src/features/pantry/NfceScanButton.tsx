import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../../lib/apiClient";
import type { NfceScanResponse } from "@belledecide/shared-types";

export function NfceScanButton() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"scanning" | "processing" | "done" | "error">("scanning");
  const [result, setResult] = useState<NfceScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);

  useEffect(() => {
    if (!open || !videoRef.current) return;

    const video = videoRef.current;
    const reader = new BrowserQRCodeReader();
    readerRef.current = reader;
    let cancelled = false;

    reader
      .decodeOnceFromVideoDevice(undefined, video)
      .then(async (result) => {
        if (cancelled) return;
        setStatus("processing");
        try {
          const scan = await apiFetch<NfceScanResponse>("/v1/nfce/scan", {
            method: "POST",
            body: JSON.stringify({ qrUrl: result.getText() }),
          });
          setResult(scan);
          setStatus("done");
          queryClient.invalidateQueries({ queryKey: ["estoque_casa"] });
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Falha ao processar a nota");
          setStatus("error");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Não foi possível acessar a câmera");
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, queryClient]);

  function close() {
    setOpen(false);
    setStatus("scanning");
    setResult(null);
    setError(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-800 hover:bg-violet-100"
      >
        Escanear nota fiscal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-800">Escanear QR code da nota</h2>
              <button onClick={close} className="text-stone-400 hover:text-stone-700">
                Fechar
              </button>
            </div>

            {status === "scanning" && (
              <video ref={videoRef} className="w-full rounded-md bg-black" muted playsInline />
            )}
            {status === "processing" && <p className="text-sm text-stone-600">Processando nota…</p>}
            {status === "error" && <p className="text-sm text-red-600">{error}</p>}
            {status === "done" && result && (
              <div className="text-sm text-stone-700">
                {result.status === "parsed" || result.status === "partial" ? (
                  <p>
                    {result.itens.length} item(ns) importado(s) para o estoque
                    {result.itensNaoReconhecidos > 0
                      ? ` (${result.itensNaoReconhecidos} sem correspondência no catálogo)`
                      : ""}
                    .
                  </p>
                ) : (
                  <p>{result.message ?? "Nota processada."}</p>
                )}
                <button
                  onClick={close}
                  className="mt-3 rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
