import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { useQueryClient } from "@tanstack/react-query";
import { ScanLine, X } from "lucide-react";
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
      <button onClick={() => setOpen(true)} className="btn-decide">
        <ScanLine size={16} /> Escanear nota
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-noite/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base text-noite">QR code da nota</h2>
              <button
                onClick={close}
                aria-label="Fechar"
                className="rounded-full p-1 text-giz hover:bg-linho hover:text-grafite"
              >
                <X size={18} />
              </button>
            </div>

            {status === "scanning" && (
              <div className="overflow-hidden rounded-xl border-2 border-azulejo-600">
                <video ref={videoRef} className="w-full bg-noite" muted playsInline />
              </div>
            )}
            {status === "processing" && (
              <p className="font-sans text-sm text-giz">Consultando a nota na SEFAZ…</p>
            )}
            {status === "error" && <p className="font-sans text-sm text-manga-700">{error}</p>}
            {status === "done" && result && (
              <div className="font-sans text-sm text-grafite">
                {result.status === "parsed" || result.status === "partial" ? (
                  <p>
                    {result.itens.length} item(ns) foram pro estoque
                    {result.itensNaoReconhecidos > 0
                      ? ` (${result.itensNaoReconhecidos} sem correspondência no catálogo)`
                      : ""}
                    .
                  </p>
                ) : (
                  <p>{result.message ?? "Nota processada."}</p>
                )}
                <button onClick={close} className="btn-decide mt-3 w-full">
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
