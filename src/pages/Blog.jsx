import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApp, newId, hoje } from "../store/AppContext";
import { Vazio, Reveal } from "../components/ui";
import Icon from "../components/Icon";

export function BlogList() {
  const { state, usuario } = useApp();
  const [busca, setBusca] = useState("");
  const admin = usuario?.role === "admin";
  const posts = state.posts.filter((p) => (admin || p.status !== "rascunho") && (p.titulo + p.resumo).toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="container">
      <Reveal>
        <div className="cabeca">
          <span className="kicker">Blog & bate-papo</span>
          <h1>Artigos e <em>conversas</em></h1>
          <p className="muted">Guias práticos, dúvidas da comunidade e informações do movimento.</p>
        </div>
        <div className="auto busca-blog">
          <Icon nome="busca" className="auto-icone" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar artigos" aria-label="Buscar artigos" />
        </div>
      </Reveal>

      <div className="grid-posts">
        {posts.length ? posts.map((p, i) => (
          <Reveal key={p.id} delay={i * 0.08}>
            <Link to={`/blog/${p.slug}`} className="post">
              <Capa post={p} />
              <div className="corpo">
                {p.status === "rascunho" && <em className="status rascunho">rascunho</em>}
                <h2>{p.titulo}</h2>
                <p>{p.resumo}</p>
                <div className="meta">{p.data?.split("-").reverse().join("/")} · {p.autor} · {state.comments.filter((c) => c.postId === p.id).length} comentários</div>
              </div>
            </Link>
          </Reveal>
        )) : <Vazio titulo="Nenhum artigo encontrado" />}
      </div>
    </div>
  );
}

export function PostPage() {
  const { slug } = useParams();
  const { state, dispatch, usuario, toast } = useApp();
  const admin = usuario?.role === "admin";
  const post = state.posts.find((p) => p.slug === slug && (admin || p.status !== "rascunho"));
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");

  if (!post) {
    return (
      <div className="container pagina-vazia">
        <Vazio titulo="Artigo não encontrado"><Link className="btn primario" to="/blog">Ver todos os artigos</Link></Vazio>
      </div>
    );
  }

  const comentarios = state.comments.filter((c) => c.postId === post.id);
  const relacionados = state.posts.filter((p) => p.id !== post.id && p.status !== "rascunho").slice(0, 2);

  function comentar(e) {
    e.preventDefault();
    if (texto.trim().length < 3) return toast("Escreva um comentário um pouco maior.");
    dispatch({
      type: "comment/add",
      comment: {
        id: newId(),
        postId: post.id,
        userName: usuario?.nome || nome.trim() || "Visitante",
        texto: texto.trim(),
        data: hoje(),
      },
    });
    setTexto(""); setNome("");
    toast("Comentário publicado");
  }

  return (
    <article className="container leitura">
      <Link to="/blog" className="voltar"><Icon nome="voltar" tamanho={16} /> Todos os artigos</Link>
      <Reveal>
        {post.imagem ? <img className="capa-grande" src={post.imagem} alt="" /> : <div className="capa-grande" style={{ "--c": post.cor }} />}
        <h1>{post.titulo}</h1>
        <div className="meta">{post.data?.split("-").reverse().join("/")} · {post.autor}</div>
        {admin && (
          <div className="acoes-detalhe">
            {post.status === "rascunho" && <em className="status rascunho">Rascunho: só você vê</em>}
            <Link className="btn escuro" to={`/admin?aba=blog&editar=${post.id}`}><Icon nome="editar" tamanho={16} /> Editar artigo</Link>
          </div>
        )}
        <p className="lead">{post.resumo}</p>
        <div className="corpo-texto"><Texto corpo={post.corpo} /></div>
      </Reveal>

      <section className="bloco-info">
        <h2>Bate-papo ({comentarios.length})</h2>
        <form className="form-review" onSubmit={comentar}>
          {!usuario && <input placeholder="Seu nome (opcional)" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} />}
          <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua mensagem..." maxLength={500} />
          <button className="btn primario" type="submit">Comentar</button>
        </form>
        <div className="lista-reviews">
          {comentarios.length ? comentarios.map((c) => (
            <div key={c.id} className="review">
              <div className="review-topo">
                <span className="avatar-pequeno">{c.userName.charAt(0)}</span>
                <div><strong>{c.userName}</strong><small>{c.data}</small></div>
              </div>
              <p>{c.texto}</p>
            </div>
          )) : <Vazio titulo="Ainda sem comentários" texto="Comece a conversa." />}
        </div>
      </section>

      {relacionados.length > 0 && (
        <section className="relacionados">
          <h2>Leia também</h2>
          <div className="grid-posts">
            {relacionados.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug}`} className="post">
                <Capa post={p} />
                <div className="corpo"><h3>{p.titulo}</h3></div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Capa({ post }) {
  return (
    <div className={`capa ${post.imagem ? "com-imagem" : ""}`} style={{ "--c": post.cor }} data-letra={post.imagem ? "" : post.titulo.charAt(0)}>
      {post.imagem && <img src={post.imagem} alt="" loading="lazy" />}
    </div>
  );
}

// Formatação simples do artigo: "## " = subtítulo, "- " = lista, **texto** = negrito,
// linha em branco separa parágrafos. Textos antigos (uma linha por parágrafo) continuam funcionando.
function negrito(txt) {
  return txt.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p));
}

function Texto({ corpo = "" }) {
  const blocos = [];
  let lista = null;
  corpo.split("\n").forEach((bruta) => {
    const linha = bruta.trim();
    if (linha.startsWith("- ")) {
      if (!lista) blocos.push((lista = { tipo: "lista", itens: [] }));
      lista.itens.push(linha.slice(2));
      return;
    }
    lista = null;
    if (!linha) return;
    if (linha.startsWith("## ")) blocos.push({ tipo: "titulo", texto: linha.slice(3) });
    else blocos.push({ tipo: "p", texto: linha });
  });
  return blocos.map((b, i) =>
    b.tipo === "titulo" ? <h2 key={i}>{b.texto}</h2>
    : b.tipo === "lista" ? <ul key={i}>{b.itens.map((t, j) => <li key={j}>{negrito(t)}</li>)}</ul>
    : <p key={i}>{negrito(b.texto)}</p>
  );
}
