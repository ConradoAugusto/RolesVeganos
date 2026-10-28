import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApp, mediaDoLugar } from "../store/AppContext";
import { TIPOS } from "../data/seed";
import { formatarDistancia } from "../lib/maps";
import Autocomplete from "./Autocomplete";
import Icon from "./Icon";

export function Estrelas({ nota }) {
  return (
    <span className="estrelas">
      <Icon nome="estrela" tamanho={14} cheio />
      <b>{Number(nota).toFixed(1)}</b>
    </span>
  );
}

export function Capa({ nome, cor, imagem, className = "foto" }) {
  if (imagem) {
    return (
      <div className={`${className} com-imagem`} style={{ "--c": cor }}>
        <img src={imagem} alt="" loading="lazy" decoding="async" />
      </div>
    );
  }
  return <div className={className} style={{ "--c": cor }} data-ini={nome.replace(/^Exemplo\s+/i, "").charAt(0)} />;
}

export function PlaceCard({ place, favorito, onFav, distancia, ativo, delay = 0 }) {
  const { state } = useApp();
  const nota = mediaDoLugar(place, state.reviews);
  const total = state.reviews.filter((r) => r.placeId === place.id && r.status === "aprovado").length;
  return (
    <article className={`cartao ${ativo ? "ativo" : ""}`} style={{ "--atraso": `${delay}s` }}>
      <Link to={`/lugar/${place.id}`} className="cartao-capa" aria-label={place.nome} tabIndex={-1}>
        <Capa nome={place.nome} cor={place.cor} imagem={place.imagem} />
      </Link>
      <div className="corpo">
        <div className="cartao-topo">
          <Link to={`/lugar/${place.id}`} className="titulo-card">{place.nome}</Link>
          {onFav && (
            <button
              className={`coracao ${favorito ? "ativo" : ""}`}
              onClick={onFav}
              aria-pressed={favorito}
              aria-label={favorito ? "Remover dos salvos" : "Salvar"}
            >
              <Icon nome="coracao" cheio={favorito} />
            </button>
          )}
        </div>
        <div className="meta">
          <Estrelas nota={nota} />
          <span>{total} {total === 1 ? "avaliação" : "avaliações"}</span>
          <span>{place.tipo}</span>
          {place.notaGoogle ? <span className="nota-google" title="Nota no Google">G {Number(place.notaGoogle).toFixed(1).replace(".", ",")}</span> : null}
          {distancia != null && <span className="dist"><Icon nome="pin" tamanho={13} />{formatarDistancia(distancia)}</span>}
        </div>
        <p className="desc">{place.descricao}</p>
        <div className="etiquetas">
          {place.tags.slice(0, 3).map((t) => <span key={t} className="etq">{t}</span>)}
        </div>
      </div>
    </article>
  );
}

const VAZIO_LUGAR = { nome: "", tipo: TIPOS[0], tags: "", descricao: "", endereco: "", cidade: "", lat: "", lng: "", horario: "", telefone: "", site: "", imagem: "", redes: {}, notaGoogle: "", totalGoogle: "", cor: "#2e7d32", status: "aprovado" };

