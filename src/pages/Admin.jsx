import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApp, newId, hoje, hashSenha } from "../store/AppContext";
import { Campo, CampoImagem, PlaceForm, Vazio } from "../components/ui";
import Icon from "../components/Icon";
import { SEED } from "../data/seed";
import { TEMAS_DOC } from "./Documentarios";
import { CATEGORIAS_CUPOM, cupomVencido } from "./Cupons";
import { CATEGORIAS_RECEITA } from "./Receitas";
import { normalizar } from "../lib/maps";
import * as backend from "../lib/backend";

const ABAS = [
  ["visao", "Visão geral"],
  ["lugares", "Lugares"],
  ["blog", "Blog"],
  ["receitas", "Receitas"],
  ["docs", "Documentários"],
  ["cupons", "Cupons"],
  ["avaliacoes", "Avaliações"],
  ["config", "Configurações"],
];

export default function Admin() {
  const [params, setParams] = useSearchParams();
  const aba = ABAS.some(([k]) => k === params.get("aba")) ? params.get("aba") : "visao";
  const irPara = (k) => setParams({ aba: k });

  return (
    <div className="container admin">
      <div className="admin-cabeca">
        <span className="kicker">Gestão</span>
        <h1>Painel</h1>
      </div>
      <nav className="abas" aria-label="Seções do painel">
        {ABAS.map(([k, label]) => (
          <button key={k} className={`chip ${aba === k ? "ativo" : ""}`} aria-pressed={aba === k} onClick={() => irPara(k)}>{label}</button>
        ))}
      </nav>
      <div className="admin-conteudo" key={aba}>
        {aba === "visao" && <Visao irPara={irPara} />}
        {aba === "lugares" && <Lugares editarId={params.get("editar")} />}
        {aba === "avaliacoes" && <Avaliacoes />}
        {aba === "docs" && <DocsAdmin />}
        {aba === "receitas" && <ReceitasAdmin editarId={params.get("editar")} />}
        {aba === "cupons" && <CuponsAdmin />}
        {aba === "blog" && <BlogAdmin editarId={params.get("editar")} />}
        {aba === "config" && <Configuracoes />}
      </div>
    </div>
  );
}

function Stat({ rotulo, valor, onClick }) {
  return (
    <button className="stat" onClick={onClick}>
      <b>{valor}</b>
      <span>{rotulo}</span>
    </button>
  );
}

function Visao({ irPara }) {
  const { state } = useApp();
  return (
    <div className="stats">
      <Stat rotulo="Lugares publicados" valor={state.places.filter((p) => p.status === "aprovado").length} onClick={() => irPara("lugares")} />
      <Stat rotulo="Lugares para aprovar" valor={state.places.filter((p) => p.status === "pendente").length} onClick={() => irPara("lugares")} />
      <Stat rotulo="Avaliações para revisar" valor={state.reviews.filter((r) => r.status === "pendente").length} onClick={() => irPara("avaliacoes")} />
      <Stat rotulo="Documentários" valor={(state.docs || []).length} onClick={() => irPara("docs")} />
      <Stat rotulo="Cupons ativos" valor={(state.cupons || []).filter((c) => c.status === "publicado" && !cupomVencido(c)).length} onClick={() => irPara("cupons")} />
      <Stat rotulo="Artigos" valor={state.posts.length} onClick={() => irPara("blog")} />
      <Stat rotulo="Receitas" valor={(state.receitas || []).length} onClick={() => irPara("receitas")} />
      <Stat rotulo="Comentários" valor={state.comments.length} onClick={() => irPara("blog")} />
    </div>
  );
}

const STATUS_LUGAR = {
  aprovado: ["aprovado", "publicado"],
  pendente: ["pendente", "para aprovar"],
  rascunho: ["rascunho", "rascunho"],
};

