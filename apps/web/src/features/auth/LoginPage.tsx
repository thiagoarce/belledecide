import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "../../stores/authStore";

export function LoginPage() {
  const session = useAuthStore((s) => s.session);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/menu/new" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen">
      <header className="azulejo-pattern flex flex-col justify-end px-6 pb-10 pt-16 text-white">
        <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-azulejo-300">
          Planejamento alimentar
        </p>
        <h1 className="mt-2 font-display text-4xl italic text-white">Belle decide.</h1>
        <p className="mt-3 max-w-xs font-sans text-sm text-azulejo-100">
          Você não devia ter que pensar todo dia no que vai comer. Conta pra Belle o que tem
          vontade — o resto ela resolve.
        </p>
      </header>

      <main className="mx-auto -mt-4 max-w-sm rounded-t-2xl bg-linho px-6 pb-16 pt-8">
        {sent ? (
          <div className="card p-5">
            <p className="font-sans text-sm text-grafite">
              Mandamos um link de acesso para <strong className="text-noite">{email}</strong>.
              Abra o e-mail no seu celular pra entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="field-label">
                Seu e-mail
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field-input"
              />
            </div>
            {error && <p className="font-sans text-sm text-manga-700">{error}</p>}
            <button type="submit" disabled={loading} className="btn-decide w-full">
              {loading ? "Enviando…" : "Entrar por e-mail"}
            </button>
            <p className="text-center font-sans text-xs text-giz">
              Sem senha — só um link no seu e-mail.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
