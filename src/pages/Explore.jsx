import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useApp, mediaDoLugar } from "../store/AppContext";
import { useCidade } from "../store/CidadeContext";
import { PlaceCard, Vazio, Reveal } from "../components/ui";
import Autocomplete from "../components/Autocomplete";
import Mapa from "../components/Mapa";
import Icon from "../components/Icon";
import { TIPOS } from "../data/seed";
import { distanciaKm, normalizar } from "../lib/maps";

const CATS = ["Todos", ...TIPOS];
const RAIO_KM = 40;

function naCidade(p, cidade) {
  if (!cidade) return true;
  if (cidade.lat != null && p.lat != null) return distanciaKm(cidade, p) <= RAIO_KM;
  return normalizar(p.cidade) === normalizar(cidade.nome);
}

export default function Explore() {
  const { state, dispatch } = useApp();
  const { cidade, status, localizar, definir, limpar } = useCidade();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const campoCidade = useRef(null);

  const [textoCidade, setTextoCidade] = useState("");
  const [busca, setBusca] = useState(params.get("q") || "");
  const [cat, setCat] = useState("Todos");
  const [ordem, setOrdem] = useState(cidade?.origem === "gps" ? "perto" : "nota");
  const [soSalvos, setSoSalvos] = useState(false);
  const [ativo, setAtivo] = useState(null);
  const [vista, setVista] = useState("lista"); // só no celular
  const q = normalizar(params.get("q") || "");

  // Link "trocar cidade" do cabeçalho
  useEffect(() => {
    if (location.state?.focarCidade || location.hash === "#cidade") {
      campoCidade.current?.focus();
      campoCidade.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [location.key]);

  useEffect(() => {
    if (cidade?.origem === "gps") setOrdem("perto");
  }, [cidade]);

  const publicados = useMemo(() => state.places.filter((p) => p.status === "aprovado"), [state.places]);

  const cidadesConhecidas = useMemo(() => {
    const mapa = new Map();
    publicados.forEach((p) => {
      if (!p.cidade) return;
      const k = normalizar(p.cidade);
      if (!mapa.has(k)) mapa.set(k, { principal: p.cidade, secundario: "", valor: { nome: p.cidade, lat: p.lat, lng: p.lng } });
    });
    return [...mapa.values()];
  }, [publicados]);

  const lista = useMemo(() => {
    const filtrada = publicados
      .filter(
        (p) =>
          naCidade(p, cidade) &&
          (cat === "Todos" || p.tipo === cat) &&
          (!soSalvos || state.favorites.includes(p.id)) &&
          normalizar(p.nome + " " + p.tipo + " " + p.descricao + " " + p.tags.join(" ") + " " + p.endereco).includes(q)
      )
      .map((p) => ({
        ...p,
        media: mediaDoLugar(p, state.reviews),
        distancia: cidade?.lat != null && p.lat != null ? distanciaKm(cidade, p) : null,
      }));
    return filtrada.sort((a, b) => {
      if (ordem === "nome") return a.nome.localeCompare(b.nome);
      if (ordem === "perto" && a.distancia != null) return a.distancia - b.distancia;
      return b.media - a.media;
    });
  }, [publicados, state.reviews, state.favorites, cidade, cat, soSalvos, q, ordem]);

  function escolherCidade(c) {
    definir({ nome: c.cidade || c.nome, lat: c.lat ?? null, lng: c.lng ?? null, origem: "busca" });
    setTextoCidade("");
    if (ordem === "perto") setOrdem("nota");
  }

  function buscar(e) {
    e.preventDefault();
    const t = busca.trim();
    setParams(t ? { q: t } : {});
  }

  function limparTudo() {
    setCat("Todos");
    setSoSalvos(false);
    setBusca("");
    setParams({});
  }

  const temFiltro = q || cat !== "Todos" || soSalvos;
  // Se o serviço de endereços falhar, o GPS dá só as coordenadas, sem o nome da cidade
  const onde = cidade ? (cidade.semNome ? "perto de você" : `em ${cidade.nome}`) : "";

  return (
    <>
      <section className="hero">
        <div className="container">
          <Reveal>
            <p className="hero-local">
              <span className="ponto" aria-hidden="true" />
              {status === "localizando" ? (
                "Descobrindo onde você está…"
              ) : cidade ? (
                cidade.semNome ? <>Mostrando lugares <b>perto de você</b></> : <>Você está em <b>{cidade.nome}</b></>
              ) : (
                "Mostrando todas as cidades"
              )}
            </p>
            <h1>Seu próximo <em>rolê vegano</em> começa aqui.</h1>
            <p className="sub">Restaurantes, cafés, padarias e lojas veganas, com avaliações de quem já foi.</p>
          </Reveal>

          <Reveal delay={0.1}>
            <form className="busca-hero" onSubmit={buscar} role="search" id="cidade">
              <Autocomplete
                inputRef={campoCidade}
                valor={textoCidade}
                onChange={setTextoCidade}
                onEscolher={escolherCidade}
                onTextoLivre={(t) => t && escolherCidade({ nome: t })}
                tipos={["cidade"]}
                perto={cidade?.origem === "gps" ? cidade : null}
                locais={cidadesConhecidas}
                icone="pin"
                placeholder={cidade && !cidade.semNome ? `${cidade.nome} · trocar cidade` : "Digite uma cidade"}
                rotulo="Cidade"
                className="campo-cidade"
              />
              <div className="auto campo-oque">
                <Icon nome="busca" className="auto-icone" />
                <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Prato, lugar ou bairro" aria-label="O que você procura" />
              </div>
              <button className="btn primario" type="submit">Buscar</button>
            </form>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="hero-acoes">
              <button className="link-suave" onClick={localizar} disabled={status === "localizando"}>
                <Icon nome="mira" tamanho={16} />
                {status === "localizando" ? "Localizando…" : "Usar minha localização"}
              </button>
              {cidade && (
                <button className="link-suave" onClick={limpar}>
                  <Icon nome="globo" tamanho={16} /> Ver todas as cidades
                </button>
              )}
              {status === "negado" && <span className="aviso-mini">Localização bloqueada no navegador. Digite a cidade acima.</span>}
              {status === "indisponivel" && <span className="aviso-mini">Não foi possível obter sua localização. Digite a cidade acima.</span>}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="container filtros">
        <div className="chips" role="group" aria-label="Categorias">
          {CATS.map((c) => (
            <button key={c} className={`chip ${cat === c ? "ativo" : ""}`} aria-pressed={cat === c} onClick={() => { setCat(c); setAtivo(null); }}>
              {c}
            </button>
          ))}
        </div>
        <div className="ferramentas">
          <button className={`chip ${soSalvos ? "ativo" : ""}`} aria-pressed={soSalvos} onClick={() => setSoSalvos((s) => !s)}>
            <Icon nome="coracao" tamanho={14} cheio={soSalvos} /> Salvos
          </button>
          <select className="ordem" value={ordem} onChange={(e) => setOrdem(e.target.value)} aria-label="Ordenar">
            {cidade?.lat != null && <option value="perto">Mais perto</option>}
            <option value="nota">Melhor avaliados</option>
            <option value="nome">Nome (A–Z)</option>
          </select>
        </div>
      </div>

      <div className="container alternar-vista" role="group" aria-label="Visualização">
        <button className={vista === "lista" ? "ativo" : ""} onClick={() => setVista("lista")}>Lista</button>
        <button className={vista === "mapa" ? "ativo" : ""} onClick={() => setVista("mapa")}>Mapa</button>
      </div>

      <div className={`container principal vista-${vista}`}>
        <div className="painel">
          <div className="resumo">
            <h2>
              {lista.length} {lista.length === 1 ? "lugar" : "lugares"}
              {cidade && <span className="muted"> {onde}</span>}
              {params.get("q") && <span className="muted"> para “{params.get("q")}”</span>}
            </h2>
            {temFiltro && <button className="link" onClick={limparTudo}>Limpar filtros</button>}
          </div>

          <div className="lista">
            {lista.length ? (
              lista.map((p, i) => (
                <div key={p.id} onMouseEnter={() => setAtivo(p.id)} onMouseLeave={() => setAtivo(null)}>
                  <PlaceCard
                    place={p}
                    delay={Math.min(i, 8) * 0.05}
                    ativo={ativo === p.id}
                    distancia={cidade?.origem === "gps" ? p.distancia : null}
                    favorito={state.favorites.includes(p.id)}
                    onFav={() => dispatch({ type: "fav/toggle", id: p.id })}
                  />
                </div>
              ))
            ) : (
              <Vazio
                titulo={cidade && !temFiltro ? `Ainda não temos lugares ${onde}` : "Nada encontrado"}
                texto={cidade && !temFiltro ? "Conhece algum? Mande pra gente pelo contato. Enquanto isso, veja outras cidades:" : "Tente outro termo ou troque a categoria."}
              >
                <div className="chips centro">
                  {cidade && !temFiltro
                    ? cidadesConhecidas.map((c) => (
                        <button key={c.principal} className="chip" onClick={() => escolherCidade(c.valor)}>{c.principal}</button>
                      ))
                    : <button className="btn" onClick={limparTudo}>Limpar filtros</button>}
                </div>
              </Vazio>
            )}
          </div>
        </div>

        <div className="painel-mapa">
          <Mapa
            lugares={lista}
            ativoId={ativo}
            centro={cidade}
            onHover={setAtivo}
            onSelect={(id) => navigate(`/lugar/${id}`)}
          />
        </div>
      </div>
    </>
  );
}