function Lugares({ editarId }) {
  const { state, dispatch, toast } = useApp();
  const [, setParams] = useSearchParams();
  const [novo, setNovo] = useState(false);
  const pendentes = state.places.filter((p) => p.status === "pendente").length;
  const [filtro, setFiltro] = useState(pendentes ? "pendente" : "todos");
  const [busca, setBusca] = useState("");
  const editando = novo ? "novo" : state.places.find((p) => p.id === editarId) || null;

  const lista = useMemo(
    () =>
      state.places.filter(
        (p) =>
          (filtro === "todos" || p.status === filtro) &&
          (p.nome + p.cidade).toLowerCase().includes(busca.toLowerCase())
      ),
    [state.places, filtro, busca]
  );

  function fechar() {
    setNovo(false);
    setParams({ aba: "lugares" });
  }

  function salvar(dados) {
    const base = editando === "novo" ? { id: newId(), nota: 0 } : editando;
    const lugar = { ...base, ...dados };
    // Coordenada mexida à mão ou escolhida numa sugestão deixa de ser "aproximada"
    if (base.lat !== dados.lat || base.lng !== dados.lng) delete lugar.precisao;
    dispatch({ type: "place/save", place: lugar });
    toast(editando === "novo" ? "Lugar criado" : dados.status === "aprovado" && base.status === "pendente" ? "Lugar aprovado e publicado" : "Lugar atualizado");
    fechar();
  }

  function aprovar(p) {
    dispatch({ type: "place/save", place: { ...p, status: "aprovado" } });
    toast(`${p.nome} publicado`);
  }

  function remover(p, rejeitar = false) {
    const msg = rejeitar ? `Rejeitar "${p.nome}"? A sugestão será apagada.` : `Excluir "${p.nome}"? As avaliações dele também serão removidas.`;
    if (!window.confirm(msg)) return;
    dispatch({ type: "place/delete", id: p.id });
    toast(rejeitar ? "Sugestão rejeitada" : "Lugar excluído");
  }

  if (editando) {
    return (
      <section className="painel-form">
        <div className="linha-topo">
          <h2>{editando === "novo" ? "Novo lugar" : `Editar: ${editando.nome}`}</h2>
          <button className="btn" onClick={fechar}>Cancelar</button>
        </div>
        {editando !== "novo" && (editando.obs || editando.fonte || editando.precisao) && (
          <div className="nota-verificacao">
            <strong>Antes de aprovar, confira:</strong>
            {editando.obs && <p>{editando.obs}</p>}
            {editando.precisao && <p>Localização no mapa aproximada ({editando.precisao}). Digite o endereço e escolha uma sugestão para acertar o pino, ou cole a latitude e a longitude do Google Maps (botão direito no local).</p>}
            {editando.fonte && <p>Fonte: <a href={editando.fonte} target="_blank" rel="noreferrer">{editando.fonte.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}</a></p>}
          </div>
        )}
        <PlaceForm key={editando.id || "novo"} inicial={editando === "novo" ? undefined : editando} onSubmit={salvar} />
      </section>
    );
  }

  return (
    <section>
      <div className="linha-topo">
        <div className="filtros-admin">
          {[["pendente", `Para aprovar${pendentes ? ` (${pendentes})` : ""}`], ["aprovado", "Publicados"], ["rascunho", "Rascunhos"], ["todos", "Todos"]].map(([f, l]) => (
            <button key={f} className={`chip ${filtro === f ? "ativo" : ""}`} onClick={() => setFiltro(f)}>{l}</button>
          ))}
          <input className="busca-admin" type="search" placeholder="Buscar por nome ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <button className="btn primario" onClick={() => setNovo(true)}><Icon nome="mais" tamanho={16} /> Novo lugar</button>
      </div>
      {filtro === "pendente" && pendentes > 0 && (
        <p className="aviso-info">Lugares encontrados em pesquisa na internet. Ficam ocultos no site até você aprovar. Abra <b>Revisar</b> para ver a fonte, o que conferir e ajustar os dados.</p>
      )}
      <div className="tabela">
        <div className="linha cab"><span>Nome</span><span>Cidade</span><span>Status</span><span>Ações</span></div>
        {lista.length ? lista.map((p) => {
          const [classe, rotulo] = STATUS_LUGAR[p.status] || STATUS_LUGAR.rascunho;
          return (
            <div key={p.id} className="linha">
              <span>
                <strong>{p.nome}</strong>
                <small>{p.endereco}</small>
                {p.status === "pendente" && p.obs && <small className="obs">{p.obs}</small>}
              </span>
              <span>{p.cidade || "—"}</span>
              <span><em className={`status ${classe}`}>{rotulo}</em></span>
              <span className="acoes-linha">
                {p.status === "pendente" ? (
                  <>
                    <button className="link" onClick={() => setParams({ aba: "lugares", editar: p.id })}>Revisar</button>
                    <button className="link" onClick={() => aprovar(p)}>Aprovar</button>
                    <button className="link perigo" onClick={() => remover(p, true)}>Rejeitar</button>
                  </>
                ) : (
                  <>
                    <Link className="link" to={`/lugar/${p.id}`}>Ver</Link>
                    <button className="link" onClick={() => setParams({ aba: "lugares", editar: p.id })}>Editar</button>
                    <button className="link perigo" onClick={() => remover(p)}>Excluir</button>
                  </>
                )}
              </span>
            </div>
          );
        }) : <Vazio titulo={filtro === "pendente" ? "Nada para aprovar" : "Nenhum lugar neste filtro"} />}
      </div>
    </section>
  );
}

