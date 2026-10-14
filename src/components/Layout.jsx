import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { useCidade } from "../store/CidadeContext";
import Carregando from "./Carregando";
import Icon from "./Icon";

const LINKS = [
  { to: "/", label: "Explorar", fim: true },
  { to: "/veganismo", label: "Veganismo" },
  { to: "/receitas", label: "Receitas" },
  { to: "/documentarios", label: "Documentários" },
  { to: "/blog", label: "Blog" },
  { to: "/cupons", label: "Cupons" },
];

export default function Layout() {
  const { usuario, state, dispatch, toast } = useApp();
  const { cidade, status } = useCidade();
  const location = useLocation();
  const navigate = useNavigate();
  const [rolado, setRolado] = useState(false);
  const [menu, setMenu] = useState(false);
  const admin = usuario?.role === "admin";

  useEffect(() => {
    const h = () => setRolado(window.scrollY > 8);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  function sair() {
    dispatch({ type: "session/set", userId: null });
    toast("Você saiu da conta.");
    navigate("/");
  }

  const rotuloCidade = status === "localizando" ? "Localizando…" : cidade?.nome || "Escolher cidade";

  return (
    <>
      <a href="#conteudo" className="pular">Pular para o conteúdo</a>
      <header className={`topo ${rolado ? "rolado" : ""} ${menu ? "menu-aberto" : ""}`}>
        <div className="barra container">
          <Link to="/" className="marca" aria-label="Rolês Veganos, início">
            <img src="/logo-marca.webp" alt="" width="40" height="40" />
            <span>Rolês Veganos</span>
          </Link>

          <nav className="menu" aria-label="Principal">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.fim}>{l.label}</NavLink>
            ))}
            {admin && <NavLink to="/admin" className="link-admin">Gestão</NavLink>}
          </nav>

          <div className="acoes">
            <Link to="/#cidade" state={{ focarCidade: true }} className={`pilula-cidade ${status === "localizando" ? "pulsando" : ""}`} title="Trocar cidade">
              <Icon nome="pin" tamanho={15} />
              <span>{rotuloCidade}</span>
            </Link>
            <NavLink to="/salvos" className="icone-btn" aria-label={`Salvos (${state.favorites.length})`}>
              <Icon nome="coracao" />
              {state.favorites.length > 0 && <span className="contador" key={state.favorites.length}>{state.favorites.length}</span>}
            </NavLink>
            {admin && (
              <button className="icone-btn" onClick={sair} aria-label="Sair da conta" title="Sair">
                <Icon nome="sair" />
              </button>
            )}
            <button className="icone-btn hamb" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
              <Icon nome={menu ? "x" : "menu"} />
            </button>
          </div>
        </div>
      </header>

      <main id="conteudo" key={location.pathname} className="pagina">
        <Suspense fallback={<Carregando tela />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="rodape">
        <div className="container rodape-grid">
          <div className="rodape-marca">
            <img src="/logo-marca.webp" alt="" width="56" height="56" loading="lazy" />
            <p>Lugares veganos, história do movimento e boas indicações para assistir.</p>
          </div>
          <nav aria-label="Rodapé">
            <strong>Explorar</strong>
            <Link to="/">Lugares</Link>
            <Link to="/salvos">Salvos</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/cupons">Cupons</Link>
          </nav>
          <nav aria-label="Aprender">
            <strong>Aprender</strong>
            <Link to="/veganismo">O que é veganismo</Link>
            <Link to="/receitas">Receitas</Link>
            <Link to="/documentarios">Documentários</Link>
          </nav>
          <nav aria-label="Projeto">
            <strong>Projeto</strong>
            <Link to="/sobre">Sobre</Link>
            <Link to="/contato">Contato e sugestões</Link>
          </nav>
        </div>
        <div className="container copy">© {new Date().getFullYear()} Rolês Veganos</div>
      </footer>
    </>
  );
}
