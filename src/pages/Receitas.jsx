import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { Reveal, Vazio } from "../components/ui";
import Icon from "../components/Icon";
import { normalizar } from "../lib/maps";

export const CATEGORIAS_RECEITA = ["Pratos principais", "Pães e massas", "Molhos e pastas", "Bebidas e leites vegetais", "Doces"];

function useReceitas() {
  const { state, usuario } = useApp();
  const admin = usuario?.role === "admin";
  const lista = (state.receitas || []).filter((r) => admin || r.status === "publicado");
  return { lista, admin };
}

export function ReceitasLista() {
  const { lista, admin } = useReceitas();
  const [cat, setCat] = useState("Todas");
  const [busca, setBusca] = useState("");

  const categorias = ["Todas", ...CATEGORIAS_RECEITA.filter((c) => lista.some((r) => r.categoria === c))];
  const filtradas = useMemo(() => {
    const q = normalizar(busca);
    return lista.filter(
      (r) =>
        (cat === "Todas" || r.categoria === cat) &&
        normalizar(r.titulo + " " + r.resumo + " " + (r.ingredientes || []).join(" ")).includes(q)
    );
  }, [lista, cat, busca]);

  return (
    <div className="container">
      <Reveal>
        <div className="cabeca">
          <span className="kicker">Receitas</span>
          <h1>Comida vegana <em>do dia a dia.</em></h1>
          <p className="lead">Receitas simples, com ingredientes fáceis de achar. Do leite vegetal ao pudim.</p>
        </div>
        <div className="auto busca-blog">
          <Icon nome="busca" className="auto-icone" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar receita ou ingrediente" aria-label="Buscar receita ou ingrediente" />
        </div>
      </Reveal>

      <div className="chips" role="group" aria-label="Categorias">
        {categorias.map((c) => (
          <button key={c} className={`chip ${cat === c ? "ativo" : ""}`} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
        ))}
      </div>

      <div className="grid-receitas">
        {filtradas.length ? filtradas.map((r, i) => (
          <Reveal key={r.id} delay={Math.min(i, 8) * 0.05}>
            <Link to={`/receitas/${r.slug}`} className="receita">
              <div className="receita-foto">
                {r.imagem ? <img src={r.imagem} alt="" loading="lazy" decoding="async" /> : <span>{r.titulo.charAt(0)}</span>}
                <span className="receita-cat">{r.categoria}</span>
              </div>
              <div className="corpo">
                {admin && r.status !== "publicado" && <em className="status rascunho">rascunho</em>}
                <h2>{r.titulo}</h2>
                <p>{r.resumo}</p>
                {r.tempo && <span className="meta"><Icon nome="relogio" tamanho={14} /> {r.tempo}</span>}
              </div>
            </Link>
          </Reveal>
        )) : <Vazio titulo="Nenhuma receita encontrada" texto="Tente outro ingrediente ou categoria." />}
      </div>
    </div>
  );
}

export function ReceitaPagina() {
  const { slug } = useParams();
  const { lista, admin } = useReceitas();
  const r = lista.find((x) => x.slug === slug);
  const [feitos, setFeitos] = useState(() => new Set());

  if (!r) {
    return (
      <div className="container pagina-vazia">
        <Vazio titulo="Receita não encontrada"><Link className="btn primario" to="/receitas">Ver todas as receitas</Link></Vazio>
      </div>
    );
  }

  const marcar = (i) => setFeitos((s) => {
    const n = new Set(s);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });
  const outras = lista.filter((x) => x.id !== r.id && x.categoria === r.categoria).slice(0, 3);

  return (
    <article className="container leitura receita-pagina">
      <Link to="/receitas" className="voltar"><Icon nome="voltar" tamanho={16} /> Todas as receitas</Link>
      <Reveal>
        {r.imagem && <img className="capa-grande" src={r.imagem} alt={r.titulo} />}
        <span className="kicker">{r.categoria}</span>
        <h1>{r.titulo}</h1>
        <p className="lead">{r.resumo}</p>
        <div className="receita-info">
          {r.tempo && <span><Icon nome="relogio" tamanho={16} /> {r.tempo}</span>}
          {r.rendimento && <span><Icon nome="folha" tamanho={16} /> {r.rendimento}</span>}
          {admin && (
            <Link className="btn escuro" to={`/admin?aba=receitas&editar=${r.id}`}><Icon nome="editar" tamanho={16} /> Editar receita</Link>
          )}
        </div>
        {admin && r.obs && <p className="nota-verificacao">{r.obs}</p>}
      </Reveal>

      <div className="receita-grid">
        <Reveal as="section" className="bloco-info receita-ingredientes">
          <h2>Ingredientes</h2>
          <ul>
            {(r.ingredientes || []).map((t, i) =>
              t.startsWith("## ") ? (
                <li key={i} className="subtitulo">{t.slice(3)}</li>
              ) : (
                <li key={i}>
                  <label className={feitos.has(i) ? "feito" : ""}>
                    <input type="checkbox" checked={feitos.has(i)} onChange={() => marcar(i)} />
                    <span>{t}</span>
                  </label>
                </li>
              )
            )}
          </ul>
        </Reveal>

        <Reveal as="section" delay={0.08} className="receita-preparo">
          <h2>Modo de preparo</h2>
          {r.preparo?.length ? (
            <ol>{r.preparo.map((p, i) => <li key={i}>{p}</li>)}</ol>
          ) : (
            <p className="muted">Modo de preparo em breve.</p>
          )}
          {r.dicas?.length > 0 && (
            <div className="receita-dicas">
              <h3>Dicas</h3>
              <ul>{r.dicas.map((d, i) => <li key={i}>{d}</li>)}</ul>
            </div>
          )}
        </Reveal>
      </div>

      {r.fonte && (
        <p className="aviso-info">Receita publicada originalmente no blog <a href={r.fonte} target="_blank" rel="noreferrer">Hamu Cumê</a>.</p>
      )}

      {outras.length > 0 && (
        <section className="relacionados">
          <h2>Mais receitas de {r.categoria.toLowerCase()}</h2>
          <div className="grid-receitas">
            {outras.map((o) => (
              <Link key={o.id} to={`/receitas/${o.slug}`} className="receita">
                <div className="receita-foto">{o.imagem ? <img src={o.imagem} alt="" loading="lazy" /> : <span>{o.titulo.charAt(0)}</span>}</div>
                <div className="corpo"><h3>{o.titulo}</h3></div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
