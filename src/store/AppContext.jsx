import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { SEED } from "../data/seed";
import * as backend from "../lib/backend";

const KEY = "rv-react-v2";
const KEY_FAVORITOS = "rv-favoritos";
const temBackend = backend.temBackend;

// Ações que mudam o conteúdo editado pelo admin (vai para a tabela "conteudo")
const ACOES_CONTEUDO = /^(place|post|doc|cupom|receita)\/|^data\/replace$/;

function carregar() {
  if (temBackend) {
    // Com servidor: mostra o dados.json na hora e troca pelo conteúdo do servidor assim que chegar.
    // Do navegador só vêm os lugares salvos (coração).
    let favorites = [];
    try {
      favorites = JSON.parse(localStorage.getItem(KEY_FAVORITOS)) || [];
    } catch (e) {
      /* sem favoritos salvos */
    }
    return { ...structuredClone(SEED), favorites };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const salvo = JSON.parse(raw);
      // Site publicado com dados novos (dados.json mudou): usa o conteúdo novo e mantém os salvos do visitante
      if ((salvo.versao || 0) < (SEED.versao || 0)) return { ...structuredClone(SEED), favorites: salvo.favorites || [] };
      return { ...structuredClone(SEED), ...salvo };
    }
  } catch (e) {
    /* localStorage bloqueado ou JSON inválido: usa seed */
  }
  return structuredClone(SEED);
}