function Avaliacoes() {
  const { state, dispatch, toast } = useApp();
  const [filtro, setFiltro] = useState("pendente");
  const lista = state.reviews.filter((r) => filtro === "todos" || r.status === filtro);

  return (
    <section>
      <div className="filtros-admin">
        {[["pendente", "Para revisar"], ["aprovado", "Publicadas"], ["rejeitado", "Rejeitadas"], ["todos", "Todas"]].map(([f, l]) => (
          <button key={f} className={`chip ${filtro === f ? "ativo" : ""}`} onClick={() => setFiltro(f)}>{l}</button>
        ))}
      </div>
      <div className="lista-reviews">
        {lista.length ? lista.map((r) => {
          const lugar = state.places.find((p) => p.id === r.placeId);
          return (
            <div key={r.id} className="review">
              <div className="review-topo">
                <div><strong>{r.userName}</strong><small> em {lugar?.nome || "lugar removido"} · {r.data}</small></div>
                <span className="nota-review"><Icon nome="estrela" tamanho={13} cheio /> {r.nota}</span>
              </div>
              <p>{r.texto}</p>
              <div className="acoes-linha">
                {r.status !== "aprovado" && <button className="link" onClick={() => { dispatch({ type: "review/status", id: r.id, status: "aprovado" }); toast("Avaliação publicada"); }}>Publicar</button>}
                {r.status !== "rejeitado" && <button className="link" onClick={() => { dispatch({ type: "review/status", id: r.id, status: "rejeitado" }); toast("Avaliação rejeitada"); }}>Rejeitar</button>}
                <button className="link perigo" onClick={() => { if (window.confirm("Excluir esta avaliação?")) { dispatch({ type: "review/delete", id: r.id }); toast("Avaliação excluída"); } }}>Excluir</button>
              </div>
            </div>
          );
        }) : <Vazio titulo="Nada por aqui" />}
      </div>
    </section>
  );
}

const VAZIO_DOC = { titulo: "", ano: new Date().getFullYear(), direcao: "", duracao: "", tema: TEMAS_DOC[0], sinopse: "", link: "", gratis: false, imagem: "", cor: "#1b5e20" };


