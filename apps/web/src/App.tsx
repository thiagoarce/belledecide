import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, Link } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import { LoginPage } from "./features/auth/LoginPage";
import { FamilyProfilePage } from "./features/family/FamilyProfilePage";
import { PantryPage } from "./features/pantry/PantryPage";
import { SeedIdeaPage } from "./features/menu/SeedIdeaPage";
import { MenuResultPage } from "./features/menu/MenuResultPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuthStore();
  if (loading) return <Centered>Carregando…</Centered>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center text-stone-500">{children}</div>;
}

function Nav() {
  const { session } = useAuthStore();
  if (!session) return null;
  return (
    <nav className="flex gap-4 border-b border-stone-200 bg-white px-4 py-3 text-sm">
      <span className="font-semibold text-violet-700">Belle decide</span>
      <Link to="/family/profile" className="text-stone-600 hover:text-violet-700">
        Perfil da família
      </Link>
      <Link to="/pantry" className="text-stone-600 hover:text-violet-700">
        Estoque
      </Link>
      <Link to="/menu/new" className="text-stone-600 hover:text-violet-700">
        Novo cardápio
      </Link>
    </nav>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="min-h-screen bg-stone-50">
      <Nav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/family/profile"
          element={
            <RequireAuth>
              <FamilyProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/pantry"
          element={
            <RequireAuth>
              <PantryPage />
            </RequireAuth>
          }
        />
        <Route
          path="/menu/new"
          element={
            <RequireAuth>
              <SeedIdeaPage />
            </RequireAuth>
          }
        />
        <Route
          path="/menu/:id"
          element={
            <RequireAuth>
              <MenuResultPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/menu/new" replace />} />
      </Routes>
    </div>
  );
}