function reducer(s, a) {
  switch (a.type) {
    case "place/save": {
      const existe = s.places.some((p) => p.id === a.place.id);
      return {
        ...s,
        places: existe ? s.places.map((p) => (p.id === a.place.id ? a.place : p)) : [a.place, ...s.places],
      };
    }
    case "place/delete":
      return {
        ...s,
        places: s.places.filter((p) => p.id !== a.id),
        reviews: s.reviews.filter((r) => r.placeId !== a.id),
        favorites: s.favorites.filter((f) => f !== a.id),
      };
    case "review/add":
      return { ...s, reviews: [a.review, ...s.reviews] };
    case "review/status":
      return { ...s, reviews: s.reviews.map((r) => (r.id === a.id ? { ...r, status: a.status } : r)) };
    case "review/delete":
      return { ...s, reviews: s.reviews.filter((r) => r.id !== a.id) };
    case "fav/toggle":
      return {
        ...s,
        favorites: s.favorites.includes(a.id) ? s.favorites.filter((f) => f !== a.id) : [...s.favorites, a.id],
      };
    case "post/save": {
      const existe = s.posts.some((p) => p.id === a.post.id);
      return {
        ...s,
        posts: existe ? s.posts.map((p) => (p.id === a.post.id ? a.post : p)) : [a.post, ...s.posts],
      };
    }
    case "post/delete":
      return {
        ...s,
        posts: s.posts.filter((p) => p.id !== a.id),
        comments: s.comments.filter((c) => c.postId !== a.id),
      };
    case "comment/add":
      return { ...s, comments: [a.comment, ...s.comments] };
    case "comment/delete":
      return { ...s, comments: s.comments.filter((c) => c.id !== a.id) };
    case "doc/save": {
      const existe = s.docs.some((d) => d.id === a.doc.id);
      return { ...s, docs: existe ? s.docs.map((d) => (d.id === a.doc.id ? a.doc : d)) : [a.doc, ...s.docs] };
    }
    case "cupom/save": {
      const lista = s.cupons || [];
      const existe = lista.some((c) => c.id === a.cupom.id);
      return { ...s, cupons: existe ? lista.map((c) => (c.id === a.cupom.id ? a.cupom : c)) : [a.cupom, ...lista] };
    }
    case "receita/save": {
      const lista = s.receitas || [];
      const existe = lista.some((r) => r.id === a.receita.id);
      return { ...s, receitas: existe ? lista.map((r) => (r.id === a.receita.id ? a.receita : r)) : [a.receita, ...lista] };
    }
    case "receita/delete":
      return { ...s, receitas: (s.receitas || []).filter((r) => r.id !== a.id) };
    case "cupom/delete":
      return { ...s, cupons: (s.cupons || []).filter((c) => c.id !== a.id) };
    case "doc/delete":
      return { ...s, docs: s.docs.filter((d) => d.id !== a.id) };
    case "user/update":
      return { ...s, users: s.users.map((u) => (u.id === a.user.id ? a.user : u)) };
    case "data/replace":
      return { ...structuredClone(SEED), ...a.data, versao: Math.max(a.data.versao || 0, SEED.versao || 0), session: s.session };
    case "config/set":
      return { ...s, config: { ...s.config, ...a.config } };
    case "versao/set":
      return { ...s, versao: a.versao };
    case "session/set":
      return { ...s, session: a.userId };
    case "servidor/carregar":
      return { ...s, ...(a.conteudo || {}), reviews: a.reviews, comments: a.comments };
    default:
      return s;
  }
}

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatchLocal] = useReducer(reducer, null, carregar);
  const [toasts, setToasts] = useState([]);
  const [admin, setAdmin] = useState(null); // perfil do admin logado (modo servidor)
  const [servidor, setServidor] = useState(temBackend ? "carregando" : "local"); // carregando | ok | vazio | erro | local
  const [salvando, setSalvando] = useState(false);
  const estadoRef = useRef(state);
  const timerSalvar = useRef(null);

  useEffect(() => {
    try {
      if (temBackend) localStorage.setItem(KEY_FAVORITOS, JSON.stringify(state.favorites));
      else localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* sem persistência: o app segue funcionando na sessão atual */
    }
  }, [state]);

  const toast = useCallback((msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  // Modo servidor: busca o conteúdo e acompanha o login do admin
  const recarregar = useCallback(async () => {
    try {
      const r = await backend.carregarDoServidor();
      const proximo = reducer(estadoRef.current, { type: "servidor/carregar", ...r });
      estadoRef.current = proximo;
      dispatchLocal({ type: "servidor/carregar", ...r });
      setServidor(r.conteudo ? "ok" : "vazio");
    } catch (e) {
      setServidor("erro");
    }
  }, []);

  useEffect(() => {
    if (!temBackend) return;
    recarregar();
    backend.usuarioAtual().then(setAdmin).catch(() => setAdmin(null));
    return backend.aoMudarLogin((perfil) => {
      setAdmin(perfil);
      recarregar(); // o admin enxerga também as avaliações pendentes
    });
  }, [recarregar]);

  // Grava o conteúdo no servidor 0,8 s depois da última edição (junta várias edições seguidas)
  const agendarSalvar = useCallback(() => {
    clearTimeout(timerSalvar.current);
    setSalvando(true);
    timerSalvar.current = setTimeout(async () => {
      try {
        await backend.salvarConteudo(estadoRef.current);
        setServidor("ok");
      } catch (e) {
        toast("Não foi possível salvar no servidor. Confira a conexão e tente de novo.");
      } finally {
        setSalvando(false);
      }
    }, 800);
  }, [toast]);

  // dispatch que, no modo servidor, também grava a mudança no Supabase
  const dispatch = useCallback(
    (a) => {
      const anterior = estadoRef.current;
      estadoRef.current = reducer(anterior, a);
      dispatchLocal(a);
      if (!temBackend) return;

      const falhou = () => toast("Não foi possível salvar no servidor. Confira a conexão e tente de novo.");
      if (ACOES_CONTEUDO.test(a.type)) agendarSalvar();
      if (a.type === "place/delete") backend.avaliacoes.apagarDoLugar(a.id).catch(falhou);
      if (a.type === "post/delete") backend.comentarios.apagarDoPost(a.id).catch(falhou);
      if (a.type === "review/add") backend.avaliacoes.inserir(a.review).catch(falhou);
      if (a.type === "review/status") backend.avaliacoes.status(a.id, a.status).catch(falhou);
      if (a.type === "review/delete") backend.avaliacoes.apagar(a.id).catch(falhou);
      if (a.type === "comment/add") backend.comentarios.inserir(a.comment).catch(falhou);
      if (a.type === "comment/delete") backend.comentarios.apagar(a.id).catch(falhou);
      if (a.type === "session/set" && !a.userId) backend.sair();
    },
    [agendarSalvar, toast]
  );

  // Primeira publicação: manda o conteúdo atual (dados.json) para o servidor vazio
  const enviarTudo = useCallback(async () => {
    await backend.enviarTudo(estadoRef.current);
    setServidor("ok");
  }, []);

  // Aviso guardado antes de um recarregamento (ex.: "Salvar no projeto")
  useEffect(() => {
    try {
      const aviso = sessionStorage.getItem("rv-aviso");
      if (aviso) {
        sessionStorage.removeItem("rv-aviso");
        setTimeout(() => toast(aviso), 600);
      }
    } catch (e) {
      /* sem sessionStorage */
    }
  }, [toast]);

  const usuarioLocal = useMemo(() => state.users.find((u) => u.id === state.session) || null, [state.users, state.session]);
  const usuario = temBackend ? admin : usuarioLocal;

  const value = useMemo(
    () => ({ state, dispatch, usuario, toast, temBackend, servidor, salvando, enviarTudo, recarregar }),
    [state, dispatch, usuario, toast, servidor, salvando, enviarTudo, recarregar]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp precisa estar dentro de AppProvider");
  return ctx;
}

/* Helpers puros */
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const hoje = () => new Date().toISOString().slice(0, 10);

// Hash SHA-256 da senha. Evita guardar a senha em texto puro, mas sem backend
// isso não é proteção real: qualquer pessoa pode mexer no localStorage do próprio navegador.
export async function hashSenha(senha) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(senha));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Todo lugar começa com 5 estrelas. Quando chegam avaliações aprovadas,
// a nota passa a ser a média delas (pendentes e rejeitadas não contam).
export const NOTA_INICIAL = 5;

export function mediaDoLugar(place, reviews) {
  const aprovadas = reviews.filter((r) => r.placeId === place.id && r.status === "aprovado");
  if (!aprovadas.length) return NOTA_INICIAL;
  return aprovadas.reduce((soma, r) => soma + r.nota, 0) / aprovadas.length;
}
