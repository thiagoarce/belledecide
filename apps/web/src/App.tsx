import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, NavLink } from "react-router-dom";
import { ChefHat, PackageSearch, ScanBarcode, PartyPopper, UsersRound } from "lucide-react";
import { useAuthStore } from "./stores/authStore";
import { LoginPage } from "./features/auth/LoginPage";
import { FamilyProfilePage } from "./features/family/FamilyProfilePage";
import { PantryPage } from "./features/pantry/PantryPage";
import { SeedIdeaPage } from "./features/menu/SeedIdeaPage";
import { MenuResultPage } from "./features/menu/MenuResultPage";
import { MarketScanPage } from "./features/market/MarketScanPage";
import { EventsPage } from "./features/events/EventsPage";
import { EventDetailPage } from "./features/events/EventDetailPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuthStore();
  if (loading) return <Centered>Carregando…</Centered>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center text-giz">{children}</div>;
}

const TABS = [
  { to: "/menu/new", label: "Cardápio", icon: ChefHat },
  { to: "/pantry", label: "Estoque", icon: PackageSearch },
  { to: "/market/scan", label: "Mercado", icon: ScanBarcode },
  { to: "/events", label: "Eventos", icon: PartyPopper },
  { to: "/family/profile", label: "Família", icon: UsersRound },
] as const;

function BottomNav() {
  const { session } = useAuthStore();
  if (!session) return null;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-azulejo-800 bg-noite pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <ul className="flex justify-between px-1">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-1 py-2.5 text-xs font-medium transition ${
                  isActive ? "text-manga" : "text-azulejo-300 hover:text-white"
                }`
              }
            >
              <Icon size={20} strokeWidth={2} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  const session = useAuthStore((s) => s.session);
  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="min-h-screen bg-linho">
      <div className={session ? "pb-20" : undefined}>
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
            path="/market/scan"
            element={
              <RequireAuth>
                <MarketScanPage />
              </RequireAuth>
            }
          />
          <Route
            path="/events"
            element={
              <RequireAuth>
                <EventsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/events/:id"
            element={
              <RequireAuth>
                <EventDetailPage />
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
      <BottomNav />
    </div>
  );
}
