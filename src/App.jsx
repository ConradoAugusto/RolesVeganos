import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Carregando from "./components/Carregando";
import { useApp } from "./store/AppContext";
import Explore from "./pages/Explore";
import { About, Contact, Favorites, NotFound } from "./pages/Static";

const PlaceDetail = lazy(() => import("./pages/PlaceDetail"));
const Veganismo = lazy(() => import("./pages/Veganismo"));
const Documentarios = lazy(() => import("./pages/Documentarios"));
const Cupons = lazy(() => import("./pages/Cupons"));
const ReceitasLista = lazy(() => import("./pages/Receitas").then((m) => ({ default: m.ReceitasLista })));
const ReceitaPagina = lazy(() => import("./pages/Receitas").then((m) => ({ default: m.ReceitaPagina })));
const BlogList = lazy(() => import("./pages/Blog").then((m) => ({ default: m.BlogList })));
const PostPage = lazy(() => import("./pages/Blog").then((m) => ({ default: m.PostPage })));
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));

// Endereço da tela de login. Não aparece em nenhum menu; mude em VITE_ROTA_LOGIN.
export const ROTA_LOGIN = import.meta.env.VITE_ROTA_LOGIN || "/acesso";

// Fora do admin, a área de gestão responde como se não existisse.
function RequireAdmin({ children }) {
  const { usuario } = useApp();
  if (usuario?.role !== "admin") return <NotFound />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<Carregando tela />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Explore />} />
          <Route path="lugar/:id" element={<PlaceDetail />} />
          <Route path="veganismo" element={<Veganismo />} />
          <Route path="documentarios" element={<Documentarios />} />
          <Route path="cupons" element={<Cupons />} />
          <Route path="receitas" element={<ReceitasLista />} />
          <Route path="receitas/:slug" element={<ReceitaPagina />} />
          <Route path="blog" element={<BlogList />} />
          <Route path="blog/:slug" element={<PostPage />} />
          <Route path="salvos" element={<Favorites />} />
          <Route path="sobre" element={<About />} />
          <Route path="contato" element={<Contact />} />
          <Route path={ROTA_LOGIN.replace(/^\//, "")} element={<Login />} />
          <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
