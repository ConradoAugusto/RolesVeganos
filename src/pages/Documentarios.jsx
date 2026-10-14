import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { Reveal, Vazio } from "../components/ui";
import Icon from "../components/Icon";

export const TEMAS_DOC = ["Comece por aqui", "Animais", "Meio ambiente", "Saúde"];

// "Terráqueos (Earthlings)" vira "Earthlings": o título original acha mais resultados
const tituloBusca = (d) => (d.titulo.match(/\(([^)]+)\)/)?.[1] || d.titulo).trim();

// Trailer: busca no YouTube
export function linkTrailer(d) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${tituloBusca(d)} ${d.ano} trailer`)}`;
}

// Filme completo: o link cadastrado ou, sem ele, onde assistir no Brasil (JustWatch)
export function linkFilme(d) {
  return d.link || `https://br.justwatch.com/br/busca?q=${encodeURIComponent(tituloBusca(d))}`;
}

export default function Documentarios() {
  const { state } = useApp();
  const [tema, setTema] = useState("Todos");
  const docs = state.docs || [];

  const lista = useMemo(() => docs.filter((d) => tema === "Todos" || d.tema === tema), [docs, tema]);

  return (
    <div className="container">
      <Reveal>
        <div className="cabeca">
          <span className="kicker">Documentários</span>
          <h1>Para assistir, <em>pensar e conversar.</em></h1>
          <p className="lead">Uma seleção de filmes sobre animais, meio ambiente e alimentação. Alguns mostram cenas fortes: o tema de cada um ajuda a escolher por onde começar.</p>
        </div>
      </Reveal>

      <div className="chips" role="group" aria-label="Temas">
        {["Todos", ...TEMAS_DOC].map((t) => (
          <button key={t} className={`chip ${tema === t ? "ativo" : ""}`} aria-pressed={tema === t} onClick={() => setTema(t)}>{t}</button>
        ))}
      </div>

      <div className="grid-docs">
        {lista.length ? lista.map((d, i) => (
          <Reveal key={d.id} delay={Math.min(i, 6) * 0.06}>
            <article className="doc">
              <a href={linkFilme(d)} target="_blank" rel="noreferrer" className={`doc-poster ${d.imagem ? "com-imagem" : ""}`} style={{ "--c": d.cor }} aria-label={`${d.gratis ? "Assistir" : "Onde assistir"} ${d.titulo}`}>
                {d.imagem && <img src={d.imagem} alt="" loading="lazy" decoding="async" onError={(e) => e.currentTarget.remove()} />}
                <span className="doc-ano">{d.ano}</span>
                <strong>{d.titulo}</strong>
                <span className="doc-play"><Icon nome="play" tamanho={20} cheio /></span>
              </a>
              <div className="doc-corpo">
                <div className="meta">
                  <span className="etq">{d.tema}</span>
                  {d.gratis && <span className="etq gratis">Grátis</span>}
                  {d.duracao && <span>{d.duracao}</span>}
                </div>
                <p>{d.sinopse}</p>
                <small className="muted">Direção: {d.direcao}</small>
                <div className="doc-acoes">
                  <a className={`btn ${d.gratis ? "primario" : ""}`} href={linkFilme(d)} target="_blank" rel="noreferrer">
                    <Icon nome="play" tamanho={14} cheio /> {d.gratis ? "Assistir completo" : d.link ? "Assistir" : "Onde assistir"}
                  </a>
                  <a className="link" href={linkTrailer(d)} target="_blank" rel="noreferrer">Trailer</a>
                </div>
              </div>
            </article>
          </Reveal>
        )) : <Vazio titulo="Nenhum documentário neste tema" />}
      </div>

      <Reveal>
        <p className="aviso-info">
          Alguns filmes fazem afirmações sobre saúde que são contestadas por especialistas. Use-os como ponto de partida e
          converse com um nutricionista antes de mudar sua alimentação. Quer entender a base do movimento? <Link to="/veganismo">Leia sobre a história do veganismo</Link>.
        </p>
      </Reveal>
    </div>
  );
}