function DocsAdmin() {
  const { state, dispatch, toast } = useApp();
  const [editando, setEditando] = useState(null);
  const [f, setF] = useState(VAZIO_DOC);
  const docs = state.docs || [];
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function abrir(doc) {
    setEditando(doc || "novo");
    setF(doc ? { ...doc } : VAZIO_DOC);
  }

  function salvar(e) {
    e.preventDefault();
    if (f.titulo.trim().length < 2) return toast("Informe o título");
    if (f.link && !/^https?:\/\//.test(f.link)) return toast("O link precisa começar com https://");
    if (f.imagem && !/^(https?:\/\/|\/|data:image\/)/.test(f.imagem)) return toast("A imagem precisa ser um link https://");
    dispatch({ type: "doc/save", doc: { ...f, titulo: f.titulo.trim(), ano: Number(f.ano) || "", id: editando === "novo" ? newId() : editando.id } });
    toast("Documentário salvo");
    setEditando(null);
  }

  if (editando) {
    return (
      <form className="painel-form form" onSubmit={salvar}>
        <div className="linha-topo">
          <h2>{editando === "novo" ? "Novo documentário" : "Editar documentário"}</h2>
          <button type="button" className="btn" onClick={() => setEditando(null)}>Cancelar</button>
        </div>
        <div className="grid-2">
          <Campo label="Título *"><input value={f.titulo} onChange={set("titulo")} /></Campo>
          <Campo label="Direção"><input value={f.direcao} onChange={set("direcao")} /></Campo>
        </div>
        <div className="grid-3">
          <Campo label="Ano"><input inputMode="numeric" value={f.ano} onChange={set("ano")} /></Campo>
          <Campo label="Duração"><input value={f.duracao} onChange={set("duracao")} placeholder="1h30" /></Campo>
          <Campo label="Tema">
            <select value={f.tema} onChange={set("tema")}>{TEMAS_DOC.map((t) => <option key={t}>{t}</option>)}</select>
          </Campo>
        </div>
        <Campo label="Sinopse"><textarea rows={4} value={f.sinopse} onChange={set("sinopse")} maxLength={400} /></Campo>
        <CampoImagem rotulo="Pôster" valor={f.imagem} cor={f.cor} onChange={(imagem) => setF((x) => ({ ...x, imagem }))} />
        <div className="grid-2">
          <Campo label="Link do filme completo" dica="Vazio: o botão leva a “Onde assistir” no Brasil (JustWatch).">
            <input value={f.link} onChange={set("link")} placeholder="https://" />
          </Campo>
          <Campo label="Cor do pôster"><input type="color" value={f.cor} onChange={set("cor")} /></Campo>
        </div>
        <label className="checagem">
          <input type="checkbox" checked={Boolean(f.gratis)} onChange={(e) => setF({ ...f, gratis: e.target.checked })} />
          <span>O link é uma versão completa, gratuita e oficial (mostra o selo “Grátis”)</span>
        </label>
        <button className="btn primario" type="submit">Salvar documentário</button>
      </form>
    );
  }

  return (
    <section>
      <div className="linha-topo">
        <h2>Documentários ({docs.length})</h2>
        <button className="btn primario" onClick={() => abrir(null)}><Icon nome="mais" tamanho={16} /> Novo documentário</button>
      </div>
      <div className="tabela">
        <div className="linha cab"><span>Título</span><span>Ano</span><span>Tema</span><span>Ações</span></div>
        {docs.map((d) => (
          <div key={d.id} className="linha">
            <span className="com-miniatura">
              {d.imagem ? <img src={d.imagem} alt="" /> : <i style={{ "--c": d.cor }} />}
              <span><strong>{d.titulo}</strong><small>{d.direcao}</small></span>
            </span>
            <span>{d.ano}</span>
            <span>{d.tema}</span>
            <span className="acoes-linha">
              <button className="link" onClick={() => abrir(d)}>Editar</button>
              <button className="link perigo" onClick={() => { if (window.confirm(`Excluir "${d.titulo}"?`)) { dispatch({ type: "doc/delete", id: d.id }); toast("Documentário excluído"); } }}>Excluir</button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

const VAZIO_POST = { titulo: "", resumo: "", corpo: "", cor: "#14b8a6", autor: "Equipe", imagem: "", status: "publicado" };

function BlogAdmin({ editarId }) {
  const { state, dispatch, toast } = useApp();
  const inicial = state.posts.find((p) => p.id === editarId) || null;
  const [editando, setEditando] = useState(inicial);
  const [f, setF] = useState(inicial ? { ...VAZIO_POST, ...inicial } : VAZIO_POST);
  const [busca, setBusca] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const posts = state.posts.filter((p) => (p.titulo + p.resumo).toLowerCase().includes(busca.toLowerCase()));

  function abrir(post) {
    setEditando(post || "novo");
    setF(post ? { ...VAZIO_POST, ...post } : VAZIO_POST);
  }

  function salvar(e) {
    e.preventDefault();
    if (f.titulo.trim().length < 5) return toast("Título muito curto");
    if (f.imagem && !/^(https?:\/\/|\/|data:image\/)/.test(f.imagem)) return toast("A imagem precisa ser um link https://");
    let slug = f.slug || f.titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const id = editando === "novo" ? newId() : editando.id;
    if (state.posts.some((p) => p.slug === slug && p.id !== id)) slug = `${slug}-${id.slice(-4)}`;
    dispatch({ type: "post/save", post: { ...f, titulo: f.titulo.trim(), id, slug, data: f.data || hoje() } });
    toast(f.status === "rascunho" ? "Rascunho salvo" : "Artigo publicado");
    setEditando(null);
  }

  if (editando) {
    return (
      <form className="painel-form form" onSubmit={salvar}>
        <div className="linha-topo">
          <h2>{editando === "novo" ? "Novo artigo" : "Editar artigo"}</h2>
          <div className="acoes-linha">
            {editando !== "novo" && <Link className="btn" to={`/blog/${editando.slug}`}>Ver no site</Link>}
            <button type="button" className="btn" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </div>
        <Campo label="Título *"><input value={f.titulo} onChange={set("titulo")} maxLength={120} /></Campo>
        <Campo label="Resumo" dica="Aparece na lista de artigos e no topo do texto."><input value={f.resumo} onChange={set("resumo")} maxLength={200} /></Campo>
        <Campo label="Conteúdo" dica="Deixe uma linha em branco entre os parágrafos.">
          <textarea rows={12} value={f.corpo} onChange={set("corpo")} />
        </Campo>
        <CampoImagem rotulo="Imagem de capa" valor={f.imagem} cor={f.cor} onChange={(imagem) => setF((x) => ({ ...x, imagem }))} formato="largo" />
        <div className="grid-3">
          <Campo label="Autor"><input value={f.autor} onChange={set("autor")} /></Campo>
          <Campo label="Data"><input type="date" value={f.data || hoje()} onChange={set("data")} /></Campo>
          <Campo label="Visibilidade">
            <select value={f.status} onChange={set("status")}>
              <option value="publicado">Publicado</option>
              <option value="rascunho">Rascunho (oculto)</option>
            </select>
          </Campo>
        </div>
        <Campo label="Cor da capa (usada quando não há imagem)"><input type="color" value={f.cor} onChange={set("cor")} /></Campo>
        <button className="btn primario" type="submit">{f.status === "rascunho" ? "Salvar rascunho" : "Publicar artigo"}</button>
      </form>
    );
  }

  return (
    <section>
      <div className="linha-topo">
        <div className="filtros-admin">
          <h2>Artigos ({state.posts.length})</h2>
          <input className="busca-admin" type="search" placeholder="Buscar artigo" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <button className="btn primario" onClick={() => abrir(null)}><Icon nome="mais" tamanho={16} /> Novo artigo</button>
      </div>
      <div className="tabela">
        <div className="linha cab"><span>Título</span><span>Data</span><span>Status</span><span>Ações</span></div>
        {posts.length ? posts.map((p) => (
          <div key={p.id} className="linha">
            <span className="com-miniatura">
              {p.imagem ? <img src={p.imagem} alt="" className="larga" /> : <i style={{ "--c": p.cor }} className="larga" />}
              <span><strong>{p.titulo}</strong><small>{state.comments.filter((c) => c.postId === p.id).length} comentários</small></span>
            </span>
            <span>{p.data?.split("-").reverse().join("/")}</span>
            <span><em className={`status ${p.status === "rascunho" ? "rascunho" : "aprovado"}`}>{p.status === "rascunho" ? "rascunho" : "publicado"}</em></span>
            <span className="acoes-linha">
              <Link className="link" to={`/blog/${p.slug}`}>Ver</Link>
              <button className="link" onClick={() => abrir(p)}>Editar</button>
              <button className="link perigo" onClick={() => { if (window.confirm("Excluir artigo e comentários?")) { dispatch({ type: "post/delete", id: p.id }); toast("Artigo excluído"); } }}>Excluir</button>
            </span>
          </div>
        )) : <Vazio titulo="Nenhum artigo encontrado" />}
      </div>
      {state.comments.length > 0 && (
        <>
          <h3 className="sub-titulo">Comentários recentes</h3>
          <div className="lista-reviews">
            {state.comments.slice(0, 15).map((c) => {
              const post = state.posts.find((p) => p.id === c.postId);
              return (
                <div key={c.id} className="review">
                  <div className="review-topo"><div><strong>{c.userName}</strong><small> em {post?.titulo || "artigo removido"} · {c.data}</small></div></div>
                  <p>{c.texto}</p>
                  <div className="acoes-linha">
                    <button className="link perigo" onClick={() => { dispatch({ type: "comment/delete", id: c.id }); toast("Comentário removido"); }}>Remover</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}


const VAZIO_CUPOM = { loja: "", descricao: "", codigo: "", desconto: "", link: "", validade: "", categoria: CATEGORIAS_CUPOM[0], cor: "#1f6b2c", imagem: "", status: "publicado" };

function CuponsAdmin() {
  const { state, dispatch, toast } = useApp();
  const [editando, setEditando] = useState(null);
  const [f, setF] = useState(VAZIO_CUPOM);
  const cupons = state.cupons || [];
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function abrir(c) {
    setEditando(c || "novo");
    setF(c ? { ...VAZIO_CUPOM, ...c } : VAZIO_CUPOM);
  }

  function salvar(e) {
    e.preventDefault();
    if (f.loja.trim().length < 2) return toast("Informe a loja");
    if (!f.codigo.trim()) return toast("Informe o código do cupom");
    if (f.link && !/^https?:\/\//.test(f.link)) return toast("O link precisa começar com https://");
    dispatch({ type: "cupom/save", cupom: { ...f, loja: f.loja.trim(), codigo: f.codigo.trim().toUpperCase(), id: editando === "novo" ? newId() : editando.id } });
    toast(f.status === "rascunho" ? "Cupom salvo como rascunho" : "Cupom publicado");
    setEditando(null);
  }

  if (editando) {
    return (
      <form className="painel-form form" onSubmit={salvar}>
        <div className="linha-topo">
          <h2>{editando === "novo" ? "Novo cupom" : `Editar: ${editando.loja}`}</h2>
          <button type="button" className="btn" onClick={() => setEditando(null)}>Cancelar</button>
        </div>
        <div className="grid-2">
          <Campo label="Loja ou marca *"><input value={f.loja} onChange={set("loja")} maxLength={60} /></Campo>
          <Campo label="Categoria">
            <select value={f.categoria} onChange={set("categoria")}>{CATEGORIAS_CUPOM.map((k) => <option key={k}>{k}</option>)}</select>
          </Campo>
        </div>
        <div className="grid-2">
          <Campo label="Código do cupom *"><input value={f.codigo} onChange={set("codigo")} maxLength={40} className="mono" placeholder="ROLE10" /></Campo>
          <Campo label="Destaque do desconto" dica="Texto curto que aparece em evidência, ex.: 10% OFF ou Frete grátis."><input value={f.desconto} onChange={set("desconto")} maxLength={20} /></Campo>
        </div>
        <Campo label="Descrição e condições"><textarea rows={3} value={f.descricao} onChange={set("descricao")} maxLength={240} placeholder="Ex.: 10% em todo o site para compras acima de R$ 80." /></Campo>
        <div className="grid-3">
          <Campo label="Link da loja"><input value={f.link} onChange={set("link")} placeholder="https://" /></Campo>
          <Campo label="Válido até" dica="Depois dessa data o cupom some do site."><input type="date" value={f.validade} onChange={set("validade")} /></Campo>
          <Campo label="Visibilidade">
            <select value={f.status} onChange={set("status")}>
              <option value="publicado">Publicado</option>
              <option value="rascunho">Rascunho (oculto)</option>
            </select>
          </Campo>
        </div>
        <CampoImagem rotulo="Logo da loja" valor={f.imagem} cor={f.cor} onChange={(imagem) => setF((x) => ({ ...x, imagem }))} formato="logo" />
        <Campo label="Cor do card"><input type="color" value={f.cor} onChange={set("cor")} /></Campo>
        <button className="btn primario" type="submit">{f.status === "rascunho" ? "Salvar rascunho" : "Publicar cupom"}</button>
      </form>
    );
  }

  return (
    <section>
      <div className="linha-topo">
        <h2>Cupons ({cupons.length})</h2>
        <div className="acoes-linha">
          <Link className="btn" to="/cupons">Ver página</Link>
          <button className="btn primario" onClick={() => abrir(null)}><Icon nome="mais" tamanho={16} /> Novo cupom</button>
        </div>
      </div>
      <div className="tabela">
        <div className="linha cab"><span>Loja</span><span>Código</span><span>Status</span><span>Ações</span></div>
        {cupons.length ? cupons.map((c) => {
          const vencido = cupomVencido(c);
          return (
            <div key={c.id} className="linha">
              <span className="com-miniatura">
                {c.imagem ? <img src={c.imagem} alt="" className="quadrada" /> : <i style={{ "--c": c.cor }} className="quadrada" />}
                <span><strong>{c.loja}</strong><small>{c.desconto || c.descricao}</small></span>
              </span>
              <span><code className="mono">{c.codigo}</code></span>
              <span>
                <em className={`status ${vencido ? "perigo" : c.status === "rascunho" ? "rascunho" : "aprovado"}`}>
                  {vencido ? "vencido" : c.status === "rascunho" ? "rascunho" : "publicado"}
                </em>
              </span>
              <span className="acoes-linha">
                <button className="link" onClick={() => abrir(c)}>Editar</button>
                <button className="link perigo" onClick={() => { if (window.confirm(`Excluir o cupom de ${c.loja}?`)) { dispatch({ type: "cupom/delete", id: c.id }); toast("Cupom excluído"); } }}>Excluir</button>
              </span>
            </div>
          );
        }) : <Vazio titulo="Nenhum cupom cadastrado" texto="Cadastre o primeiro cupom de um parceiro." />}
      </div>
    </section>
  );
}

const VAZIO_RECEITA = { titulo: "", categoria: CATEGORIAS_RECEITA[0], resumo: "", tempo: "", rendimento: "", ingredientes: [], preparo: [], dicas: [], imagem: "", fonte: "", status: "publicado" };
const linhas = (txt) => txt.split("\n").map((l) => l.trim()).filter(Boolean);

function ReceitasAdmin({ editarId }) {
  const { state, dispatch, toast } = useApp();
  const receitas = state.receitas || [];
  const inicial = receitas.find((r) => r.id === editarId) || null;
  const [editando, setEditando] = useState(inicial);
  const [f, setF] = useState(() => paraForm(inicial));
  const [busca, setBusca] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function paraForm(r) {
    const base = { ...VAZIO_RECEITA, ...(r || {}) };
    return { ...base, ingredientes: base.ingredientes.join("\n"), preparo: base.preparo.join("\n"), dicas: base.dicas.join("\n") };
  }

  function abrir(r) {
    setEditando(r || "novo");
    setF(paraForm(r));
  }

  function salvar(e) {
    e.preventDefault();
    if (f.titulo.trim().length < 3) return toast("Informe o título");
    if (f.imagem && !/^(https?:\/\/|\/|data:image\/)/.test(f.imagem)) return toast("A imagem precisa ser um link https://");
    const id = editando === "novo" ? newId() : editando.id;
    let slug = f.slug || f.titulo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (receitas.some((r) => r.slug === slug && r.id !== id)) slug = `${slug}-${id.slice(-4)}`;
    const receita = { ...f, id, slug, titulo: f.titulo.trim(), ingredientes: linhas(f.ingredientes), preparo: linhas(f.preparo), dicas: linhas(f.dicas), data: f.data || hoje() };
    if (receita.preparo.length && receita.obs?.startsWith("O post original não tem o modo de preparo")) receita.obs = "";
    dispatch({ type: "receita/save", receita });
    toast(f.status === "rascunho" ? "Receita salva como rascunho" : "Receita publicada");
    setEditando(null);
  }

  if (editando) {
    return (
      <form className="painel-form form" onSubmit={salvar}>
        <div className="linha-topo">
          <h2>{editando === "novo" ? "Nova receita" : `Editar: ${editando.titulo}`}</h2>
          <div className="acoes-linha">
            {editando !== "novo" && <Link className="btn" to={`/receitas/${editando.slug}`}>Ver no site</Link>}
            <button type="button" className="btn" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </div>
        {editando !== "novo" && editando.obs && <div className="nota-verificacao"><strong>Para conferir:</strong><p>{editando.obs}</p></div>}
        <div className="grid-2">
          <Campo label="Título *"><input value={f.titulo} onChange={set("titulo")} maxLength={90} /></Campo>
          <Campo label="Categoria">
            <select value={f.categoria} onChange={set("categoria")}>{CATEGORIAS_RECEITA.map((c) => <option key={c}>{c}</option>)}</select>
          </Campo>
        </div>
        <Campo label="Resumo" dica="Uma frase que aparece no card da receita."><input value={f.resumo} onChange={set("resumo")} maxLength={180} /></Campo>
        <div className="grid-2">
          <Campo label="Tempo de preparo"><input value={f.tempo} onChange={set("tempo")} placeholder="ex.: 40 minutos" /></Campo>
          <Campo label="Rendimento"><input value={f.rendimento} onChange={set("rendimento")} placeholder="ex.: 6 porções" /></Campo>
        </div>
        <Campo label="Ingredientes" dica="Um por linha. Comece a linha com ## para criar um subtítulo (ex.: ## Molho).">
          <textarea rows={8} value={f.ingredientes} onChange={set("ingredientes")} />
        </Campo>
        <Campo label="Modo de preparo" dica="Um passo por linha. A numeração é automática.">
          <textarea rows={8} value={f.preparo} onChange={set("preparo")} />
        </Campo>
        <Campo label="Dicas" dica="Uma por linha (opcional)."><textarea rows={3} value={f.dicas} onChange={set("dicas")} /></Campo>
        <CampoImagem rotulo="Foto da receita" valor={f.imagem} cor="#558b2f" onChange={(imagem) => setF((x) => ({ ...x, imagem }))} formato="largo" />
        <div className="grid-2">
          <Campo label="Link do post original (opcional)"><input value={f.fonte} onChange={set("fonte")} placeholder="https://" /></Campo>
          <Campo label="Visibilidade">
            <select value={f.status} onChange={set("status")}>
              <option value="publicado">Publicada</option>
              <option value="rascunho">Rascunho (oculta)</option>
            </select>
          </Campo>
        </div>
        <button className="btn primario" type="submit">{f.status === "rascunho" ? "Salvar rascunho" : "Publicar receita"}</button>
      </form>
    );
  }

  const lista = receitas.filter((r) => normalizar(r.titulo + r.categoria).includes(normalizar(busca)));
  return (
    <section>
      <div className="linha-topo">
        <div className="filtros-admin">
          <h2>Receitas ({receitas.length})</h2>
          <input className="busca-admin" type="search" placeholder="Buscar receita" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <button className="btn primario" onClick={() => abrir(null)}><Icon nome="mais" tamanho={16} /> Nova receita</button>
      </div>
      <div className="tabela">
        <div className="linha cab"><span>Receita</span><span>Categoria</span><span>Status</span><span>Ações</span></div>
        {lista.length ? lista.map((r) => (
          <div key={r.id} className="linha">
            <span className="com-miniatura">
              {r.imagem ? <img src={r.imagem} alt="" className="larga" /> : <i style={{ "--c": "#558b2f" }} className="larga" />}
              <span><strong>{r.titulo}</strong>{r.obs && <small className="obs">{r.obs}</small>}</span>
            </span>
            <span>{r.categoria}</span>
            <span><em className={`status ${r.status === "rascunho" ? "rascunho" : "aprovado"}`}>{r.status === "rascunho" ? "rascunho" : "publicada"}</em></span>
            <span className="acoes-linha">
              <Link className="link" to={`/receitas/${r.slug}`}>Ver</Link>
              <button className="link" onClick={() => abrir(r)}>Editar</button>
              <button className="link perigo" onClick={() => { if (window.confirm(`Excluir "${r.titulo}"?`)) { dispatch({ type: "receita/delete", id: r.id }); toast("Receita excluída"); } }}>Excluir</button>
            </span>
          </div>
        )) : <Vazio titulo="Nenhuma receita encontrada" />}
      </div>
    </section>
  );
}

function Configuracoes() {
  return (
    <div className="pilha-config">
      <div className="painel-form">
        <h2>Mapa</h2>
        <p className="muted">O site usa mapas gratuitos do OpenStreetMap, sem chave nem cobrança. As sugestões de cidade e endereço vêm do Photon e a cidade do visitante, do Nominatim, ambos baseados no OpenStreetMap.</p>
      </div>
      <Conta />
    </div>
  );
}

function Conta() {
  const { state, dispatch, usuario, toast, temBackend, servidor, enviarTudo } = useApp();
  const [email, setEmail] = useState(usuario.email);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef(null);

  async function salvarConta(e) {
    e.preventDefault();
    setErro("");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErro("E-mail inválido.");
    if (nova && nova.length < 8) return setErro("A nova senha precisa de pelo menos 8 caracteres.");
    if (temBackend) {
      try {
        const mudouEmail = await backend.trocarConta({ email: email.trim(), senhaAtual: atual, novaSenha: nova });
        setAtual(""); setNova("");
        toast(mudouEmail ? "Confirme o novo e-mail pelo link enviado pelo Supabase" : "Conta atualizada");
      } catch (err) {
        setErro(err.message);
      }
      return;
    }
    if ((await hashSenha(atual)) !== usuario.senhaHash) return setErro("Senha atual incorreta.");
    dispatch({ type: "user/update", user: { ...usuario, email: email.trim(), senhaHash: nova ? await hashSenha(nova) : usuario.senhaHash } });
    setAtual(""); setNova("");
    toast("Conta atualizada");
  }

  async function publicarInicial() {
    if (!window.confirm("Enviar todo o conteúdo atual (lugares, artigos, receitas, documentários, cupons, avaliações e comentários) para o servidor?")) return;
    setEnviando(true);
    try {
      await enviarTudo();
      toast("Conteúdo enviado: o site já mostra estes dados para todo mundo");
    } catch (err) {
      toast(`Não foi possível enviar: ${err.message}`);
    } finally {
      setEnviando(false);
    }
  }

  // Só no npm run dev: grava o estado atual direto em src/data/dados.json
  async function salvarNoProjeto() {
    if (!window.confirm("Gravar o conteúdo atual do site em src/data/dados.json? O arquivo anterior fica guardado em backups/.")) return;
    const versao = Date.now();
    const { session, favorites, ...dados } = state;
    try {
      const r = await fetch("/__salvar-dados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...dados, versao }) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.erro);
      dispatch({ type: "versao/set", versao });
      // A página recarrega sozinha ao mudar o arquivo; o aviso aparece depois
      try { sessionStorage.setItem("rv-aviso", "Dados salvos em src/data/dados.json"); } catch (e) { /* ok */ }
      toast("Dados salvos no projeto");
    } catch (e) {
      toast(`Não foi possível salvar: ${e.message}`);
    }
  }

  function exportar() {
    // Nova versão: ao publicar este arquivo, os visitantes recebem o conteúdo atualizado
    const versao = Date.now();
    const { session, favorites, ...dados } = state;
    dispatch({ type: "versao/set", versao });
    const blob = new Blob([JSON.stringify({ ...dados, versao }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dados.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const dados = JSON.parse(leitor.result);
        if (!Array.isArray(dados.places)) throw new Error();
        if (!temBackend && !(dados.users || []).some((u) => u.role === "admin" && u.senhaHash)) throw new Error();
        if (!window.confirm("Substituir todos os dados atuais por este arquivo?")) return;
        dispatch({ type: "data/replace", data: dados });
        toast("Dados importados");
      } catch (err) {
        toast("Arquivo inválido");
      }
    };
    leitor.readAsText(file);
    e.target.value = "";
  }

  function restaurar() {
    if (!window.confirm("Voltar aos dados de exemplo? Tudo o que foi cadastrado neste navegador será apagado e a senha volta a ser a inicial.")) return;
    dispatch({ type: "data/replace", data: structuredClone(SEED) });
    dispatch({ type: "session/set", userId: null });
    toast("Dados de exemplo restaurados");
  }

  return (
    <div className="grid-2 conta">
      <form className="painel-form form" onSubmit={salvarConta}>
        <h2>Minha conta</h2>
        <Campo label="E-mail de acesso"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
        <Campo label="Nova senha" dica="Deixe vazio para manter a atual."><input type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} /></Campo>
        <Campo label="Senha atual *"><input type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} /></Campo>
        {erro && <small className="erro" role="alert">{erro}</small>}
        <button className="btn primario" type="submit">Salvar</button>
      </form>

      <div className="painel-form">
        <h2>Dados do site</h2>
        {temBackend ? (
          <>
            <p className="muted">
              {servidor === "vazio"
                ? "O servidor ainda está vazio. Envie o conteúdo atual uma vez; depois disso, cada edição é salva sozinha para todo mundo."
                : servidor === "erro"
                  ? "Não foi possível falar com o servidor. Confira as chaves do Supabase e se o schema.sql foi executado."
                  : "Conectado ao servidor: cada edição é salva sozinha e aparece na hora para todo mundo."}
            </p>
            <div className="pilha">
              {(servidor === "vazio" || import.meta.env.DEV) && (
                <button className="btn primario" onClick={publicarInicial} disabled={enviando}>
                  <Icon nome="check" tamanho={16} /> {enviando ? "Enviando…" : servidor === "vazio" ? "Enviar conteúdo atual para o servidor" : "Reenviar tudo para o servidor"}
                </button>
              )}
              <button className="btn" onClick={exportar}><Icon nome="seta" tamanho={16} /> Baixar cópia de segurança (JSON)</button>
              <button className="btn" onClick={() => arquivo.current?.click()}>Importar arquivo</button>
              <input ref={arquivo} type="file" accept="application/json" hidden onChange={importar} />
            </div>
          </>
        ) : (
          <>
            <p className="muted">Sem servidor, o que você cadastra fica salvo só neste navegador. Para publicar para todo mundo, exporte o arquivo e envie junto com o site (veja o README).</p>
            <div className="pilha">
              {import.meta.env.DEV && (
                <button className="btn primario" onClick={salvarNoProjeto}><Icon nome="check" tamanho={16} /> Salvar no projeto (dados.json)</button>
              )}
              <button className="btn" onClick={exportar}><Icon nome="seta" tamanho={16} /> Exportar dados (JSON)</button>
              <button className="btn" onClick={() => arquivo.current?.click()}>Importar arquivo</button>
              <input ref={arquivo} type="file" accept="application/json" hidden onChange={importar} />
              <button className="btn perigo" onClick={restaurar}><Icon nome="lixo" tamanho={16} /> Restaurar dados de exemplo</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
