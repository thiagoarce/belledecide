import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "../../stores/authStore";

export function LoginPage() {
  const session = useAuthStore((s) => s.session);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/menu/new" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOtp({ email });
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="mb-1 text-2xl font-semibold text-violet-800">Belle decide</h1>
      <p className="mb-6 text-sm text-stone-500">
        Entre com seu e-mail para acessar o cardápio da sua família.
      </p>

      {sent ? (
        <p className="rounded-md bg-violet-50 p-4 text-sm text-violet-800">
          Enviamos um link de acesso para <strong>{email}</strong>. Confira sua caixa de entrada.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
          >
            Enviar link de acesso
          </button>
        </form>
      )}
    </div>
  );
}