export function PlaceForm({ inicial, onSubmit }) {
  const [f, setF] = useState(() => ({ ...VAZIO_LUGAR, ...inicial, redes: { ...(inicial?.redes || {}) }, lat: inicial?.lat ?? "", lng: inicial?.lng ?? "" }));
  const setRede = (k) => (e) => setF((x) => ({ ...x, redes: { ...x.redes, [k]: e.target.value } }));
  const [erros, setErros] = useState({});
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  function validar() {
    const e = {};
    if (f.nome.trim().length < 3) e.nome = "Informe um nome com pelo menos 3 letras.";
    if (f.endereco.trim().length < 5) e.endereco = "Informe um endereço completo.";
    if (f.cidade.trim().length < 2) e.cidade = "Informe a cidade.";
    if (f.descricao.trim().length < 10) e.descricao = "Descreva o lugar em pelo menos 10 caracteres.";
    if (f.site && !/^https?:\/\//.test(f.site)) e.site = "Use o formato https://...";
    if (f.imagem && !/^(https?:\/\/|\/|data:image\/)/.test(f.imagem)) e.imagem = "A imagem precisa ser um link https:// ou um arquivo enviado.";
    const lat = Number(f.lat), lng = Number(f.lng);
    if (f.lat === "" || f.lng === "" || Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
      e.coord = "Escolha o endereço numa sugestão ou informe latitude e longitude válidas.";
    return e;
  }

  function enviar(e) {
    e.preventDefault();
    const err = validar();
    setErros(err);
    if (Object.keys(err).length) return;
    onSubmit({
      ...f,
      nome: f.nome.trim(),
      cidade: f.cidade.trim(),
      tags: (Array.isArray(f.tags) ? f.tags : f.tags.split(",")).map((t) => t.trim()).filter(Boolean).slice(0, 6),
      lat: Number(f.lat),
      lng: Number(f.lng),
      // Guarda só as redes preenchidas
      notaGoogle: f.notaGoogle === "" ? "" : Math.min(5, Math.max(0, Number(String(f.notaGoogle).replace(",", ".")) || 0)),
      totalGoogle: f.totalGoogle === "" ? "" : Math.max(0, parseInt(String(f.totalGoogle).replace(/\D/g, ""), 10) || 0),
      redes: Object.fromEntries(Object.entries(f.redes || {}).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)),
    });
  }

  return (
    <form className="form" onSubmit={enviar} noValidate>
      <div className="grid-2">
        <Campo label="Nome do lugar *" erro={erros.nome}>
          <input value={f.nome} onChange={set("nome")} maxLength={80} />
        </Campo>
        <Campo label="Tipo *">
          <select value={f.tipo} onChange={set("tipo")}>
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Campo>
      </div>

      <Campo label="Endereço *" erro={erros.endereco || erros.coord} dica="Digite e escolha uma sugestão: cidade e localização são preenchidas sozinhas. Se o número não aparecer, escolha a rua e ajuste o número no texto.">
        <Autocomplete
          valor={f.endereco}
          onChange={(v) => setF((x) => ({ ...x, endereco: v }))}
          onEscolher={(r) => setF((x) => ({ ...x, endereco: r.endereco, cidade: r.cidade || x.cidade, lat: +r.lat.toFixed(6), lng: +r.lng.toFixed(6) }))}
          icone="pin"
          placeholder="Rua, número, bairro"
          rotulo="Endereço"
        />
      </Campo>

      <div className="grid-3">
        <Campo label="Cidade *" erro={erros.cidade}><input value={f.cidade} onChange={set("cidade")} /></Campo>
        <Campo label="Latitude"><input inputMode="decimal" value={f.lat} onChange={set("lat")} placeholder="-23.55" /></Campo>
        <Campo label="Longitude"><input inputMode="decimal" value={f.lng} onChange={set("lng")} placeholder="-46.63" /></Campo>
      </div>

      <Campo label="Descrição *" erro={erros.descricao}>
        <textarea rows={4} value={f.descricao} onChange={set("descricao")} maxLength={500} />
      </Campo>
      <div className="grid-2">
        <Campo label="Horário"><input value={f.horario} onChange={set("horario")} placeholder="ex.: 11h às 23h" /></Campo>
        <Campo label="Telefone"><input value={f.telefone} onChange={set("telefone")} /></Campo>
      </div>
      <div className="grid-2">
        <Campo label="Site" erro={erros.site}><input value={f.site} onChange={set("site")} placeholder="https://" /></Campo>
        <Campo label="Etiquetas (separadas por vírgula)">
          <input value={Array.isArray(f.tags) ? f.tags.join(", ") : f.tags} onChange={set("tags")} placeholder="100% vegano, Delivery" />
        </Campo>
      </div>
      <fieldset className="grupo">
        <legend>Imagem de capa</legend>
        <CampoImagem rotulo="Foto do lugar" valor={f.imagem} cor={f.cor} onChange={(imagem) => setF((x) => ({ ...x, imagem }))} formato="largo" />
        {erros.imagem && <small className="erro">{erros.imagem}</small>}
      </fieldset>

      <fieldset className="grupo">
        <legend>Avaliação no Google</legend>
        <div className="grid-2">
          <Campo label="Nota no Google" dica="Copie do Google Maps (ex.: 4,6).">
            <input inputMode="decimal" value={f.notaGoogle} onChange={set("notaGoogle")} placeholder="4,6" />
          </Campo>
          <Campo label="Número de avaliações"><input inputMode="numeric" value={f.totalGoogle} onChange={set("totalGoogle")} placeholder="320" /></Campo>
        </div>
      </fieldset>

      <fieldset className="grupo">
        <legend>Redes sociais</legend>
        <div className="grid-2">
          {REDES.map((r) => (
            <Campo key={r.k} label={r.nome}>
              <div className="campo-rede">
                <Icon nome={r.icone} tamanho={16} />
                <input value={f.redes?.[r.k] || ""} onChange={setRede(r.k)} placeholder={r.dica} />
              </div>
            </Campo>
          ))}
        </div>
      </fieldset>

      <div className="grid-2">
        <Campo label="Visibilidade">
          <select value={f.status} onChange={set("status")}>
            <option value="aprovado">Publicado</option>
            <option value="pendente">Para aprovar (oculto)</option>
            <option value="rascunho">Rascunho (oculto)</option>
          </select>
        </Campo>
        <Campo label="Cor da capa"><input type="color" value={f.cor} onChange={set("cor")} /></Campo>
      </div>
      <button className="btn primario" type="submit">Salvar lugar</button>
    </form>
  );
}

export function Campo({ label, erro, dica, children }) {
  return (
    <label className={`campo ${erro ? "com-erro" : ""}`}>
      <span>{label}</span>
      {children}
      {erro ? <small className="erro">{erro}</small> : dica && <small className="dica">{dica}</small>}
    </label>
  );
}

export function Vazio({ titulo, texto, children }) {
  return (
    <div className="vazio">
      <Icon nome="folha" tamanho={28} />
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}

// Aparece com fade + subida quando entra na tela
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }) {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setVisivel(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisivel(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${visivel ? "visivel" : ""} ${className}`} style={{ "--atraso": `${delay}s` }}>
      {children}
    </Tag>
  );
}

// Reduz a imagem enviada para caber no arquivo de dados (até ~480px de largura, JPEG)
export function lerImagem(file, largura = 480) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, largura / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Campo de imagem reutilizável: link ou envio do computador, com prévia
export function CampoImagem({ rotulo, valor, cor, onChange, formato = "poster" }) {
  const { toast } = useApp();
  return (
    <div className={`campo-imagem ${formato}`}>
      <div className="previa-poster" style={{ "--c": cor }}>
        {valor ? <img src={valor} alt="Prévia" /> : <span>Sem imagem</span>}
      </div>
      <div className="form">
        <Campo label={`${rotulo} (URL)`} dica="Cole um link https:// ou envie um arquivo do computador.">
          <input value={valor?.startsWith("data:") ? "(imagem enviada)" : valor || ""} onChange={(e) => onChange(e.target.value)} placeholder="https://" />
        </Campo>
        <div className="acoes-linha">
          <label className="btn">
            Enviar imagem
            <input type="file" accept="image/*" hidden onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                onChange(await lerImagem(file, formato === "largo" ? 1200 : 480));
              }
              catch (err) { toast("Não foi possível enviar a imagem"); }
            }} />
          </label>
          {valor && <button type="button" className="btn" onClick={() => onChange("")}>Remover</button>}
        </div>
      </div>
    </div>
  );
}

/* ===== Redes sociais ===== */

export const REDES = [
  { k: "instagram", nome: "Instagram", icone: "instagram", dica: "@perfil ou link" },
  { k: "facebook", nome: "Facebook", icone: "facebook", dica: "página ou link" },
  { k: "tiktok", nome: "TikTok", icone: "tiktok", dica: "@perfil ou link" },
  { k: "whatsapp", nome: "WhatsApp", icone: "whatsapp", dica: "número com DDD" },
];

// Aceita "@perfil", "perfil" ou o link completo e devolve o link da rede
export function linkRede(rede, valor = "") {
  const v = valor.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const user = v.replace(/^@/, "").replace(/^(www\.)?(instagram|facebook|tiktok)\.com\//i, "").replace(/\/$/, "");
  if (rede === "instagram") return `https://instagram.com/${user}`;
  if (rede === "facebook") return `https://facebook.com/${user}`;
  if (rede === "tiktok") return `https://www.tiktok.com/@${user.replace(/^@/, "")}`;
  if (rede === "whatsapp") {
    let n = v.replace(/\D/g, "");
    if (n.length === 10 || n.length === 11) n = "55" + n;
    return n ? `https://wa.me/${n}` : "";
  }
  return "";
}

export function RedesSociais({ redes = {}, className = "" }) {
  const lista = REDES.filter((r) => redes[r.k]);
  if (!lista.length) return null;
  return (
    <div className={`redes ${className}`}>
      {lista.map((r) => (
        <a key={r.k} href={linkRede(r.k, redes[r.k])} target="_blank" rel="noopener noreferrer" className={`rede rede-${r.k}`} aria-label={r.nome} title={r.nome}>
          <Icon nome={r.icone} tamanho={18} />
        </a>
      ))}
    </div>
  );
}
