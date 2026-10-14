import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useApp, hashSenha } from "../store/AppContext";
import * as backend from "../lib/backend";

const temBackend = backend.temBackend;
import { Campo, Reveal } from "../components/ui";
import Icon from "../components/Icon";

// Tela de acesso da equipe. Não tem link em nenhum lugar do site.
export default function Login() {
  const { state, dispatch, usuario, toast } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [tentativas, setTentativas] = useState(0);
  const [bloqueadoAte, setBloqueadoAte] = useState(0);
  const [entrando, setEntrando] = useState(false);

  // Pede aos buscadores para não indexar esta página
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  if (usuario?.role === "admin") return <Navigate to="/admin" replace />;

  async function entrar(e) {
    e.preventDefault();
    if (Date.now() < bloqueadoAte) return setErro("Muitas tentativas. Aguarde alguns segundos.");
    setEntrando(true);

    // Modo servidor: login real do Supabase. Ao entrar, o redirecionamento acontece
    // sozinho quando o perfil de admin chega (veja o <Navigate> acima).
    if (temBackend) {
      try {
        const perfil = await backend.entrar(email.trim(), senha);
        toast(`Olá, ${perfil.nome}!`);
      } catch (err) {
        setEntrando(false);
        registrarFalha();
        setErro(err.message);
      }
      return;
    }

    const hash = await hashSenha(senha);
    const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.senhaHash === hash && x.role === "admin");
    setEntrando(false);
    if (!u) {
      registrarFalha();
      return setErro("E-mail ou senha incorretos.");
    }
    dispatch({ type: "session/set", userId: u.id });
    toast(`Olá, ${u.nome}!`);
    navigate("/admin");
  }

  // Depois de 5 erros seguidos, bloqueia novas tentativas por 30 segundos
  function registrarFalha() {
    const n = tentativas + 1;
    setTentativas(n);
    if (n >= 5) {
      setBloqueadoAte(Date.now() + 30000);
      setTentativas(0);
    }
  }

  return (
    <div className="container pagina-login">
      <Reveal>
        <div className="painel-form login">
          <span className="login-icone"><Icon nome="cadeado" tamanho={22} /></span>
          <h1>Acesso da equipe</h1>
          <p className="muted">Entre para adicionar e editar lugares, documentários e artigos.</p>
          <form className="form" onSubmit={entrar}>
            <Campo label="E-mail"><input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Campo>
            <Campo label="Senha"><input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required /></Campo>
            {erro && <small className="erro" role="alert">{erro}</small>}
            <button className="btn primario largo" type="submit" disabled={entrando}>{entrando ? "Entrando…" : "Entrar"}</button>
          </form>
        </div>
      </Reveal>
    </div>
  );
}
